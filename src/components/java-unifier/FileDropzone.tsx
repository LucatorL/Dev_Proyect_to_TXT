
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
          const lowerName = entry.name.toLowerCase();
          if (entry.isDirectory || (entry.isFile && lowerName.endsWith('.java'))) {
            entries.push(entry);
          } else if (entry.isFile && (lowerName.endsWith('.zip') || lowerName.endsWith('.rar'))) {
            toast({
                title: "Archivo comprimido no soportado",
                description: `El archivo '${entry.name}' es un ZIP/RAR. Por favor, extráelo primero y luego arrastra la carpeta o los archivos .java.`,
                variant: "default", // Using "default" as it's informational
            });
          } else if (entry.isFile) { // Other unsupported files
             toast({
                title: "Archivo no soportado",
                description: `El archivo '${entry.name}' no es un archivo .java y será ignorado. Solo se aceptan carpetas y archivos .java.`,
                variant: "default",
            });
          } else { // Non-file, non-directory entries (e.g. text snippets dragged from browser)
            // This case is less common but good to handle.
             toast({
                title: "Elemento no soportado",
                description: `El elemento '${entry.name}' no es una carpeta o un archivo .java y será ignorado.`,
                variant: "default",
            });
          }
        }
      }
      if (entries.length > 0) {
        onFilesProcessed(entries);
      }
      // If entries.length is 0 but items were dropped, individual toasts have already informed the user.
    }
  }, [onFilesProcessed, toast]);

  const handleManualSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files);
      const processedEntries: FileSystemFileEntry[] = [];
      let hasUnsupportedZipRar = false;
      let hasOtherUnsupported = false;

      // For manual selection, especially with webkitdirectory, files come in flat.
      // We need to simulate FileSystemFileEntry for processDroppedItems.
      // This part is tricky because the browser's File API for selected items
      // doesn't perfectly match DataTransferItem's webkitGetAsEntry.
      // The current implementation for manual select might need further review
      // if full directory structure processing is critical path for it.
      // For now, focusing on providing feedback for ZIP/RAR in manual selection too.

      const entriesForProcessing: FileSystemFileEntry[] = [];

      fileList.forEach(file => {
        const lowerName = file.name.toLowerCase();
        if (lowerName.endsWith('.java')) {
           // Create a mock FileSystemFileEntry-like object for .java files
           // This is a simplified version; full FileSystemAPI mimicry is complex.
           const entry = {
            isFile: true,
            isDirectory: false,
            name: file.name,
            fullPath: (file as any).webkitRelativePath || file.name, // webkitRelativePath is key for folder structure
            file: (callback: (f: File) => void) => callback(file),
            createReader: () => ({} as FileSystemDirectoryReader), // Dummy
            getMetadata: () => {}, moveTo: () => {}, copyTo: () => {}, remove: () => {}, getParent: () => {}, filesystem: {} as FileSystem,
          } as FileSystemFileEntry;
          entriesForProcessing.push(entry);

        } else if (lowerName.endsWith('.zip') || lowerName.endsWith('.rar')) {
          if (!hasUnsupportedZipRar) { // Show toast only once for ZIP/RAR
            toast({
              title: "Archivos comprimidos no soportados",
              description: `Uno o más archivos seleccionados son ZIP/RAR. Por favor, extráelos primero y luego selecciona la carpeta o los archivos .java.`,
              variant: "default",
            });
            hasUnsupportedZipRar = true;
          }
        } else {
          if (!hasOtherUnsupported) { // Show toast only once for other unsupported
             toast({
                title: "Archivos no soportados",
                description: `Uno o más archivos seleccionados no son .java y serán ignorados. Solo se pueden seleccionar archivos .java o carpetas (si el navegador lo soporta).`,
                variant: "default",
            });
            hasOtherUnsupported = true;
          }
        }
      });
      
      // If webkitdirectory was used, webkitRelativePath should give folder structure.
      // processDroppedItems expects FileSystemDirectoryEntry for folders.
      // This manual path is more geared towards individual .java files or a flat list from a folder.
      // A true directory picker would yield actual directory entries.

      if (entriesForProcessing.length > 0) {
        // For simplicity, if webkitdirectory was used and resulted in .java files,
        // they are passed as a flat list of FileSystemFileEntry-like objects.
        // processDroppedItems will treat them as individual file "projects".
        // A more robust solution would reconstruct the directory structure.
        onFilesProcessed(entriesForProcessing);
      } else if (fileList.length > 0 && !hasUnsupportedZipRar && !hasOtherUnsupported) {
        // This means files were selected, but none were .java, and no specific unsupported toast was shown yet.
        // This case should be rare if the above logic catches all.
        toast({
            title: "Sin archivos Java válidos",
            description: "No se seleccionaron archivos .java válidos. Por favor, inténtalo de nuevo.",
            variant: "default",
        });
      }

      if(fileInputRef.current) fileInputRef.current.value = ""; // Clear input
    }
  };

  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Note: 'directory' and 'mozdirectory' are non-standard. 'webkitdirectory' is most common.
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
        onClick={openFileDialog} // Keep this to allow selecting folders if browser supports webkitdirectory
      >
        <UploadCloud className={`w-16 h-16 mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
        <p className={`text-lg font-semibold ${isDragging ? 'text-primary' : 'text-foreground'}`}>
          Arrastra aquí carpetas o archivos .java
        </p>
        <p className="text-sm text-muted-foreground">
          (Archivos ZIP/RAR deben extraerse primero)
        </p>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleManualSelect}
          className="hidden"
          multiple
          {...directoryProps} // Allows folder selection in supporting browsers
        />
      </div>
      <Button onClick={openFileDialog} className="w-full" variant="outline">
        <FileUp className="mr-2 h-4 w-4" /> Seleccionar Carpetas o Archivos .java
      </Button>
    </div>
  );
}

