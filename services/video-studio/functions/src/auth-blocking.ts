/**
 * Auth blocking functions — keep non-admin accounts from existing at all.
 *
 * requireAdmin() in fire.ts is the gate that protects the money. These two are
 * the layer in front of it: a stranger who finds the studio URL cannot even
 * create an account on the project, so the user list stays exactly as long as
 * the allowlist.
 *
 * ⚠ Blocking functions require **Firebase Authentication with Identity
 * Platform** (the free upgrade in Console → Authentication → Settings →
 * "Blocking functions"). Without it these deploy but never fire — which is why
 * they are a second layer and not the primary one.
 */
import {
  beforeUserCreated,
  beforeUserSignedIn,
  HttpsError,
} from 'firebase-functions/v2/identity';
import * as logger from 'firebase-functions/logger';
import { REGION, adminEmails } from './config';

function assertAllowed(email: string | undefined, verified: boolean | undefined, stage: string): void {
  const addr = (email ?? '').trim().toLowerCase();
  const allow = adminEmails();

  // Fails closed: an unset ADMIN_EMAILS denies everyone rather than everyone.
  if (!addr || allow.length === 0 || !allow.includes(addr)) {
    logger.warn(`Blocked ${stage} for non-admin`, { email: addr, allowlistSize: allow.length });
    throw new HttpsError('permission-denied', 'This studio is invite-only.');
  }

  // Google sign-in always returns a verified address. Anything claiming
  // otherwise is not a provider we want minting admin sessions.
  if (verified !== true) {
    logger.warn(`Blocked ${stage} for unverified email`, { email: addr });
    throw new HttpsError('permission-denied', 'A verified email is required.');
  }
}

/** Reject sign-ups from anyone not on ADMIN_EMAILS. */
export const gateSignUp = beforeUserCreated({ region: REGION }, (event) => {
  assertAllowed(event.data?.email, event.data?.emailVerified, 'sign-up');
  return;
});

/**
 * Reject sign-ins too, so removing someone from ADMIN_EMAILS locks out an
 * account that already exists — not just new ones.
 */
export const gateSignIn = beforeUserSignedIn({ region: REGION }, (event) => {
  assertAllowed(event.data?.email, event.data?.emailVerified, 'sign-in');
  return;
});
