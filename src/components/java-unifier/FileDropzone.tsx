// components/java-unifier/FileDropzone.tsx
"use client"

import React, { useCallback, useState, useRef } from 'react';
import { UploadCloud, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface FileDropzoneProps {
  onFilesProcessed: (files: FileSystemFileEntry[]) => void;
}

export function FileDropzone({ onFilesProcessed }: FileDropzoneProps) {
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
          if (entry.isDirectory || (entry.isFile && entry.name.toLowerCase().endsWith('.java'))) {
            entries.push(entry);
          } else {
             toast({
                title: "Archivo no soportado",
                description: `El archivo '${entry.name}' no es una carpeta o archivo .java y será ignorado.`,
                variant: "default", // Changed from destructive to default for less alarm
            });
          }
        }
      }
      if (entries.length > 0) {
        onFilesProcessed(entries);
      }
    }
  }, [onFilesProcessed, toast]);

  const handleManualSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files);
      
      const entries: FileSystemFileEntry[] = fileList.map(file => ({
        isFile: true,
        isDirectory: false, 
        name: file.name,
        fullPath: (file as any).webkitRelativePath || file.name,
        file: (callback: (file: File) => void) => callback(file),
        createReader: () => ({} as FileSystemDirectoryReader), 
        getMetadata: () => {},
        moveTo: () => {},
        copyTo: () => {},
        remove: () => {},
        getParent: () => {},
        filesystem: {} as FileSystem,
      }));
      
      // Filter to ensure only valid entries are passed to processor,
      // especially if webkitdirectory was not used or if single files were selected.
      const validEntries = entries.filter(entry => entry.isDirectory || (entry.isFile && entry.name.toLowerCase().endsWith('.java')));

      if (validEntries.length === 0 && fileList.length > 0) {
         toast({
            title: "Sin archivos Java",
            description: "No se seleccionaron archivos .java válidos o carpetas que los contengan.",
            variant: "default",
        });
        // Clear the file input so the user can try again with the same files if needed
        if(fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      onFilesProcessed(validEntries);
    }
  };

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
          Arrastra aquí carpetas o archivos .java
        </p>
        <p className="text-sm text-muted-foreground">
          o haz clic para seleccionar manualmente
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
        <FileUp className="mr-2 h-4 w-4" /> O selecciona manualmente
      </Button>
    </div>
  );
}
