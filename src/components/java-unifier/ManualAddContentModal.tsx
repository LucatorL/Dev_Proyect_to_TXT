// components/java-unifier/ManualAddContentModal.tsx
"use client"

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { ProjectFile } from '@/types/java-unifier';
import { t, type Language } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { FileUp } from 'lucide-react';

const NEW_PROJECT_ID_VALUE = 'new_project';

interface ManualAddContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddContent: (fileName: string, content: string, targetProjectId: string | 'new_project') => void;
  preferredProjectId?: string;
  existingProjects: ProjectFile[]; 
  isMultiProjectMode: boolean;
  currentLanguage: Language;
}

export function ManualAddContentModal({ 
  isOpen, 
  onClose, 
  onAddContent, 
  existingProjects,
  preferredProjectId,
  isMultiProjectMode,
  currentLanguage,
}: ManualAddContentModalProps) {
  const [fileName, setFileName] = useState("");
  const [content, setContent] = useState("");
  const [targetProjectId, setTargetProjectId] = useState<string | 'new_project'>(NEW_PROJECT_ID_VALUE);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
        setTargetProjectId(previous => existingProjects.some(project => project.id === previous) ? previous
          : preferredProjectId ?? existingProjects[0]?.id ?? NEW_PROJECT_ID_VALUE);
    }
  }, [isOpen, existingProjects, preferredProjectId]);


  const handleAdd = () => {
    if (!fileName.trim()) {
      toast({ title: t('error', currentLanguage), description: t('fileNameEmptyError', currentLanguage), variant: "destructive" });
      return;
    }
    if (!content.trim()) {
      toast({ title: t('error', currentLanguage), description: t('contentEmptyError', currentLanguage), variant: "destructive" });
      return;
    }
    if (!fileName.includes('.')) {
        toast({ title: t('noExtensionWarning', currentLanguage), description: t('noExtensionWarning', currentLanguage), variant: "default" });
    }

    onAddContent(fileName, content, targetProjectId);
    setFileName(""); 
    setContent("");
  };

  const handleClose = () => {
    setFileName("");
    setContent("");
    setTargetProjectId(NEW_PROJECT_ID_VALUE);
    setIsDragging(false);
    onClose();
  }

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

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file) return;
      
      if (files.length > 1) {
        toast({
            title: t('multipleFilesDraggedTitle', currentLanguage),
            description: t('multipleFilesDraggedDescription', currentLanguage, { fileName: file.name }),
            variant: "default"
        });
      }

      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const fileContent = loadEvent.target?.result as string;
        setContent(fileContent);
      };
      reader.onerror = () => {
        toast({
            title: t('error', currentLanguage),
            description: t('processingErrorToastDescriptionShort', currentLanguage, { fileName: file.name }),
            variant: "destructive"
        });
      };
      reader.readAsText(file);
    }
  }, [currentLanguage, toast]);


  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('addManualContentTitle', currentLanguage)}</DialogTitle>
          <DialogDescription>
            {t('addManualContentDescription', currentLanguage)}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="manual-destination" className="text-right">{t('destinationLabel', currentLanguage)}</Label>
            <Select value={targetProjectId} onValueChange={setTargetProjectId}>
              <SelectTrigger id="manual-destination" className="col-span-3"><SelectValue /></SelectTrigger>
              <SelectContent>
                {existingProjects.map(project => <SelectItem key={project.id} value={project.id}>{t('addToProject', currentLanguage, { projectName: project.name })}</SelectItem>)}
                <SelectItem value={NEW_PROJECT_ID_VALUE}>{t('createNewProject', currentLanguage)}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="manual-filename" className="text-right">
              {t('fileNameLabel', currentLanguage)}
            </Label>
            <Input
              id="manual-filename"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder={t('fileNamePlaceholder', currentLanguage)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="manual-content" className="text-right pt-2">
              {t('contentLabel', currentLanguage)}
            </Label>
            <div
              className={cn(
                "col-span-3 relative rounded-md border-2 border-dashed transition-colors",
                isDragging ? "border-primary bg-primary/10" : "border-input"
              )}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <Textarea
                id="manual-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder=""
                className="min-h-[200px] w-full resize-none border-none bg-transparent p-2 font-mono text-xs focus-visible:outline-none"
              />
              {content === '' && !isDragging && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-muted-foreground pointer-events-none">
                  <FileUp className="h-8 w-8 text-muted-foreground/70" />
                  <span className="mt-2 text-sm font-medium">{t('contentPlaceholder', currentLanguage)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>{t('cancel', currentLanguage)}</Button>
          <Button onClick={handleAdd}>{t('addFile', currentLanguage)}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
