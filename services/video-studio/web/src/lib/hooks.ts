import { useEffect, useMemo, useRef, useState } from 'react';
import {
  collection, doc, onSnapshot, query, orderBy,
} from 'firebase/firestore';
import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import { db, storage, watchAuth, signInWithGoogle, signOutStudio } from './firebase';
import type { ProjectDoc, SubjectDoc, SceneDoc, EnvironmentDoc } from '@shared/types';
import { collections } from '@shared/types';

export type AuthState = {
  uid: string | null;
  email: string | null;
  /** 'loading' until Firebase has resolved persisted state — do not render on it. */
  status: 'loading' | 'signedOut' | 'signedIn';
  error: string | null;
  signIn: () => void;
  signOut: () => void;
};

export function useUser(): AuthState {
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => watchAuth((user) => {
    setUid(user?.uid ?? null);
    setEmail(user?.email ?? null);
    setStatus(user ? 'signedIn' : 'signedOut');
  }), []);

  const signIn = () => {
    setError(null);
    signInWithGoogle().catch((e: unknown) => {
      const code = (e as { code?: string })?.code ?? '';
      // Closing the popup is a decision, not a failure — do not shout about it.
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      setError(
        code === 'auth/popup-blocked'
          ? 'Your browser blocked the sign-in popup. Allow popups for this site and try again.'
          : String((e as Error)?.message ?? e),
      );
    });
  };

  const signOut = () => { signOutStudio().catch(() => undefined); };

  return { uid, email, status, error, signIn, signOut };
}

function useCollection<T>(path: string | null, orderField: string): T[] | null {
  const [data, setData] = useState<T[] | null>(null);
  useEffect(() => {
    if (!path) return;
    const q = query(collection(db, path), orderBy(orderField));
    return onSnapshot(q, (snap) => {
      setData(snap.docs.map((d) => ({ ...(d.data() as T), id: d.id })));
    }, (err) => console.error('snapshot error', path, err));
  }, [path, orderField]);
  return data;
}

function useDocument<T>(path: string | null): T | null {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    if (!path) return;
    return onSnapshot(doc(db, path), (snap) => {
      setData(snap.exists() ? ({ ...(snap.data() as T), id: snap.id } as T) : null);
    }, (err) => console.error('snapshot error', path, err));
  }, [path]);
  return data;
}

export function useProjects(uid: string | null): ProjectDoc[] | null {
  return useCollection<ProjectDoc>(uid ? collections.projects(uid) : null, 'createdAt');
}

export function useProject(uid: string | null, projectId: string | null): ProjectDoc | null {
  return useDocument<ProjectDoc>(uid && projectId ? collections.project(uid, projectId) : null);
}

export function useSubjects(uid: string | null, projectId: string | null): SubjectDoc[] | null {
  return useCollection<SubjectDoc>(uid && projectId ? collections.subjects(uid, projectId) : null, 'createdAt');
}

export function useScenes(uid: string | null, projectId: string | null): SceneDoc[] | null {
  return useCollection<SceneDoc>(uid && projectId ? collections.scenes(uid, projectId) : null, 'index');
}

export function useEnvironments(uid: string | null, projectId: string | null): EnvironmentDoc[] | null {
  return useCollection<EnvironmentDoc>(uid && projectId ? collections.environments(uid, projectId) : null, 'createdAt');
}

// ---------------------------------------------------------------------------
// Storage URL resolution with a small in-memory cache
// ---------------------------------------------------------------------------

const urlCache = new Map<string, string>();

export function useStorageUrl(path: string | undefined | null): string | null {
  const [url, setUrl] = useState<string | null>(path ? urlCache.get(path) ?? null : null);
  useEffect(() => {
    if (!path) { setUrl(null); return; }
    const cached = urlCache.get(path);
    if (cached) { setUrl(cached); return; }
    let alive = true;
    getDownloadURL(storageRef(storage, path))
      .then((u) => { urlCache.set(path, u); if (alive) setUrl(u); })
      .catch(() => { if (alive) setUrl(null); });
    return () => { alive = false; };
  }, [path]);
  return url;
}

/** Debounced field editor helper: local state + delayed Firestore save. */
export function useDebouncedSave(save: (value: string) => Promise<void>, delay = 800) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useMemo(() => (value: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void save(value); }, delay);
  }, [save, delay]);
}
