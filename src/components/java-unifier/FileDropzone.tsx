// components/java-unifier/FileDropzone.tsx
"use client"

import React, { useCallback, useState, useRef } from 'react';
import { UploadCloud, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { t, type Language } from '@/lib/translations';
import { PROJECT_CONFIG, type ProjectType, getFileExtension, readFileContent } from '@/lib/file-processor';
import { ToastAction } from "@/components/ui/toast";


interface FileDropzoneProps {
  onFilesProcessed: (files: FileSystemFileEntry[]) => void;
  onAddFileManually: (fileName: string, content: string) => void;
  currentLanguage: Language;
  projectType: ProjectType;
}

function isSupportedFileType(fileName: string, projectType: ProjectType): boolean {
  const extension = getFileExtension(fileName);
  return PROJECT_CONFIG[projectType].extensions.includes(extension);
}


export function FileDropzone({ onFilesProcessed, onAddFileManually, currentLanguage, projectType }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleAddAnyway = useCallback(async (entry: FileSystemFileEntry) => {
      if (!entry.isFile) return;
      try {
          const file = await new Promise<File>((resolve, reject) => entry.file(resolve, reject));
          const content = await readFileContent(file);
          onAddFileManually(file.name, content);
           toast({
              title: t('fileAddedToastTitle', currentLanguage),
              description: t('fileXAddedAsNewProjectToast', currentLanguage, { fileName: file.name })
           });
      } catch (error) {
          console.error("Error reading file to add anyway:", error);
          toast({
              title: t('processingErrorToastTitle', currentLanguage),
              description: t('processingErrorToastDescriptionShort', currentLanguage, { fileName: entry.name }),
              variant: "destructive",
          });
      }
  }, [onAddFileManually, currentLanguage, toast]);

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
          const lowerName = entry.name.toLowerCase();
          if (entry.isDirectory || (entry.isFile && (isSupportedFileType(entry.name, projectType) || lowerName.endsWith('.zip')))) {
            entries.push(entry);
          } else if (entry.isFile && lowerName.endsWith('.rar')) {
             toast({
                title: t('compressedFileNotSupported', currentLanguage),
                description: t('compressedRarFileDescription', currentLanguage, { fileName: entry.name }),
                variant: "default",
            });
          } else if (entry.isFile) { 
             toast({
                title: t('unsupportedFileFoundTitle', currentLanguage),
                description: t('unsupportedFileFoundDescription', currentLanguage, { fileName: entry.name, projectType: projectType }),
                variant: "default",
                action: <ToastAction altText={t('addAnywayButton', currentLanguage)} onClick={() => handleAddAnyway(entry)}>{t('addAnywayButton', currentLanguage)}</ToastAction>
            });
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
  }, [onFilesProcessed, toast, currentLanguage, projectType, handleAddAnyway]);
  
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
        const lowerName = file.name.toLowerCase();
        const fakeEntry = createFakeFileEntry(file);

        if (isSupportedFileType(file.name, projectType) || lowerName.endsWith('.zip')) {
            entriesForProcessing.push(fakeEntry);
        } else if (lowerName.endsWith('.rar')) {
            toast({
                title: t('compressedFileNotSupported', currentLanguage),
                description: t('compressedRarFileDescription', currentLanguage, { fileName: file.name }),
                variant: 'default',
            });
        } else {
            toast({
                title: t('unsupportedFileFoundTitle', currentLanguage),
                description: t('unsupportedFileFoundDescription', currentLanguage, {
                    fileName: file.name,
                    projectType,
                }),
                variant: 'default',
                action: (
                    <ToastAction
                        altText={t('addAnywayButton', currentLanguage)}
                        onClick={() => handleAddAnyway(fakeEntry)}
                    >
                        {t('addAnywayButton', currentLanguage)}
                    </ToastAction>
                ),
            });
        }
    }

    if (entriesForProcessing.length > 0) {
        onFilesProcessed(entriesForProcessing);
    }

    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }, [onFilesProcessed, handleAddAnyway, toast, currentLanguage, projectType]);
  
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
