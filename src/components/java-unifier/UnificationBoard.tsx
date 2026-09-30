"use client";

import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { t, type Language } from '@/lib/translations';
import type { LeaderboardEntry, LeaderboardProfile } from '@/hooks/useLeaderboard';

export function UnificationBoard({ entries, totalFiles, participantCount, profile, pendingCount, error, loading,
  language, onRename, onRefresh }: {
  entries: LeaderboardEntry[];
  totalFiles: number;
  participantCount: number;
  profile: LeaderboardProfile | null;
  pendingCount: number;
  error: boolean;
  loading: boolean;
  language: Language;
  onRename: (name: string) => Promise<void>;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (profile) setName(profile.name); }, [profile?.name]);

  const saveName = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || !profile) return;
    setSaving(true);
    try { await onRename(name); } finally { setSaving(false); }
  };

  return <Dialog open={open} onOpenChange={value => { setOpen(value); if (value) onRefresh(); }}>
    <DialogTrigger asChild>
      <Button variant="outline" size="sm" className="gap-2 whitespace-nowrap">
        <Trophy className="h-4 w-4" aria-hidden="true" />
        {t('unifiedFilesBoard', language)}
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs tabular-nums" aria-label={t('boardFileCount', language)}>
          {totalFiles.toLocaleString(language)}
        </span>
      </Button>
    </DialogTrigger>
    <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl">
      <DialogHeader>
        <DialogTitle>{t('unifiedFilesBoard', language)}</DialogTitle>
        <DialogDescription>{t('boardDescription', language)}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-wrap gap-4 rounded-md bg-secondary/50 p-3 text-sm">
        <span><strong>{totalFiles.toLocaleString(language)}</strong> {t('boardFiles', language).toLowerCase()}</span>
        <span><strong>{participantCount.toLocaleString(language)}</strong> {t(participantCount === 1 ? 'boardParticipant' : 'boardParticipants', language)}</span>
        {profile && <span>{t('boardYours', language)}: <strong>{profile.totalFiles.toLocaleString(language)}</strong></span>}
      </div>
      <form className="flex flex-wrap items-end gap-2" onSubmit={event => { void saveName(event).catch(() => {}); }}>
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm font-medium">
          {t('boardYourName', language)}
          <Input value={name} onChange={event => setName(event.target.value)} maxLength={48}
            disabled={!profile || saving} placeholder={t('boardDefaultName', language)} />
        </label>
        <Button type="submit" variant="secondary" disabled={!profile || saving || name.trim() === profile.name}>
          {t('boardSaveName', language)}
        </Button>
      </form>
      <p className="text-xs text-amber-700 dark:text-amber-300" role="note">{t('boardNameWarning', language)}</p>
      {name.trim() && name.trim() !== profile?.name && entries.some(entry => entry.name === name.trim()) &&
        <p className="text-xs text-amber-700 dark:text-amber-300" role="status">{t('boardExistingNameWarning', language)}</p>}
      {pendingCount > 0 && <p className="text-sm text-amber-600 dark:text-amber-400" role="status">
        {t('boardPending', language, { count: pendingCount })}
      </p>}
      {error && <p className="text-sm text-destructive" role="alert">
        {t('boardUnavailable', language)} <Button variant="link" size="sm" onClick={onRefresh}>{t('boardRetry', language)}</Button>
      </p>}
      {loading ? <p className="text-sm text-muted-foreground">{t('boardLoading', language)}</p> :
        entries.length ? <ScrollArea className="max-h-[53vh] border rounded-md" style={{ height: Math.min(416, 44 + entries.length * 42) }}>
          <div className="overflow-x-auto pr-4">
            <table className="w-full min-w-[27rem] text-sm text-left">
              <thead className="sticky top-0 z-10 bg-background text-muted-foreground">
                <tr>
                  <th className="p-2 font-medium">#</th>
                  <th className="p-2 font-medium">{t('boardName', language)}</th>
                  <th className="p-2 font-medium text-right">{t('boardFiles', language)}</th>
                  <th className="p-2 font-medium text-right">{t('boardUnifications', language)}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => <tr key={entry.id} data-dotscroll-section data-dotscroll-label={entry.name}
                  className={`border-t ${entry.name === profile?.name ? 'bg-primary/10 font-semibold' : ''}`}>
                  <td className="p-2 tabular-nums text-muted-foreground">{index + 1}</td>
                  <td className="p-2 break-all">{entry.name}{entry.name === profile?.name && <span className="ml-2 text-xs text-muted-foreground">{t('boardMe', language)}</span>}</td>
                  <td className="p-2 text-right tabular-nums">{entry.totalFiles.toLocaleString(language)}</td>
                  <td className="p-2 text-right tabular-nums">{entry.unifications.toLocaleString(language)}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </ScrollArea> : !error && <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground text-center">{t('boardEmpty', language)}</p>}
      {participantCount > entries.length && <p className="text-xs text-muted-foreground">{t('boardTopFifty', language)}</p>}
    </DialogContent>
  </Dialog>;
}
