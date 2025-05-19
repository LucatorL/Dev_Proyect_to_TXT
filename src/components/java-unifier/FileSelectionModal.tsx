// components/java-unifier/FileSelectionModal.tsx
"use client"

import React, { useState, useEffect, useMemo } from 'react';
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { JavaFile, ProjectFile, PackageGroup, ProjectGroup, UnifiedData } from '@/types/java-unifier';
import { unifyJavaFiles, downloadTextFile } from '@/lib/file-processor';
import { Copy, Download, Eye, CheckSquare, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectsToProcess: ProjectFile[];
  onConfirm: (selectedFiles: JavaFile[], unifiedContent: string) => void;
  isMultiProjectView: boolean;
  initialProjectName: string;
}

export function FileSelectionModal({
  isOpen,
  onClose,
  projectsToProcess,
  onConfirm,
  isMultiProjectView,
  initialProjectName,
}: FileSelectionModalProps) {
  const [currentProjects, setCurrentProjects] = useState<ProjectFile[]>(projectsToProcess);
  const [unifiedPreview, setUnifiedPreview] = useState("");
  const { toast } = useToast();
  const [outputFileName, setOutputFileName] = useState(initialProjectName + "_unificado.txt");
  const [individualFilePreview, setIndividualFilePreview] = useState<{ name: string, content: string } | null>(null);


  useEffect(() => {
    setCurrentProjects(projectsToProcess);
    setOutputFileName((isMultiProjectView ? "Proyectos_Unificados" : getProjectBaseName(projectsToProcess[0]?.name || "proyecto")) + "_unificado.txt");
  }, [projectsToProcess, isMultiProjectView]);
  
  function getProjectBaseName(name: string): string {
      let baseName = name;
      if (baseName.toLowerCase().endsWith(".zip")) {
        baseName = baseName.substring(0, baseName.length - 4);
      } else if (baseName.toLowerCase().endsWith(".rar")) {
        baseName = baseName.substring(0, baseName.length - 4);
      }
      baseName = baseName.replace(/\s*\(\d+\)$/, "").trim();
      return baseName.length > 0 ? baseName : "UntitledProject";
  }


  useEffect(() => {
    const content = unifyJavaFiles(currentProjects, isMultiProjectView);
    setUnifiedPreview(content);
  }, [currentProjects, isMultiProjectView]);

  const handleFileSelectionChange = (projectId: string, fileId: string, selected: boolean) => {
    setCurrentProjects(prevProjects =>
      prevProjects.map(proj =>
        proj.id === projectId
          ? {
              ...proj,
              javaFiles: proj.javaFiles.map(file =>
                file.id === fileId ? { ...file, selected } : file
              ),
            }
          : proj
      )
    );
  };

  const handleSelectAll = (selectAll: boolean) => {
    setCurrentProjects(prevProjects =>
      prevProjects.map(proj => ({
        ...proj,
        javaFiles: proj.javaFiles.map(file => ({ ...file, selected: selectAll })),
      }))
    );
  };

  const handleConfirm = () => {
    const allSelectedFiles: JavaFile[] = currentProjects.flatMap(p => p.javaFiles.filter(f => f.selected));
    if (allSelectedFiles.length === 0) {
        toast({ title: "Sin selección", description: "Por favor, selecciona al menos un archivo.", variant: "destructive" });
        return;
    }
    const finalUnifiedContent = unifyJavaFiles(currentProjects, isMultiProjectView);
    downloadTextFile(outputFileName, finalUnifiedContent);
    onConfirm(allSelectedFiles, finalUnifiedContent);
    toast({ title: "Éxito", description: `Archivo ${outputFileName} descargado.` });
    onClose();
  };

  const handleCopyToClipboard = () => {
    if (!unifiedPreview) {
        toast({ title: "Vacío", description: "No hay contenido para copiar.", variant: "destructive" });
        return;
    }
    navigator.clipboard.writeText(unifiedPreview)
      .then(() => toast({ title: "Copiado", description: "Contenido unificado copiado al portapapeles." }))
      .catch(() => toast({ title: "Error", description: "No se pudo copiar al portapapeles.", variant: "destructive" }));
  };

  const organizedData: UnifiedData = useMemo(() => {
    return currentProjects.map(project => {
      const packageMap = new Map<string, JavaFile[]>();
      project.javaFiles.forEach(file => {
        const list = packageMap.get(file.packageName) || [];
        list.push(file);
        packageMap.set(file.packageName, list);
      });
      
      const packages: PackageGroup[] = Array.from(packageMap.entries())
        .sort(([pkgA], [pkgB]) => pkgA.localeCompare(pkgB))
        .map(([packageName, files]) => ({
          packageName,
          files: files.sort((a,b) => a.name.localeCompare(b.name)),
        }));
      
      return { projectName: project.name, packages };
    });
  }, [currentProjects]);


  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>
            {isMultiProjectView ? "Unificar Múltiples Proyectos" : `Seleccionar Archivos de: ${projectsToProcess[0]?.name || 'Proyecto'}`}
          </DialogTitle>
          <DialogDescription>
            Selecciona los archivos Java que deseas incluir en el archivo unificado.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden p-6 pt-2">
          {/* Files Selection Panel */}
          <div className="flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-2 p-1 rounded-md bg-secondary">
              <Label className="font-semibold px-2">Archivos del Proyecto</Label>
              <div className="space-x-2">
                <Button variant="ghost" size="sm" onClick={() => handleSelectAll(true)} title="Seleccionar Todo">
                  <CheckSquare className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleSelectAll(false)} title="Deseleccionar Todo">
                  <Square className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <ScrollArea className="flex-grow border rounded-md p-1">
              {organizedData.map(projectGroup => (
                <div key={projectGroup.projectName} className="mb-3">
                  {isMultiProjectView && (
                    <h4 className="text-sm font-semibold p-2 bg-muted rounded-t-md sticky top-0 z-10">{projectGroup.projectName}</h4>
                  )}
                  {projectGroup.packages.map(pkgGroup => (
                    <div key={pkgGroup.packageName} className="mb-2">
                      <p className="text-xs font-medium text-muted-foreground px-2 py-1">{pkgGroup.packageName}</p>
                      <ul className="ml-2">
                        {pkgGroup.files.map(file => (
                          <li key={file.id} className="flex items-center justify-between text-sm py-0.5 px-1 rounded hover:bg-accent/50 group">
                            <div className="flex items-center flex-grow overflow-hidden">
                              <Checkbox
                                id={`${projectGroup.projectName}-${file.id}`}
                                checked={file.selected}
                                onCheckedChange={(checked) => handleFileSelectionChange(projectsToProcess.find(p=>p.name === projectGroup.projectName)!.id, file.id, !!checked)}
                                className="mr-2 shrink-0"
                              />
                              <Label htmlFor={`${projectGroup.projectName}-${file.id}`} className="truncate cursor-pointer" title={file.name}>
                                {file.name}
                              </Label>
                            </div>
                            <Button variant="ghost" size="icon" className="w-6 h-6 shrink-0 opacity-50 group-hover:opacity-100" onClick={() => setIndividualFilePreview({name: file.name, content: file.content})}>
                               <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </ScrollArea>
          </div>

          {/* Preview Panel */}
          <div className="flex flex-col overflow-hidden">
             <Label className="font-semibold mb-2 p-1">Vista Previa Unificada</Label>
            <Textarea
              value={unifiedPreview}
              readOnly
              className="flex-grow font-mono text-xs resize-none h-full bg-muted/50"
              placeholder="La vista previa del contenido unificado aparecerá aquí..."
            />
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 border-t mt-auto">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="secondary" onClick={handleCopyToClipboard}><Copy className="mr-2 h-4 w-4" /> Copiar Todo</Button>
          <Button onClick={handleConfirm}><Download className="mr-2 h-4 w-4" /> Aceptar y Guardar</Button>
        </DialogFooter>
      </DialogContent>

      {individualFilePreview && (
         <Dialog open={!!individualFilePreview} onOpenChange={() => setIndividualFilePreview(null)}>
            <DialogContent className="max-w-2xl h-[70vh] flex flex-col">
                 <DialogHeader>
                    <DialogTitle>Vista Previa: {individualFilePreview.name}</DialogTitle>
                 </DialogHeader>
                 <ScrollArea className="flex-grow border rounded-md my-4">
                    <pre className="text-xs p-4 font-mono whitespace-pre-wrap break-all">{individualFilePreview.content}</pre>
                 </ScrollArea>
                 <DialogFooter>
                     <Button variant="secondary" onClick={() => {
                         navigator.clipboard.writeText(individualFilePreview.content)
                           .then(() => toast({ title: "Copiado", description: `Contenido de ${individualFilePreview.name} copiado.` }))
                           .catch(() => toast({ title: "Error", description: "No se pudo copiar.", variant: "destructive" }));
                     }}><Copy className="mr-2 h-4 w-4" /> Copiar</Button>
                    <DialogClose asChild>
                        <Button>Cerrar</Button>
                    </DialogClose>
                 </DialogFooter>
            </DialogContent>
         </Dialog>
      )}
    </Dialog>
  );
}
