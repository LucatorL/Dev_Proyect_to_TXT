import type { ImportIssue } from '@/lib/file-processor';
import { t, type Language } from '@/lib/translations';
import { ScrollArea } from '@/components/ui/scroll-area';

const reasonKeys = { size: 'importSize', limit: 'importLimit', read: 'importRead', archive: 'importArchive', archivePassword: 'importArchivePassword', archiveVolume: 'importArchiveVolume', unsupported: 'importUnsupported' } as const;
export function ImportIssues({ issues, currentLanguage }: { issues: ImportIssue[]; currentLanguage: Language }) {
  if (!issues.length) return null;
  const list = (
    <ul className="space-y-1">
      {issues.map((issue, index) => <li key={index} className="break-words"><strong>{issue.path}</strong>: {t(reasonKeys[issue.reason], currentLanguage)}</li>)}
    </ul>
  );
  return (
    <details className="my-2 rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm">
      <summary className="cursor-pointer font-medium" role="status">{t('importIssuesTitle', currentLanguage)} ({issues.length})</summary>
      {issues.length > 4 ? <ScrollArea className="mt-2 h-32">{list}</ScrollArea> : <div className="mt-2">{list}</div>}
    </details>
  );
}
