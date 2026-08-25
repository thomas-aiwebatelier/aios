#!/usr/bin/env node
/**
 * reparent-uid — move a studio's data from one Firebase uid to another.
 *
 * WHY THIS EXISTS
 * Every document and object in this app is keyed by uid:
 *   Firestore  users/{uid}/projects/{projectId}/{subjects,scenes,environments}/…
 *   Storage    users/{uid}/…
 * The studio used to sign people in ANONYMOUSLY, so all existing work sits
 * under a throwaway anonymous uid. Switching to Google sign-in mints a
 * different uid, and every project silently disappears from the dashboard.
 * Nothing is lost — it is orphaned. This script re-parents it.
 *
 * SAFETY
 *  · Dry run by default. Nothing is written without --apply.
 *  · COPY, never move. The source tree is left completely untouched, so a bad
 *    run costs storage and nothing else. Deleting the old tree is a separate,
 *    deliberate, human decision.
 *  · Refuses to overwrite: if the destination already holds documents, it stops
 *    unless you pass --merge.
 *  · Verifies by re-counting both trees afterwards and comparing.
 *
 * USAGE
 *   # from services/video-studio/functions
 *   gcloud auth application-default login
 *   node scripts/reparent-uid.mjs --from <anonUid> --to <googleUid>          # dry run
 *   node scripts/reparent-uid.mjs --from <anonUid> --to <googleUid> --apply
 *
 * FINDING THE UIDS
 *   Anonymous uid: Firebase Console → Authentication → Users (grab it BEFORE
 *   disabling the anonymous provider — disabling hides those rows), or read the
 *   document ids under the Firestore `users/` collection.
 *   Google uid: sign in to the studio once, then the same Users list.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// ── args ────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = { apply: false, merge: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--apply') out.apply = true;
    else if (a === '--merge') out.merge = true;
    else if (a === '--from') out.from = argv[++i];
    else if (a === '--to') out.to = argv[++i];
    else if (a === '--project') out.project = argv[++i];
    else if (a === '--bucket') out.bucket = argv[++i];
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

if (args.help || !args.from || !args.to) {
  console.log(`
reparent-uid — copy users/{from}/** to users/{to}/** in Firestore and Storage.

  --from <uid>      source uid (required)
  --to <uid>        destination uid (required)
  --apply           actually write; without it this is a dry run
  --merge           allow writing into a destination that already has data
  --project <id>    GCP project (default: GOOGLE_CLOUD_PROJECT / GCLOUD_PROJECT)
  --bucket <name>   storage bucket (default: <project>.firebasestorage.app)
`);
  process.exit(args.help ? 0 : 1);
}

if (args.from === args.to) {
  console.error('--from and --to are the same uid. Nothing to do.');
  process.exit(1);
}

const projectId = args.project
  || process.env.GOOGLE_CLOUD_PROJECT
  || process.env.GCLOUD_PROJECT;

if (!projectId) {
  console.error('No project id. Pass --project or set GOOGLE_CLOUD_PROJECT.');
  process.exit(1);
}

const bucketName = args.bucket || `${projectId}.firebasestorage.app`;

initializeApp({
  credential: applicationDefault(),
  projectId,
  storageBucket: bucketName,
});

const db = getFirestore();
const bucket = getStorage().bucket();

const SRC_PREFIX = `users/${args.from}/`;
const DST_PREFIX = `users/${args.to}/`;

// ── firestore ───────────────────────────────────────────────────────────────

/**
 * Rewrite any string that points into the old uid's tree. Documents carry
 * `storagePath`-style fields, and they must follow the objects to the new
 * prefix or the UI renders broken media.
 *
 * Note: cached download URLs (the token-bearing `…/o/users%2F{uid}%2F…?alt=media&token=…`
 * form) are NOT repaired — a copied object gets a fresh token, so the old URL
 * is dead either way. The app regenerates those on demand via publicUrl().
 */
function rewrite(value) {
  if (typeof value === 'string') {
    return value.split(SRC_PREFIX).join(DST_PREFIX);
  }
  if (Array.isArray(value)) return value.map(rewrite);
  if (value && typeof value === 'object') {
    // Leave Firestore sentinels (Timestamp, GeoPoint, DocumentReference,
    // Buffer) structurally intact — only plain objects get walked.
    if (value.constructor && value.constructor !== Object) return value;
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = rewrite(v);
    return out;
  }
  return value;
}

/** Depth-first walk of a document and everything beneath it. */
async function walk(srcRef, dstRef, onDoc) {
  const snap = await srcRef.get();
  if (snap.exists) await onDoc(dstRef, snap.data());

  const cols = await srcRef.listCollections();
  for (const col of cols) {
    const docs = await col.listDocuments();
    for (const d of docs) {
      // Preserve document ids: projectId / sceneId / subjectId are referenced
      // by other documents and by storage paths. Renaming them breaks the app.
      await walk(d, dstRef.collection(col.id).doc(d.id), onDoc);
    }
  }
}

async function countDocs(rootRef) {
  let n = 0;
  await walk(rootRef, rootRef, async () => { n += 1; });
  return n;
}

async function copyFirestore() {
  const srcRoot = db.collection('users').doc(args.from);
  const dstRoot = db.collection('users').doc(args.to);

  const existing = await countDocs(dstRoot);
  if (existing > 0 && !args.merge) {
    throw new Error(
      `Destination users/${args.to} already holds ${existing} document(s). `
      + 'Re-run with --merge if overwriting them is what you want.',
    );
  }

  let planned = 0;
  const writer = args.apply ? db.bulkWriter() : null;

  await walk(srcRoot, dstRoot, async (dstRef, data) => {
    planned += 1;
    if (writer) writer.set(dstRef, rewrite(data));
  });

  if (writer) await writer.close();
  return { planned, existing };
}

// ── storage ─────────────────────────────────────────────────────────────────

async function copyStorage() {
  const [files] = await bucket.getFiles({ prefix: SRC_PREFIX });
  let copied = 0;

  for (const file of files) {
    const dest = DST_PREFIX + file.name.slice(SRC_PREFIX.length);
    if (args.apply) await file.copy(bucket.file(dest));
    copied += 1;
  }

  return { planned: copied };
}

// ── verification ────────────────────────────────────────────────────────────

async function verify() {
  const srcDocs = await countDocs(db.collection('users').doc(args.from));
  const dstDocs = await countDocs(db.collection('users').doc(args.to));
  const [srcFiles] = await bucket.getFiles({ prefix: SRC_PREFIX });
  const [dstFiles] = await bucket.getFiles({ prefix: DST_PREFIX });
  return {
    srcDocs, dstDocs, srcFiles: srcFiles.length, dstFiles: dstFiles.length,
  };
}

// ── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`project : ${projectId}`);
  console.log(`bucket  : ${bucketName}`);
  console.log(`from    : ${args.from}`);
  console.log(`to      : ${args.to}`);
  console.log(`mode    : ${args.apply ? 'APPLY (writes)' : 'dry run (no writes)'}\n`);

  const fs = await copyFirestore();
  console.log(`Firestore : ${fs.planned} document(s) ${args.apply ? 'copied' : 'would be copied'}`);

  const st = await copyStorage();
  console.log(`Storage   : ${st.planned} object(s) ${args.apply ? 'copied' : 'would be copied'}`);

  if (!args.apply) {
    console.log('\nDry run only. Re-run with --apply to perform the copy.');
    return;
  }

  const v = await verify();
  console.log('\nVerification');
  console.log(`  documents : source ${v.srcDocs} → destination ${v.dstDocs}`);
  console.log(`  objects   : source ${v.srcFiles} → destination ${v.dstFiles}`);

  const ok = v.dstDocs >= v.srcDocs && v.dstFiles >= v.srcFiles;
  if (!ok) {
    console.error('\n✗ Destination is smaller than the source. Investigate before deleting anything.');
    process.exitCode = 1;
    return;
  }

  console.log(`\n✓ Done. users/${args.from} is untouched — delete it only after you have`);
  console.log('  signed in and confirmed every project is present and playable.');
}

main().catch((e) => {
  console.error(`\n✗ ${e?.message ?? e}`);
  process.exit(1);
});
