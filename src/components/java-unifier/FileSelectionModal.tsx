// components/java-unifier/FileSelectionModal.tsx
"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import type { ProcessedFile, ProjectFile, PackageGroup, ProjectGroup, CommentOption } from '@/types/java-unifier';
import { unifyProjectFiles, getProjectBaseName, type ProjectType } from '@/lib/file-processor';
import { Copy, Download, Eye, CheckSquare, Square, FileText, FileCode, Database, Settings2, Info, ChevronLeft, ChevronRight, PlusCircle, Globe, Combine, Code, FileJson, FileKey, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ManualAddContentModal } from '@/components/java-unifier/ManualAddContentModal';
import { t, type Language, DEFAULT_PACKAGE_NAME_LOGIC, OTHER_FILES_PACKAGE_NAME_LOGIC } from '@/lib/translations';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


interface FileSelectionModalProps {
  isOpen: boolean;
  onClose: () => void; 
  projectsToProcess: ProjectFile[];
  onAddOtherTypeFile: (entry: FileSystemFileEntry, targetProjectId: string) => void;
  onSingleProjectProcessed: (projectId: string, downloadData: { fileName: string; content: string }) => void;
  onMultiProjectProcessed: (projectIdsToRemove: string[], downloadData: { fileName: string; content: string }) => void;
  isMultiProjectMode: boolean;
  showPreview: boolean;
  initialProjectIndex?: number;
  onProjectViewedIndexChange?: (index: number) => void;
  onManualFileRequested: (fileName: string, content: string, targetProjectId: string | 'new_project') => void;
  currentLanguage: Language;
  projectType: ProjectType;
}

const getFileIcon = (fileType: string) => {
  switch (fileType) {
    case 'java':
    case 'kt':
      return <FileCode className="w-3.5 h-3.5 mr-1.5 text-blue-500 shrink-0" />;
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'mjs':
    case 'cjs':
      return <Code className="w-3.5 h-3.5 mr-1.5 text-yellow-500 shrink-0" />;
    case 'html':
    case 'vue':
    case 'svelte':
       return <Globe className="w-3.5 h-3.5 mr-1.5 text-orange-600 shrink-0" />;
    case 'css':
    case 'scss':
    case 'less':
        return <Combine className="w-3.5 h-3.5 mr-1.5 text-purple-500 shrink-0" />;
    case 'json':
    case 'package.json':
    case 'tsconfig.json':
        return <FileJson className="w-3.5 h-3.5 mr-1.5 text-green-600 shrink-0" />;
    case 'env':
    case 'gitignore':
        return <FileKey className="w-3.5 h-3.5 mr-1.5 text-gray-500 shrink-0" />;
    case 'xml':
    case 'pom':
    case 'gradle':
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
  onAddOtherTypeFile,
  onSingleProjectProcessed,
  onMultiProjectProcessed,
  isMultiProjectMode,
  showPreview,
  initialProjectIndex = 0,
  onProjectViewedIndexChange,
  onManualFileRequested,
  currentLanguage,
  projectType,
}: FileSelectionModalProps) {
  const [currentDisplayProjects, setCurrentDisplayProjects] = useState<ProjectFile[]>(projectsToProcess);
  const [unifiedPreview, setUnifiedPreview] = useState("");
  const [estimatedTokens, setEstimatedTokens] = useState(0);
  const { toast } = useToast();
  const [individualFilePreview, setIndividualFilePreview] = useState<{ name: string, content: string, fileType: string } | null>(null);
  const [currentProjectIndex, setCurrentProjectIndex] = useState(initialProjectIndex);
  const [isManualAddModalOpen, setIsManualAddModalOpen] = useState(false);
  const [commentOption, setCommentOption] = useState<CommentOption>('default');

  useEffect(() => {
    setCurrentDisplayProjects(projectsToProcess);
    if (projectsToProcess.length > 0) {
      const newIndex = Math.min(currentProjectIndex, projectsToProcess.length - 1);
      if (newIndex !== currentProjectIndex) {
        setCurrentProjectIndex(newIndex);
      }
    }
  }, [projectsToProcess, isOpen, currentProjectIndex]);

  useEffect(() => {
    setCurrentProjectIndex(initialProjectIndex);
  }, [initialProjectIndex]);
  
  useEffect(() => {
    if (onProjectViewedIndexChange) {
      onProjectViewedIndexChange(currentProjectIndex);
    }
  }, [currentProjectIndex, onProjectViewedIndexChange]);

  useEffect(() => {
    if (showPreview && currentDisplayProjects.length > 0) {
      const projectsForPreview = isMultiProjectMode ? currentDisplayProjects : (currentDisplayProjects[currentProjectIndex] ? [currentDisplayProjects[currentProjectIndex]] : []);
      const selectedProjectsForPreview = projectsForPreview.map(p => ({
        ...p,
        files: p.files.filter(f => f.selected) 
      })).filter(p => p.files.length > 0);

      if (selectedProjectsForPreview.length === 0) {
        setUnifiedPreview("");
        setEstimatedTokens(0);
        return;
      }
      const content = unifyProjectFiles(selectedProjectsForPreview, isMultiProjectMode, commentOption); 
      setUnifiedPreview(content);
      const tokens = Math.max(0, Math.ceil(content.length / 4));
      setEstimatedTokens(tokens);
    } else {
      setUnifiedPreview("");
      setEstimatedTokens(0);
    }
  }, [currentDisplayProjects, isMultiProjectMode, currentProjectIndex, showPreview, commentOption]);

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

  const handleSelectAllInVisibleProjects = (selectAllFiles: boolean) => {
    const targetProjectIds = isMultiProjectMode 
      ? currentDisplayProjects.map(p => p.id) 
      : (currentDisplayProjects[currentProjectIndex] ? [currentDisplayProjects[currentProjectIndex].id] : []);

    setCurrentDisplayProjects(prevProjects =>
      prevProjects.map(proj =>
        targetProjectIds.includes(proj.id)
          ? {
              ...proj,
              files: proj.files.map(file => ({ ...file, selected: selectAllFiles })),
            }
          : proj
      )
    );
  };
  
  const handleSelectSpecificFiles = useCallback((extensions: string[]) => {
    const targetProjectIds = isMultiProjectMode 
      ? currentDisplayProjects.map(p => p.id) 
      : (currentDisplayProjects[currentProjectIndex] ? [currentDisplayProjects[currentProjectIndex].id] : []);

    setCurrentDisplayProjects(prevProjects =>
      prevProjects.map(proj =>
        targetProjectIds.includes(proj.id)
          ? {
              ...proj,
              files: proj.files.map(file => ({ ...file, selected: extensions.includes(file.fileType) })),
            }
          : proj
      )
    );
  }, [isMultiProjectMode, currentDisplayProjects, currentProjectIndex]);


  const handleConfirmAndSave = () => {
    let finalOutputFileName: string;
    let finalUnifiedContent: string;
    
    if (isMultiProjectMode) {
      const projectsToUnify = currentDisplayProjects.map(p => ({
        ...p,
        files: p.files.filter(f => f.selected)
      })).filter(p => p.files.length > 0);

      if (projectsToUnify.length === 0) {
        toast({ title: t('noSelection', currentLanguage), description: t('pleaseSelectOneFileFromAProject', currentLanguage), variant: "destructive" });
        return;
      }
      finalUnifiedContent = unifyProjectFiles(projectsToUnify, true, commentOption);
      const baseName = projectsToUnify.length > 1 || !projectsToUnify[0] 
        ? t('unifiedProjectsGenericName', currentLanguage).replace(/\s/g, '_') 
        : getProjectBaseName(projectsToUnify[0].name);
      finalOutputFileName = `${baseName}_unificado.txt`;
      
      const projectIdsProcessed = projectsToUnify.map(p => p.id);

      onMultiProjectProcessed(projectIdsProcessed, { fileName: finalOutputFileName, content: finalUnifiedContent });
    
    } else if (currentDisplayProjects[currentProjectIndex]) {
      const currentProjectForConfirm = currentDisplayProjects[currentProjectIndex];
      const selectedFiles = currentProjectForConfirm.files.filter(f => f.selected);

      if (selectedFiles.length === 0) {
        toast({ title: t('noSelection', currentLanguage), description: t('pleaseSelectOneFileFromCurrentProject', currentLanguage), variant: "destructive" });
        return;
      }
      finalUnifiedContent = unifyProjectFiles([{...currentProjectForConfirm, files: selectedFiles}], false, commentOption);
      finalOutputFileName = getProjectBaseName(currentProjectForConfirm.name) + "_unificado.txt";
      
      onSingleProjectProcessed(currentProjectForConfirm.id, { fileName: finalOutputFileName, content: finalUnifiedContent });
    } else {
      toast({ title: t('error', currentLanguage), description: t('noProjectToUnify', currentLanguage), variant: "destructive" });
      return;
    }
  };


  const handleCopyToClipboard = () => {
    if (!unifiedPreview) {
        toast({ title: t('emptyContent', currentLanguage), description: t('nothingToCopy', currentLanguage), variant: "destructive" });
        return;
    }
    navigator.clipboard.writeText(unifiedPreview)
      .then(() => toast({ title: t('copied', currentLanguage), description: t('unifiedContentCopied', currentLanguage) }))
      .catch(() => toast({ title: t('error', currentLanguage), description: t('couldNotCopyToClipboard', currentLanguage), variant: "destructive" }));
  };

  const projectsForListDisplay = useMemo(() => {
    if (isMultiProjectMode || !currentDisplayProjects[currentProjectIndex]) {
      return currentDisplayProjects;
    }
    return [currentDisplayProjects[currentProjectIndex]];
  }, [currentDisplayProjects, isMultiProjectMode, currentProjectIndex]);

  const organizedData: ProjectGroup[] = useMemo(() => { 
    return projectsForListDisplay.map(project => {
      const packageMap = new Map<string, ProcessedFile[]>();
      project.files.forEach(file => {
        const list = packageMap.get(file.packageName) || [];
        list.push(file);
        packageMap.set(file.packageName, list);
      });
      
      const packages: PackageGroup[] = Array.from(packageMap.entries())
        .sort(([pkgA], [pkgB]) => {
            if (pkgA === DEFAULT_PACKAGE_NAME_LOGIC) return -1;
            if (pkgB === DEFAULT_PACKAGE_NAME_LOGIC) return 1;
            if (pkgA === OTHER_FILES_PACKAGE_NAME_LOGIC && pkgB !== DEFAULT_PACKAGE_NAME_LOGIC) return 1; 
            if (pkgB === OTHER_FILES_PACKAGE_NAME_LOGIC && pkgA !== DEFAULT_PACKAGE_NAME_LOGIC) return -1;
            return pkgA.localeCompare(pkgB);
        })
        .map(([packageName, filesInPkg]) => ({
          packageName,
          files: filesInPkg.sort((a,b) => a.name.localeCompare(b.name)),
        }));
      
      return { projectName: project.name, projectActualId: project.id, packages, otherFiles: project.otherFiles };
    });
  }, [projectsForListDisplay]);

  const getDisplayPackageName = (packageNameConstant: string) => {
    if (packageNameConstant === DEFAULT_PACKAGE_NAME_LOGIC) {
      return t('defaultPackageNameDisplay', currentLanguage);
    }
    if (packageNameConstant === OTHER_FILES_PACKAGE_NAME_LOGIC) {
      return t('otherFilesPackageNameDisplay', currentLanguage);
    }
    return packageNameConstant;
  };


  const handleNextProject = useCallback(() => {
    setCurrentProjectIndex(prev => Math.min(projectsToProcess.length - 1, prev + 1));
  }, [projectsToProcess.length]);

  const handlePrevProject = useCallback(() => {
    setCurrentProjectIndex(prev => Math.max(0, prev - 1));
  }, []);

  const handleModalManualContentSubmit = (fileName: string, content: string, targetProjectId: string | 'new_project') => {
    onManualFileRequested(fileName, content, targetProjectId);
    setIsManualAddModalOpen(false); 
  };


  if (!isOpen) return null; 
  const currentSingleProjectNameForTitle = !isMultiProjectMode && currentDisplayProjects[currentProjectIndex] ? currentDisplayProjects[currentProjectIndex].name : (projectsToProcess[0]?.name || 'Proyecto');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!open) onClose(); }}>
      <DialogContent onInteractOutside={(e) => {
        if ((e.target as HTMLElement)?.closest('[data-toast-viewport="true"]')) {
          e.preventDefault();
        }
      }} className="max-w-4xl h-[90vh] flex flex-col p-0">
        {!isMultiProjectMode && projectsToProcess.length > 1 && (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevProject}
              disabled={currentProjectIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full shadow-md bg-background/80 hover:bg-background"
              title={t('previousProject', currentLanguage)} 
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextProject}
              disabled={currentProjectIndex === projectsToProcess.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full shadow-md bg-background/80 hover:bg-background"
              title={t('nextProject', currentLanguage)} 
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}
        
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>
            {isMultiProjectMode ? t('unifyMultipleProjectsTitle', currentLanguage) : t('selectFilesFromProjectTitle', currentLanguage, { projectName: currentSingleProjectNameForTitle })}
            {!isMultiProjectMode && projectsToProcess.length > 1 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                    {t('projectPageIndicator', currentLanguage, { currentIndex: currentProjectIndex + 1, totalProjects: projectsToProcess.length })}
                </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {projectsToProcess.length > 0 ? t('selectFilesModalDescription', currentLanguage) : t('onlyUnsupportedFilesDescription', currentLanguage) }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden p-6 pt-2">
          <div className="flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-2 p-1 rounded-md bg-secondary flex-wrap gap-1">
              <Label className="font-semibold px-2">
                {isMultiProjectMode ? t('projectFiles', currentLanguage) : t('filesFromProject', currentLanguage, { projectName: currentDisplayProjects[currentProjectIndex]?.name || t('currentProjectFallbackName', currentLanguage) })}
              </Label>
              <div className="space-x-1">
                 {projectType === 'java' && (
                    <Button variant="ghost" size="sm" onClick={() => handleSelectSpecificFiles(['java', 'kt'])} title={t('onlyJava', currentLanguage)}>
                        <FileCode className="w-4 h-4 text-blue-500" /> {t('onlyJava', currentLanguage)}
                    </Button>
                 )}
                 {projectType === 'web' && (
                    <Button variant="ghost" size="sm" onClick={() => handleSelectSpecificFiles(['html', 'css', 'scss', 'js', 'ts', 'jsx', 'tsx'])} title={t('onlyWebCore', currentLanguage)}>
                        <Globe className="w-4 h-4 text-orange-600" /> {t('onlyWebCore', currentLanguage)}
                    </Button>
                 )}
                <Button variant="ghost" size="sm" onClick={() => handleSelectAllInVisibleProjects(true)} title={t('selectAll', currentLanguage)}>
                  <CheckSquare className="w-4 h-4" /> {t('selectAll', currentLanguage)}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleSelectAllInVisibleProjects(false)} title={t('deselectAll', currentLanguage)}>
                  <Square className="w-4 h-4" /> {t('deselectAll', currentLanguage)}
                </Button>
              </div>
            </div>
            
            <ScrollArea className="flex-grow border rounded-md p-1">
              {organizedData.every(p => p.packages.length === 0 && (!p.otherFiles || p.otherFiles.length === 0)) && (
                  <p className="text-sm text-muted-foreground p-4 text-center">{t('noSelectableFiles', currentLanguage)}</p>
              )}

              {organizedData.map(projectGroup => (
                <div key={projectGroup.projectActualId} className="mb-3">
                  {(isMultiProjectMode && projectsToProcess.length > 1 && projectsForListDisplay.length > 1) && (
                    <h4 className="text-sm font-semibold p-2 bg-muted rounded-t-md sticky top-0 z-10">{projectGroup.projectName}</h4>
                  )}
                  
                  {projectGroup.packages.map(pkgGroup => (
                    <div key={pkgGroup.packageName} className="mb-2">
                       <p className="text-xs font-medium text-muted-foreground px-2 py-1">{getDisplayPackageName(pkgGroup.packageName)}</p>
                      <ul className="ml-2">
                        {pkgGroup.files.map(file => (
                          <li key={file.id} className="flex items-center justify-between text-sm py-0.5 px-1 rounded hover:bg-accent/50 group">
                            <div className="flex items-center flex-grow overflow-hidden">
                              <Checkbox
                                id={`${projectGroup.projectActualId}-${file.id}`}
                                checked={file.selected}
                                onCheckedChange={(checked) => handleFileSelectionChange(projectGroup.projectActualId, file.id, !!checked)}
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

                  {projectGroup.otherFiles && projectGroup.otherFiles.length > 0 && (
                     <div className="px-2 pt-1">
                        <Accordion type="single" collapsible>
                            <AccordionItem value="item-1">
                                <AccordionTrigger className="text-sm font-semibold hover:no-underline p-2 rounded-md hover:bg-secondary -mx-2">
                                    <div className="flex items-center text-yellow-600 dark:text-yellow-400">
                                        <AlertTriangle className="w-4 h-4 mr-2" />
                                        <span>{t('otherFileTypesFound', currentLanguage, { count: projectGroup.otherFiles.length })}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-2">
                                    <p className="text-xs text-muted-foreground px-2 pb-2">
                                      {t('otherFileTypesDescription', currentLanguage, { projectType: projectType })}
                                    </p>
                                    <ScrollArea className="max-h-[120px] p-1 -m-1">
                                        <div className="space-y-1 pr-2">
                                            {projectGroup.otherFiles.map(entry => (
                                                <div key={entry.fullPath} className="flex items-center justify-between text-sm py-0.5 px-1 rounded hover:bg-accent/50 group">
                                                    <span className="truncate flex-grow" title={entry.name}>{entry.name}</span>
                                                    <Button size="sm" variant="ghost" className="h-7" onClick={() => onAddOtherTypeFile(entry, projectGroup.projectActualId)}>
                                                        {t('add', currentLanguage)}
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                  )}
                </div>
              ))}
            </ScrollArea>

            <div className="pt-2 text-center border-t mt-2">
                <Button variant="outline" size="sm" onClick={() => setIsManualAddModalOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> {t('addManually', currentLanguage)}
                </Button>
            </div>
          </div>

          <div className="flex flex-col overflow-hidden">
            <div className="flex items-center mb-2 p-1">
              <Label className="font-semibold">{t('unifiedPreview', currentLanguage)}</Label>
              {showPreview && unifiedPreview.length > 0 && (
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-1.5 text-xs text-muted-foreground flex items-center cursor-default">
                        {t('approxTokens', currentLanguage, { tokenCount: new Intl.NumberFormat(currentLanguage === 'es' ? 'es-ES' : 'en-US').format(estimatedTokens) })}
                        <Info className="w-3 h-3 ml-1" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs p-2">
                      <p className="text-xs">
                        {t('tokenEstimationTooltip', currentLanguage)}
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
                placeholder={t('previewDeactivatedPlaceholder', currentLanguage)} 
              />
            ) : (
              <div className="flex-grow flex items-center justify-center border rounded-md bg-muted/50">
                <p className="text-muted-foreground text-sm">{t('previewDeactivated', currentLanguage)}</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-6 pt-4 border-t mt-auto flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div className="w-full md:w-auto">
            <Label htmlFor="comment-options" className="text-xs text-muted-foreground">{t('commentHandling', currentLanguage)}</Label>
            <Select value={commentOption} onValueChange={(value: CommentOption) => setCommentOption(value)}>
              <SelectTrigger id="comment-options" className="w-full md:w-[320px] mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">{t('commentHandlingDefault', currentLanguage)}</SelectItem>
                <SelectItem value="noAppComments">{t('commentHandlingNoIdentifiers', currentLanguage)}</SelectItem>
                <SelectItem value="removePastAppComments">{t('commentHandlingRemovePast', currentLanguage)}</SelectItem>
                <SelectItem value="removeAllComments">{t('commentHandlingRemoveAll', currentLanguage)}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex space-x-2 self-end w-full md:w-auto justify-end">
            <Button variant="outline" onClick={onClose}>{t('cancel', currentLanguage)}</Button>
            {showPreview && <Button variant="secondary" onClick={handleCopyToClipboard}><Copy className="mr-2 h-4 w-4" /> {t('copyAll', currentLanguage)}</Button>}
            <Button onClick={handleConfirmAndSave}><Download className="mr-2 h-4 w-4" /> {t('acceptAndSave', currentLanguage)}</Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {individualFilePreview && (
         <Dialog open={!!individualFilePreview} onOpenChange={() => setIndividualFilePreview(null)}>
            <DialogContent className="max-w-2xl h-[70vh] flex flex-col">
                 <DialogHeader>
                    <DialogTitle className="flex items-center">
                      {getFileIcon(individualFilePreview.fileType)}
                      {t('previewFileTitle', currentLanguage, { fileName: individualFilePreview.name })}
                    </DialogTitle>
                 </DialogHeader>
                 <ScrollArea className="flex-grow border rounded-md my-4">
                    <pre className="text-xs p-4 font-mono whitespace-pre-wrap break-all">{individualFilePreview.content}</pre>
                 </ScrollArea>
                 <DialogFooter>
                     <Button variant="secondary" onClick={() => {
                         navigator.clipboard.writeText(individualFilePreview.content)
                           .then(() => toast({ title: t('copied', currentLanguage), description: t('fileContentCopied', currentLanguage, { fileName: individualFilePreview.name }) }))
                           .catch(() => toast({ title: t('error', currentLanguage), description: t('couldNotCopyToClipboard', currentLanguage), variant: "destructive" }));
                     }}><Copy className="mr-2 h-4 w-4" /> {t('copy', currentLanguage)}</Button>
                    <DialogClose asChild>
                        <Button>{t('close', currentLanguage)}</Button>
                    </DialogClose>
                 </DialogFooter>
            </DialogContent>
         </Dialog>
      )}
      {isManualAddModalOpen && (
        <ManualAddContentModal
          isOpen={isManualAddModalOpen}
          onClose={() => setIsManualAddModalOpen(false)}
          onAddContent={handleModalManualContentSubmit}
          existingProjects={projectsForListDisplay}
          currentProjectNameInSingleView={!isMultiProjectMode && currentDisplayProjects[currentProjectIndex] ? currentDisplayProjects[currentProjectIndex].name : undefined}
          isMultiProjectMode={isMultiProjectMode}
          currentLanguage={currentLanguage}
        />
      )}
    </Dialog>
  );
}
