
// components/java-unifier/ManualAddContentModal.tsx
"use client"

import React, { useState, useEffect } from 'react';
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { ProjectFile } from '@/types/java-unifier';

interface ManualAddContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddContent: (fileName: string, content: string, targetProjectId: string | 'new_project') => void;
  existingProjects: ProjectFile[]; // Projects currently in FileSelectionModal
  currentProjectNameInSingleView?: string; // Name of the project if in single view mode
  isMultiProjectMode: boolean;
}

const NEW_PROJECT_ID_VALUE = 'new_project';

export function ManualAddContentModal({ 
  isOpen, 
  onClose, 
  onAddContent, 
  existingProjects,
  currentProjectNameInSingleView,
  isMultiProjectMode
}: ManualAddContentModalProps) {
  const [fileName, setFileName] = useState("");
  const [content, setContent] = useState("");
  const [targetProjectId, setTargetProjectId] = useState<string | 'new_project'>(NEW_PROJECT_ID_VALUE);
  const { toast } = useToast();

  useEffect(() => {
    // Reset target project ID when modal opens or existing projects change
    if (isOpen) {
        if (!isMultiProjectMode && existingProjects.length === 1 && existingProjects[0]) {
            // If single project mode and there is one project, default to adding to it
             setTargetProjectId(existingProjects[0].id);
        } else {
             setTargetProjectId(NEW_PROJECT_ID_VALUE);
        }
    }
  }, [isOpen, existingProjects, isMultiProjectMode]);


  const handleAdd = () => {
    if (!fileName.trim()) {
      toast({ title: "Error", description: "El nombre del archivo no puede estar vacío.", variant: "destructive" });
      return;
    }
    if (!content.trim()) {
      toast({ title: "Error", description: "El contenido no puede estar vacío.", variant: "destructive" });
      return;
    }
    if (!fileName.includes('.')) {
        toast({ title: "Advertencia", description: "El nombre del archivo no parece tener una extensión (ej: .java, .txt).", variant: "default" });
    }

    onAddContent(fileName, content, targetProjectId);
    setFileName(""); // Reset for next time, but modal is closed by parent
    setContent("");
    // TargetProjectId will be reset by useEffect on next open
  };

  const handleClose = () => {
    setFileName("");
    setContent("");
    setTargetProjectId(NEW_PROJECT_ID_VALUE);
    onClose();
  }

  const getSelectOptions = () => {
    if (!isMultiProjectMode && currentProjectNameInSingleView && existingProjects.length > 0 && existingProjects[0]) {
      // Single project view mode
      return (
        <>
          <SelectItem value={existingProjects[0].id}>
            Añadir a: {currentProjectNameInSingleView}
          </SelectItem>
          <SelectItem value={NEW_PROJECT_ID_VALUE}>Crear como nuevo proyecto</SelectItem>
        </>
      );
    } else if (isMultiProjectMode && existingProjects.length > 0) {
      // Multi-project view mode
      return (
        <>
          <SelectItem value={NEW_PROJECT_ID_VALUE}>Crear como nuevo proyecto</SelectItem>
          {existingProjects.map(proj => (
            <SelectItem key={proj.id} value={proj.id}>
              Añadir a: {proj.name}
            </SelectItem>
          ))}
        </>
      );
    }
    // Default: if no projects or some other edge case, only "Create as new project"
    return <SelectItem value={NEW_PROJECT_ID_VALUE}>Crear como nuevo proyecto</SelectItem>;
  };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Añadir Contenido Manualmente</DialogTitle>
          <DialogDescription>
            Pega el contenido, asígnale un nombre (con extensión) y elige dónde añadirlo.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="manual-filename" className="text-right">
              Nombre Archivo
            </Label>
            <Input
              id="manual-filename"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Ej: MiClase.java, config.xml"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="manual-content" className="text-right pt-2">
              Contenido
            </Label>
            <Textarea
              id="manual-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Pega aquí el contenido de tu archivo..."
              className="col-span-3 min-h-[200px] font-mono text-xs"
            />
          </div>
          {(isMultiProjectMode || (existingProjects.length > 0 && currentProjectNameInSingleView)) && (
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="manual-target-project" className="text-right">
                    Destino
                </Label>
                <Select 
                    value={targetProjectId} 
                    onValueChange={(value) => setTargetProjectId(value as string | 'new_project')}
                >
                    <SelectTrigger className="col-span-3" id="manual-target-project">
                        <SelectValue placeholder="Seleccionar destino..." />
                    </SelectTrigger>
                    <SelectContent>
                        {getSelectOptions()}
                    </SelectContent>
                </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleAdd}>Añadir Archivo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
