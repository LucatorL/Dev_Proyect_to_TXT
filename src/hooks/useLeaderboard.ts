"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

export type LeaderboardEntry = {
  id: string;
  name: string;
  totalFiles: number;
  unifications: number;
  updatedAt: number;
};

export type LeaderboardProfile = {
  id: string;
  name: string;
  totalFiles: number;
  unifications: number;
  customName: boolean;
};

type PendingEvent = { id: string; fileCount: number; suggestedName?: string };
const tokenKey = 'dev-project-unifier-profile-token';
const pendingKey = 'dev-project-unifier-pending-events';
const migratedKey = 'dev-project-unifier-board-migrated';
const oldBoardKey = 'dev-project-unifier-unifications';
const resetKey = 'dev-project-unifier-board-epoch';
const validId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getToken() {
  try {
    const stored = localStorage.getItem(tokenKey);
    if (stored && /^[A-Za-z0-9_-]{43}$/.test(stored)) return stored;
  } catch { /* Private browsing can refuse local storage. */ }
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  try { localStorage.setItem(tokenKey, token); } catch { /* This session still works. */ }
  return token;
}

async function post<T>(path: string, body: object): Promise<T> {
  const response = await fetch(path, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Leaderboard request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [totalFiles, setTotalFiles] = useState(0);
  const [participantCount, setParticipantCount] = useState(0);
  const [profile, setProfile] = useState<LeaderboardProfile | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const token = useRef('');
  const pending = useRef<PendingEvent[]>([]);
  const flushing = useRef(false);

  const refresh = useCallback(async (page = 0) => {
    try {
      const response = await fetch(`/api/leaderboard?page=${page}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Leaderboard request failed: ${response.status}`);
      const data = await response.json() as { entries: LeaderboardEntry[]; totalFiles: number; count: number };
      setEntries(data.entries);
      setTotalFiles(data.totalFiles);
      setParticipantCount(data.count);
      setError(false);
      return data.entries;
    } catch {
      setError(true);
      return [];
    } finally { setLoading(false); }
  }, []);

  const flush = useCallback(async () => {
    if (flushing.current || !token.current || pending.current.length === 0) return;
    flushing.current = true;
    let changed = false;
    try {
      while (pending.current.length) {
        const next = pending.current[0];
        const updated = await post<LeaderboardProfile>('/api/unification', { token: token.current, epoch: 2, ...next });
        setProfile(updated);
        pending.current.shift();
        try { localStorage.setItem(pendingKey, JSON.stringify(pending.current)); } catch { /* Retry while this tab remains open. */ }
        setPendingCount(pending.current.length);
        changed = true;
      }
      setError(false);
    } catch {
      setError(true);
    } finally {
      flushing.current = false;
      if (changed) void refresh();
    }
  }, [refresh]);

  useEffect(() => {
    // This release resets the shared board. Old local events must not restore erased scores.
    try {
      if (localStorage.getItem(resetKey) !== '2') {
        localStorage.removeItem(tokenKey);
        localStorage.removeItem(pendingKey);
        localStorage.removeItem(oldBoardKey);
        localStorage.setItem(migratedKey, '1');
        localStorage.setItem(resetKey, '2');
      }
    } catch { /* The server rejects pre-reset events even if storage is unavailable. */ }
    token.current = getToken();
    try {
      const saved = JSON.parse(localStorage.getItem(pendingKey) || '[]');
      if (Array.isArray(saved)) pending.current = saved.filter((item): item is PendingEvent =>
        typeof item?.id === 'string' && validId.test(item.id) && Number.isSafeInteger(item.fileCount) && item.fileCount > 0);

      if (localStorage.getItem(migratedKey) !== '1') {
        const old = JSON.parse(localStorage.getItem(oldBoardKey) || '[]');
        if (Array.isArray(old)) {
          const existingIds = new Set(pending.current.map(event => event.id));
          for (const item of old) {
            if (typeof item?.id === 'string' && validId.test(item.id) &&
                Number.isSafeInteger(item.fileCount) && item.fileCount > 0 && !existingIds.has(item.id)) {
              pending.current.push({ id: item.id, fileCount: item.fileCount });
              existingIds.add(item.id);
            }
          }
        }
        localStorage.setItem(pendingKey, JSON.stringify(pending.current));
        localStorage.setItem(migratedKey, '1');
      }
    } catch { /* A malformed previous board must not prevent the new board from loading. */ }
    setPendingCount(pending.current.length);
    void refresh();
    // An alias is created only when the board opens or an event is recorded.
    // Merely visiting the homepage must not refill the freshly cleared table.
    void flush();
    const timer = window.setInterval(() => { void refresh(); void flush(); }, 30_000);
    return () => window.clearInterval(timer);
  }, [flush, refresh]);

  const record = useCallback((id: string, fileCount: number, suggestedName?: string) => {
    if (!validId.test(id) || fileCount < 1 || pending.current.some(event => event.id === id)) return;
    pending.current.push({ id, fileCount, suggestedName });
    try { localStorage.setItem(pendingKey, JSON.stringify(pending.current)); } catch { /* Keep this event in memory. */ }
    setPendingCount(pending.current.length);
    void flush();
  }, [flush]);

  const rename = useCallback(async (name: string) => {
    if (!token.current) return;
    try {
      const updated = await post<LeaderboardProfile>('/api/profile', { token: token.current, name });
      setProfile(updated);
      await refresh();
    } catch {
      setError(true);
      throw new Error('Could not update leaderboard name');
    }
  }, [refresh]);

  const retry = useCallback(async () => {
    if (!token.current) return;
    try { setProfile(await post<LeaderboardProfile>('/api/profile', { token: token.current })); }
    catch { setError(true); }
    await flush();
    await refresh();
  }, [flush, refresh]);

  return { entries, totalFiles, participantCount, profile, pendingCount, error, loading, refresh, retry, record, rename };
}
