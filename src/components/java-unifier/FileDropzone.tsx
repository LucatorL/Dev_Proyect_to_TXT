"use client"

import React, { useRef, useState } from 'react';
import { UploadCloud, FileUp, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t, type Language } from '@/lib/translations';
import { type DroppedItem, type ProjectType } from '@/lib/file-processor';

interface FileDropzoneProps {
  onFilesProcessed: (files: DroppedItem[]) => void | Promise<void>;
  currentLanguage: Language;
  projectType: ProjectType;
}

export function FileDropzone({ onFilesProcessed, currentLanguage }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const process = async (items: DroppedItem[]) => {
    if (processingRef.current || !items.length) return;
    processingRef.current = true;
    setIsProcessing(true);
    try { await onFilesProcessed(items); }
    finally { processingRef.current = false; setIsProcessing(false); }
  };
  const handleSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    input.value = '';
    await process(files);
  };
  const openFiles = async () => {
    const picker = (window as Window & {
      showOpenFilePicker?: (options: { multiple: boolean }) => Promise<FileSystemFileHandle[]>;
    }).showOpenFilePicker;
    if (!picker) { fileInputRef.current?.click(); return; }
    let handles: FileSystemFileHandle[];
    try {
      handles = await picker.call(window, { multiple: true });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) fileInputRef.current?.click();
      return;
    }
    await process(handles.map(handle => ({ kind: 'local-handle', handle })));
  };
  const openFolder = async () => {
    const picker = (window as Window & {
      showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
    }).showDirectoryPicker;
    if (!picker) { folderInputRef.current?.click(); return; }
    let handle: FileSystemDirectoryHandle;
    try {
      handle = await picker.call(window);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) folderInputRef.current?.click();
      return;
    }
    await process([{ kind: 'local-handle', handle }]);
  };
  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const items = Array.from(event.dataTransfer.items ?? []).filter(item => item.kind === 'file');
    const entries = items.map(item => item.webkitGetAsEntry?.() ?? item.getAsFile())
      .filter((entry): entry is File | FileSystemEntry => entry !== null);
    const files = Array.from(event.dataTransfer.files);
    const handleRequests = items.map(item => (item as DataTransferItem & {
      getAsFileSystemHandle?: () => Promise<FileSystemFileHandle | FileSystemDirectoryHandle | null>;
    }).getAsFileSystemHandle?.());
    if (items.length && handleRequests.every(Boolean)) {
      const handles = await Promise.allSettled(handleRequests as Promise<FileSystemFileHandle | FileSystemDirectoryHandle | null>[]);
      if (handles.every(result => result.status === 'fulfilled' && result.value)) {
        await process(handles.map(result => ({ kind: 'local-handle', handle: (result as PromiseFulfilledResult<FileSystemFileHandle | FileSystemDirectoryHandle>).value! })));
        return;
      }
    }
    await process(entries.length ? entries : files);
  };

  return (
    <div className="p-6 space-y-4" aria-busy={isProcessing}>
      <div
        className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-accent'}`}
        onDragEnter={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsDragging(false); }}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !isProcessing && void openFiles()}
        role="button" tabIndex={isProcessing ? -1 : 0} aria-disabled={isProcessing}
        onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !isProcessing) { e.preventDefault(); void openFiles(); } }}
      >
        <UploadCloud className="w-16 h-16 mb-4 text-muted-foreground" />
        <p className="text-lg font-semibold">{isProcessing ? t('importing', currentLanguage) : t('dropzoneHint', currentLanguage)}</p>
        <p className="text-sm text-muted-foreground">{t('dropzoneSubHint', currentLanguage)}</p>
      </div>
      <input type="file" aria-label={t('selectFiles', currentLanguage)} ref={fileInputRef} onChange={handleSelect} className="hidden" multiple disabled={isProcessing} />
      <input type="file" aria-label={t('selectFolders', currentLanguage)} ref={node => {
        folderInputRef.current = node;
        node?.setAttribute('webkitdirectory', '');
      }} onChange={handleSelect} className="hidden" multiple disabled={isProcessing} />
      <div className="flex flex-col sm:flex-row gap-2">
        <Button onClick={() => void openFiles()} className="flex-1" variant="outline" disabled={isProcessing}>
          <FileUp className="mr-2 h-4 w-4" />{t('selectFiles', currentLanguage)}
        </Button>
        <Button onClick={() => void openFolder()} className="flex-1" variant="outline" disabled={isProcessing}>
          <FolderOpen className="mr-2 h-4 w-4" />{t('selectFolders', currentLanguage)}
        </Button>
      </div>
    </div>
  );
}
