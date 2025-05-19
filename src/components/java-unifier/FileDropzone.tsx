
// components/java-unifier/FileDropzone.tsx
"use client"

import React, { useCallback, useState, useRef } from 'react';
import { UploadCloud, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface FileDropzoneProps {
  onFilesProcessed: (files: FileSystemFileEntry[]) => void;
}

// From file-processor.ts, duplicated for client-side check without direct import if not desired
const SUPPORTED_EXTENSIONS_DROPZONE = ['java', 'xml', 'txt', 'properties', 'md', 'sql', 'csv', 'yaml', 'yml', 'pom'];

function isSupportedFileType(fileName: string): boolean {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return extension ? SUPPORTED_EXTENSIONS_DROPZONE.includes(extension) : false;
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
          if (entry.isDirectory || (entry.isFile && isSupportedFileType(entry.name))) {
            entries.push(entry);
          } else if (entry.isFile && (lowerName.endsWith('.zip') || lowerName.endsWith('.rar'))) {
            toast({
                title: "Archivo comprimido no soportado directamente",
                description: `El archivo '${entry.name}' es un ZIP/RAR. Por favor, extráelo primero y luego arrastra la carpeta o los archivos soportados.`,
                variant: "default",
            });
          } else if (entry.isFile) { 
             toast({
                title: "Archivo no soportado",
                description: `El archivo '${entry.name}' no es de un tipo soportado y será ignorado. Se aceptan carpetas y archivos ${SUPPORTED_EXTENSIONS_DROPZONE.join(', ')}.`,
                variant: "default",
            });
          } else { 
             toast({
                title: "Elemento no soportado",
                description: `El elemento '${entry.name}' no es una carpeta o un archivo soportado y será ignorado.`,
                variant: "default",
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
      let hasUnsupportedZipRar = false;
      let hasOtherUnsupported = false;
      const entriesForProcessing: FileSystemFileEntry[] = [];

      fileList.forEach(file => {
        const lowerName = file.name.toLowerCase();
        if (isSupportedFileType(file.name)) {
           const entry = {
            isFile: true,
            isDirectory: false,
            name: file.name,
            fullPath: (file as any).webkitRelativePath || file.name,
            file: (callback: (f: File) => void) => callback(file),
            createReader: () => ({} as FileSystemDirectoryReader), 
            getMetadata: () => {}, moveTo: () => {}, copyTo: () => {}, remove: () => {}, getParent: () => {}, filesystem: {} as FileSystem,
          } as FileSystemFileEntry;
          entriesForProcessing.push(entry);
        } else if (lowerName.endsWith('.zip') || lowerName.endsWith('.rar')) {
          if (!hasUnsupportedZipRar) {
            toast({
              title: "Archivos comprimidos no soportados directamente",
              description: `Uno o más archivos seleccionados son ZIP/RAR. Por favor, extráelos primero y luego selecciona la carpeta o los archivos soportados.`,
              variant: "default",
            });
            hasUnsupportedZipRar = true;
          }
        } else {
          if (!hasOtherUnsupported) {
             toast({
                title: "Archivos no soportados",
                description: `Uno o más archivos seleccionados no son de un tipo soportado y serán ignorados. Se aceptan archivos ${SUPPORTED_EXTENSIONS_DROPZONE.join(', ')} o carpetas.`,
                variant: "default",
            });
            hasOtherUnsupported = true;
          }
        }
      });
      
      if (entriesForProcessing.length > 0) {
        onFilesProcessed(entriesForProcessing);
      } else if (fileList.length > 0 && !hasUnsupportedZipRar && !hasOtherUnsupported) {
        toast({
            title: "Sin archivos válidos",
            description: "No se seleccionaron archivos de tipos soportados. Por favor, inténtalo de nuevo.",
            variant: "default",
        });
      }

      if(fileInputRef.current) fileInputRef.current.value = "";
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
          Arrastra aquí carpetas o archivos soportados
        </p>
        <p className="text-sm text-muted-foreground">
          (.java, .xml, .txt, .sql, pom.xml, etc. Archivos ZIP/RAR deben extraerse primero)
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
        <FileUp className="mr-2 h-4 w-4" /> Seleccionar Carpetas o Archivos
      </Button>
    </div>
  );
}
