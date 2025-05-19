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
          // Basic validation: allow folders, zip, rar, or individual java files for simplicity
          if (entry.isDirectory || 
              (entry.isFile && (entry.name.toLowerCase().endsWith('.zip') || 
                                entry.name.toLowerCase().endsWith('.rar') ||
                                entry.name.toLowerCase().endsWith('.java')))) {
            entries.push(entry);
          } else {
             toast({
                title: "Archivo no soportado",
                description: `El archivo '${entry.name}' no es una carpeta, ZIP, RAR o archivo Java y será ignorado.`,
                variant: "destructive",
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
      // For manual selection, webkitGetAsEntry is not available.
      // We need a different way to represent these File objects as FileSystemEntry-like.
      // For simplicity, we'll adapt them. This is a limitation of browser APIs.
      // The `processDroppedItems` function will need to handle raw `File` objects if we pass them.
      // Given the current structure of processDroppedItems expecting FileSystemFileEntry,
      // this manual selection needs careful handling or simplification.
      // Simplification: Assume manual selection also provides folder-like structure if `webkitdirectory` is used.
      const fileList = Array.from(files);
      
      // Creating mock FileSystemFileEntry for simplicity.
      // This is a simplified representation. Proper handling for input type="file" multiple/directory is complex.
      const entries: FileSystemFileEntry[] = fileList.map(file => ({
        isFile: true,
        isDirectory: false, // This is tricky with webkitdirectory
        name: file.name,
        fullPath: (file as any).webkitRelativePath || file.name,
        file: (callback: (file: File) => void) => callback(file),
        createReader: () => ({} as FileSystemDirectoryReader), // Mock
        getMetadata: () => {},
        moveTo: () => {},
        copyTo: () => {},
        remove: () => {},
        getParent: () => {},
        filesystem: {} as FileSystem,
      }));

      // If input had webkitdirectory, structure might be available via webkitRelativePath
      // If it was just files, treat them as individual items.
      // For the spirit of the Java app (project folders), using webkitdirectory is best.
      
      onFilesProcessed(entries);
    }
  };

  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Add `webkitdirectory` attribute for folder selection
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
        onClick={openFileDialog} // Allow click to open file dialog as well
      >
        <UploadCloud className={`w-16 h-16 mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
        <p className={`text-lg font-semibold ${isDragging ? 'text-primary' : 'text-foreground'}`}>
          Arrastra aquí una o más carpetas, ZIP o RAR
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
