// components/java-unifier/FileDropzone.tsx
"use client"

import React, { useCallback, useState, useRef } from 'react';
import { UploadCloud, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { t, type Language } from '@/lib/translations';
import { type ProjectType } from '@/lib/file-processor';


interface FileDropzoneProps {
  onFilesProcessed: (files: FileSystemFileEntry[]) => void;
  currentLanguage: Language;
  projectType: ProjectType;
}

export function FileDropzone({ onFilesProcessed, currentLanguage, projectType }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const entries: FileSystemFileEntry[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry();
        if (entry) {
          if (entry.name.toLowerCase().endsWith('.rar')) {
             toast({
                title: t('compressedFileNotSupported', currentLanguage),
                description: t('compressedRarFileDescription', currentLanguage, { fileName: entry.name }),
                variant: "default",
            });
          } else if (entry.isDirectory || entry.isFile) {
             entries.push(entry);
          } else { 
             toast({
                title: t('unsupportedItem', currentLanguage),
                description: t('unsupportedItemDescription', currentLanguage, { fileName: entry.name}),
                variant: "default",
            });
          }
        }
      }
      if (entries.length > 0) {
        onFilesProcessed(entries);
      }
    }
  }, [onFilesProcessed, toast, currentLanguage]);
  
  const createFakeFileEntry = (file: File): FileSystemFileEntry => {
    return {
        isFile: true,
        isDirectory: false,
        name: file.name,
        fullPath: (file as any).webkitRelativePath || file.name,
        file: (callback: (f: File) => void) => callback(file),
        createReader: () => ({} as FileSystemDirectoryReader),
        getMetadata: () => {}, 
        moveTo: () => {}, 
        copyTo: () => {}, 
        remove: () => {}, 
        getParent: () => {}, 
        filesystem: {} as FileSystem,
    } as FileSystemFileEntry;
  };


  const handleManualSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const entriesForProcessing: FileSystemFileEntry[] = [];

    for (const file of fileList) {
        const fakeEntry = createFakeFileEntry(file);
        if (file.name.toLowerCase().endsWith('.rar')) {
            toast({
                title: t('compressedFileNotSupported', currentLanguage),
                description: t('compressedRarFileDescription', currentLanguage, { fileName: file.name }),
                variant: 'default',
            });
        } else {
            entriesForProcessing.push(fakeEntry);
        }
    }

    if (entriesForProcessing.length > 0) {
        onFilesProcessed(entriesForProcessing);
    }

    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }, [onFilesProcessed, toast, currentLanguage]);
  
  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const directoryProps = { webkitdirectory: "true", mozdirectory: "true", directory: "true" };

  return (
    <div className="p-6 space-y-4">
      <div
        className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors
                    ${isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-accent'}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <UploadCloud className={`w-16 h-16 mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
        <p className={`text-lg font-semibold ${isDragging ? 'text-primary' : 'text-foreground'}`}>
          {t('dropzoneHint', currentLanguage)}
        </p>
        <p className="text-sm text-muted-foreground">
          {t('dropzoneSubHint', currentLanguage)}
        </p>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleManualSelect}
          className="hidden"
          multiple
          {...directoryProps} 
        />
      </div>
      <Button onClick={openFileDialog} className="w-full" variant="outline">
        <FileUp className="mr-2 h-4 w-4" /> {t('selectFoldersOrFiles', currentLanguage)}
      </Button>
    </div>
  );
}
