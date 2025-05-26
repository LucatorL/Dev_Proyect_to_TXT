
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
import { ProcessedFile, ProjectFile, PackageGroup, UnifiedData } from '@/types/java-unifier';
import { unifyJavaFiles, downloadTextFile, getProjectBaseName } from '@/lib/file-processor';
import { Copy, Download, Eye, CheckSquare, Square, FileText, FileCode, Database, Settings2, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FileSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectsToProcess: ProjectFile[];
  onSingleProjectProcessed: (projectId: string, downloadData: { fileName: string; content: string }) => void;
  onMultiProjectProcessed: (projectIdsToRemove: string[], downloadData: { fileName: string; content: string }) => void;
  isMultiProjectMode: boolean;
  showPreview: boolean;
}

const getFileIcon = (fileType: string) => {
  switch (fileType) {
    case 'java':
      return <FileCode className="w-3.5 h-3.5 mr-1.5 text-blue-500 shrink-0" />;
    case 'xml':
    case 'pom':
      return <Settings2 className="w-3.5 h-3.5 mr-1.5 text-orange-500 shrink-0" />;
    case 'sql':
      return <Database className="w-3.5 h-3.5 mr-1.5 text-indigo-500 shrink-0" />;
    case 'txt':
    case 'md':
    case 'properties':
    case 'csv':
    case 'yaml':
    case 'yml':
    case 'classpath':
    case 'project':
    case 'dat':
    default:
      return <FileText className="w-3.5 h-3.5 mr-1.5 text-gray-500 shrink-0" />;
  }
};


export function FileSelectionModal({
  isOpen,
  onClose,
  projectsToProcess,
  onSingleProjectProcessed,
  onMultiProjectProcessed,
  isMultiProjectMode,
  showPreview,
}: FileSelectionModalProps) {
  const [currentDisplayProjects, setCurrentDisplayProjects] = useState<ProjectFile[]>(projectsToProcess);
  const [unifiedPreview, setUnifiedPreview] = useState("");
  const [estimatedTokens, setEstimatedTokens] = useState(0);
  const { toast } = useToast();
  const [outputFileName, setOutputFileName] = useState("proyecto_unificado.txt");
  const [individualFilePreview, setIndividualFilePreview] = useState<{ name: string, content: string, fileType: string } | null>(null);
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0);

  useEffect(() => {
    setCurrentDisplayProjects(projectsToProcess);
    if (projectsToProcess.length > 0) {
        setCurrentProjectIndex(idx => Math.min(idx, projectsToProcess.length - 1));
    } else if (isOpen) { // If modal is open and projects become empty, parent should close it.
        // Parent component (JavaUnifierPage) handles closing the modal if projectsToProcess becomes empty.
    }
  }, [projectsToProcess, isOpen]);
  
  useEffect(() => {
    let fileName = "Proyectos_Unificados_unificado.txt";
    if (currentDisplayProjects.length > 0) {
      if (isMultiProjectMode) {
        fileName = (currentDisplayProjects.length > 1 ? "Proyectos_Unificados" : getProjectBaseName(currentDisplayProjects[0]?.name || "proyecto")) + "_unificado.txt";
      } else {
        fileName = getProjectBaseName(currentDisplayProjects[currentProjectIndex]?.name || "proyecto") + "_unificado.txt";
      }
    }
    setOutputFileName(fileName);
  }, [currentProjectIndex, isMultiProjectMode, currentDisplayProjects]);


  useEffect(() => {
    if (showPreview && currentDisplayProjects.length > 0) {
      const projectsForPreview = isMultiProjectMode ? currentDisplayProjects : (currentDisplayProjects[currentProjectIndex] ? [currentDisplayProjects[currentProjectIndex]] : []);
      const selectedProjectsForPreview = projectsForPreview.map(p => ({
        ...p,
        files: p.files.filter(f => f.selected) // Only include selected files in preview
      })).filter(p => p.files.length > 0);

      if (selectedProjectsForPreview.length === 0) {
        setUnifiedPreview("");
        setEstimatedTokens(0);
        return;
      }

      const content = unifyJavaFiles(selectedProjectsForPreview, isMultiProjectMode);
      setUnifiedPreview(content);
      const tokens = Math.ceil(content.length / 4);
      setEstimatedTokens(tokens);
    } else {
      setUnifiedPreview("");
      setEstimatedTokens(0);
    }
  }, [currentDisplayProjects, isMultiProjectMode, currentProjectIndex, showPreview]);

  const handleFileSelectionChange = (projectId: string, fileId: string, selected: boolean) => {
    setCurrentDisplayProjects(prevProjects =>
      prevProjects.map(proj =>
        proj.id === projectId
          ? {
              ...proj,
              files: proj.files.map(file =>
                file.id === fileId ? { ...file, selected } : file
              ),
            }
          : proj
      )
    );
  };

  const handleSelectAllInVisibleProjects = (selectAll: boolean) => {
    const targetProjectIds = isMultiProjectMode 
      ? currentDisplayProjects.map(p => p.id) 
      : (currentDisplayProjects[currentProjectIndex] ? [currentDisplayProjects[currentProjectIndex].id] : []);

    setCurrentDisplayProjects(prevProjects =>
      prevProjects.map(proj =>
        targetProjectIds.includes(proj.id)
          ? {
              ...proj,
              files: proj.files.map(file => ({ ...file, selected: selectAll })),
            }
          : proj
      )
    );
  };
  
  const handleSelectOnlyJavaInVisibleProjects = (selectJava: boolean) => {
    const targetProjectIds = isMultiProjectMode 
      ? currentDisplayProjects.map(p => p.id) 
      : (currentDisplayProjects[currentProjectIndex] ? [currentDisplayProjects[currentProjectIndex].id] : []);

    setCurrentDisplayProjects(prevProjects =>
        prevProjects.map(proj =>
          targetProjectIds.includes(proj.id)
            ? {
                ...proj,
                files: proj.files.map(file => ({
                ...file,
                selected: file.fileType === 'java' ? selectJava : (selectJava ? false : file.selected)
                })),
            }
            : proj
        )
    );
  };

  const handleConfirmAndSave = () => {
    let finalOutputFileName: string;
    let finalUnifiedContent: string;

    if (isMultiProjectMode) {
      const projectsToUnify = currentDisplayProjects.map(p => ({
        ...p,
        files: p.files.filter(f => f.selected)
      })).filter(p => p.files.length > 0);

      if (projectsToUnify.length === 0) {
        toast({ title: "Sin selección", description: "Por favor, selecciona al menos un archivo de algún proyecto.", variant: "destructive" });
        return;
      }
      finalUnifiedContent = unifyJavaFiles(projectsToUnify, true);
      finalOutputFileName = (projectsToUnify.length > 1 || !projectsToUnify[0] ? "Proyectos_Unificados" : getProjectBaseName(projectsToUnify[0].name)) + "_unificado.txt";
      const projectIdsProcessed = projectsToUnify.map(p => p.id);
      onMultiProjectProcessed(projectIdsProcessed, { fileName: finalOutputFileName, content: finalUnifiedContent });
    
    } else if (currentDisplayProjects[currentProjectIndex]) {
      const currentProjectForConfirm = currentDisplayProjects[currentProjectIndex];
      const selectedFiles = currentProjectForConfirm.files.filter(f => f.selected);

      if (selectedFiles.length === 0) {
        toast({ title: "Sin selección", description: "Por favor, selecciona al menos un archivo del proyecto actual.", variant: "destructive" });
        return;
      }
      finalUnifiedContent = unifyJavaFiles([{...currentProjectForConfirm, files: selectedFiles}], false);
      finalOutputFileName = getProjectBaseName(currentProjectForConfirm.name) + "_unificado.txt";
      onSingleProjectProcessed(currentProjectForConfirm.id, { fileName: finalOutputFileName, content: finalUnifiedContent });
    } else {
      toast({ title: "Error", description: "No hay proyecto seleccionado para unificar.", variant: "destructive" });
      return;
    }
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

  const projectsForListDisplay = useMemo(() => {
    if (isMultiProjectMode || !currentDisplayProjects[currentProjectIndex]) {
      return currentDisplayProjects;
    }
    return [currentDisplayProjects[currentProjectIndex]];
  }, [currentDisplayProjects, isMultiProjectMode, currentProjectIndex]);

  const organizedData: UnifiedData = useMemo(() => {
    return projectsForListDisplay.map(project => {
      const packageMap = new Map<string, ProcessedFile[]>();
      project.files.forEach(file => {
        const list = packageMap.get(file.packageName) || [];
        list.push(file);
        packageMap.set(file.packageName, list);
      });
      
      const packages: PackageGroup[] = Array.from(packageMap.entries())
        .sort(([pkgA], [pkgB]) => {
            if (pkgA === "(Default Package)") return -1;
            if (pkgB === "(Default Package)") return 1;
            if (pkgA === "(Other Project Files)" && pkgB !== "(Default Package)") return 1; // Other files last
            if (pkgB === "(Other Project Files)" && pkgA !== "(Default Package)") return -1;
            return pkgA.localeCompare(pkgB);
        })
        .map(([packageName, filesInPkg]) => ({
          packageName,
          files: filesInPkg.sort((a,b) => a.name.localeCompare(b.name)),
        }));
      
      return { projectName: project.name, projectActualId: project.id, packages };
    });
  }, [projectsForListDisplay]);


  if (!isOpen) return null;
  const currentSingleProjectNameForTitle = !isMultiProjectMode && currentDisplayProjects[currentProjectIndex] ? currentDisplayProjects[currentProjectIndex].name : (projectsToProcess[0]?.name || 'Proyecto');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 relative">
        {/* Navigation Arrows for Single Project Mode */}
        {!isMultiProjectMode && projectsToProcess.length > 1 && (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentProjectIndex(prev => Math.max(0, prev - 1))}
              disabled={currentProjectIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full shadow-md"
              title="Proyecto Anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentProjectIndex(prev => Math.min(projectsToProcess.length - 1, prev + 1))}
              disabled={currentProjectIndex === projectsToProcess.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full shadow-md"
              title="Siguiente Proyecto"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}
        
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>
            {isMultiProjectMode ? "Unificar Múltiples Proyectos" : `Seleccionar Archivos de: ${currentSingleProjectNameForTitle}`}
            {!isMultiProjectMode && projectsToProcess.length > 1 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({currentProjectIndex + 1} de {projectsToProcess.length})
                </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Selecciona los archivos que deseas incluir en el archivo unificado. Los archivos Java están seleccionados por defecto.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden p-6 pt-2">
          {/* Files Selection Panel */}
          <div className="flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-2 p-1 rounded-md bg-secondary flex-wrap gap-1">
              <Label className="font-semibold px-2">
                {isMultiProjectMode ? "Archivos de Proyectos" : `Archivos de: ${currentDisplayProjects[currentProjectIndex]?.name || 'Proyecto Actual'}`}
              </Label>
              <div className="space-x-1">
                <Button variant="ghost" size="sm" onClick={() => handleSelectOnlyJavaInVisibleProjects(true)} title="Seleccionar Solo Java">
                  <FileCode className="w-4 h-4 mr-1" /> Solo Java
                </Button>
                 <Button variant="ghost" size="sm" onClick={() => handleSelectAllInVisibleProjects(true)} title="Seleccionar Todo">
                  <CheckSquare className="w-4 h-4" /> Todo
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleSelectAllInVisibleProjects(false)} title="Deseleccionar Todo">
                  <Square className="w-4 h-4" /> Nada
                </Button>
              </div>
            </div>
            
            <ScrollArea className="flex-grow border rounded-md p-1">
              {organizedData.length === 0 && (
                  <p className="text-sm text-muted-foreground p-4 text-center">No hay archivos seleccionables en este proyecto o vista.</p>
              )}
              {organizedData.map(projectGroup => (
                <div key={projectGroup.projectName + projectGroup.projectActualId} className="mb-3">
                  {(isMultiProjectMode && projectsToProcess.length > 1) && (
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
                                id={`${projectGroup.projectActualId}-${file.id}`}
                                checked={file.selected}
                                onCheckedChange={(checked) => handleFileSelectionChange(projectGroup.projectActualId!, file.id, !!checked)}
                                className="mr-2 shrink-0"
                              />
                              {getFileIcon(file.fileType)}
                              <Label htmlFor={`${projectGroup.projectActualId}-${file.id}`} className="truncate cursor-pointer" title={file.name}>
                                {file.name}
                              </Label>
                            </div>
                            <Button variant="ghost" size="icon" className="w-6 h-6 shrink-0 opacity-50 group-hover:opacity-100" onClick={() => setIndividualFilePreview({name: file.name, content: file.content, fileType: file.fileType})}>
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
            <div className="flex items-center mb-2 p-1">
              <Label className="font-semibold">Vista Previa Unificada</Label>
              {showPreview && unifiedPreview.length > 0 && (
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-1.5 text-xs text-muted-foreground flex items-center cursor-default">
                        (~{estimatedTokens} tokens aprox.
                        <Info className="w-3 h-3 ml-1" />)
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs p-2">
                      <p className="text-xs">
                        Estimación basada en ~4 caracteres por token. El recuento real puede variar según el modelo de IA utilizado.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {showPreview ? (
              <Textarea
                value={unifiedPreview}
                readOnly
                className="flex-grow font-mono text-xs resize-none h-full bg-muted/50"
                placeholder="La vista previa del contenido unificado aparecerá aquí..."
              />
            ) : (
              <div className="flex-grow flex items-center justify-center border rounded-md bg-muted/50">
                <p className="text-muted-foreground text-sm">La vista previa está desactivada.</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 border-t mt-auto">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          {showPreview && <Button variant="secondary" onClick={handleCopyToClipboard}><Copy className="mr-2 h-4 w-4" /> Copiar Todo</Button>}
          <Button onClick={handleConfirmAndSave}><Download className="mr-2 h-4 w-4" /> Aceptar y Guardar</Button>
        </DialogFooter>
      </DialogContent>

      {individualFilePreview && (
         <Dialog open={!!individualFilePreview} onOpenChange={() => setIndividualFilePreview(null)}>
            <DialogContent className="max-w-2xl h-[70vh] flex flex-col">
                 <DialogHeader>
                    <DialogTitle className="flex items-center">
                      {getFileIcon(individualFilePreview.fileType)}
                      Vista Previa: {individualFilePreview.name}
                    </DialogTitle>
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

