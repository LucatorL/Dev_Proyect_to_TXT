
// components/java-unifier/ManualAddContentModal.tsx
"use client"

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ManualAddContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddContent: (fileName: string, content: string) => void;
}

export function ManualAddContentModal({ isOpen, onClose, onAddContent }: ManualAddContentModalProps) {
  const [fileName, setFileName] = useState("");
  const [content, setContent] = useState("");
  const { toast } = useToast();

  const handleAdd = () => {
    if (!fileName.trim()) {
      toast({ title: "Error", description: "El nombre del archivo no puede estar vacío.", variant: "destructive" });
      return;
    }
    if (!content.trim()) {
      toast({ title: "Error", description: "El contenido no puede estar vacío.", variant: "destructive" });
      return;
    }
    // Basic check for valid extension (optional, can be more complex)
    if (!fileName.includes('.')) {
        toast({ title: "Advertencia", description: "El nombre del archivo no parece tener una extensión (ej: .java, .txt).", variant: "default" });
    }

    onAddContent(fileName, content);
    // Reset state for next time
    setFileName("");
    setContent("");
    // onClose(); // The parent component will close it after processing
  };

  const handleClose = () => {
    // Reset state if modal is closed without adding
    setFileName("");
    setContent("");
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Añadir Contenido Manualmente</DialogTitle>
          <DialogDescription>
            Pega el contenido de tu archivo y asígnale un nombre (incluyendo la extensión, ej: MiClase.java, notas.txt).
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleAdd}>Añadir Archivo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
