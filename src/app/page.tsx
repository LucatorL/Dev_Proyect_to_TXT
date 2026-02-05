
// app/page.tsx
"use client"

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { HeaderControls } from '@/components/java-unifier/HeaderControls';
import { FileDropzone } from '@/components/java-unifier/FileDropzone';
import { RecentFilesList } from '@/components/java-unifier/RecentFilesList';
import { FileSelectionModal } from '@/components/java-unifier/FileSelectionModal';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { ProjectFile, RecentEntry, ProcessedFile } from '@/types/java-unifier';
import { processDroppedItems, unifyProjectFiles, downloadTextFile, getProjectBaseName, getFileExtension, extractJavaPackageName, type ProjectType, PROJECT_CONFIG } from '@/lib/file-processor';
import { DEFAULT_PACKAGE_NAME_LOGIC, OTHER_FILES_PACKAGE_NAME_LOGIC, t, type Language } from '@/lib/translations';
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Github } from 'lucide-react';


const MAX_RECENTS = 5; 
const APP_VERSION = "0.2.0"; 

export default function DevProjectUnifierPage() {
  const [recents, setRecents] = useLocalStorage<RecentEntry[]>('dev-project-unifier-recents', []);
  const [language, setLanguage] = useLocalStorage<Language>('dev-project-unifier-language', 'es');
  const [projectType, setProjectType] = useLocalStorage<ProjectType>('dev-project-type', 'java');
  
  const [processedProjects, setProcessedProjects] = useState<ProjectFile[]>([]);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  
  const [isRecentInfoModalOpen, setIsRecentInfoModalOpen] = useState(false);
  const [selectedRecentForInfoModal, setSelectedRecentForInfoModal] = useState<RecentEntry | null>(null);
  const [isPreviewEnabled, setIsPreviewEnabled] = useState(true);
  const [isMultiProjectMode, setIsMultiProjectMode] = useState(true); 
  const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);
  const [currentProjectIndexInModal, setCurrentProjectIndexInModal] = useState(0);

  const { toast } = useToast();

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t('appTitle', language);
  }, [language]);

  useEffect(() => {
    if (isSelectionModalOpen && processedProjects.length === 0) {
      setIsSelectionModalOpen(false);
    }
  }, [processedProjects, isSelectionModalOpen]);

  const addRecentEntry = useCallback((project: ProjectFile | RecentEntry, customName?: string) => {
    setRecents(prevRecents => {
      const newEntry: RecentEntry = { 
        id: project.id, 
        name: customName || project.name, 
        timestamp: Date.now(), 
        type: 'type' in project ? project.type : 'folder' 
      };
      const filteredRecents = prevRecents.filter(r => r.id !== newEntry.id);
      const updatedRecents = [newEntry, ...filteredRecents].slice(0, MAX_RECENTS);
      return updatedRecents;
    });
  }, [setRecents]);

  const removeRecentEntry = useCallback((id: string) => {
    setRecents(prevRecents => prevRecents.filter(r => r.id !== id));
    toast({ title: t('successToastTitle', language), description: t('entryDeletedFromHistoryToast', language) });
  }, [setRecents, toast, language]);

  const handleFilesDropped = async (droppedItems: FileSystemFileEntry[]) => {
    if (droppedItems.length === 0) return;

    try {
      const projects = await processDroppedItems(droppedItems, projectType);
      if (projects.length === 0 || projects.every(p => p.files.length === 0)) {
        toast({
          title: t('noSupportedFilesFoundToastTitle', language),
          description: t('noSupportedFilesFoundToastDescription', language, { projectType, extensions: PROJECT_CONFIG[projectType].extensions.join(', ') }),
          variant: "default",
        });
        return;
      }
      
      setProcessedProjects(projects); 
      
      projects.forEach(proj => {
        if(proj.files.length > 0) addRecentEntry(proj);
      });
      
      setCurrentProjectIndexInModal(0); 
      
      if (projects.length > 0) {
        setIsSelectionModalOpen(true); 
      }

    } catch (error) {
      console.error("Error processing files:", error);
      toast({
        title: t('processingErrorToastTitle', language),
        description: t('processingErrorToastDescription', language),
        variant: "destructive",
      });
    }
  };
  
  const handleSelectionModalClose = useCallback(() => {
    setIsSelectionModalOpen(false); 

    if (isMultiProjectMode || processedProjects.length <= 1) {
        setProcessedProjects([]);
    } else {
      if (processedProjects[currentProjectIndexInModal]) {
        const projectToRemoveId = processedProjects[currentProjectIndexInModal].id;
        const updatedProjects = processedProjects.filter(p => p.id !== projectToRemoveId);
        setProcessedProjects(updatedProjects);
        
        if (updatedProjects.length > 0) {
          setCurrentProjectIndexInModal(prevIndex => Math.max(0, Math.min(prevIndex, updatedProjects.length - 1)));
          setIsSelectionModalOpen(true); 
        } else {
          setProcessedProjects([]);
        }
      } else {
        setProcessedProjects([]); 
      }
    }
  }, [isMultiProjectMode, processedProjects, currentProjectIndexInModal, setProcessedProjects, setIsSelectionModalOpen, setCurrentProjectIndexInModal]);


  const handleSingleProjectProcessed = (projectId: string, downloadData: { fileName: string; content: string }) => {
    downloadTextFile(downloadData.fileName, downloadData.content);
    const projectThatWasProcessed = processedProjects.find(p => p.id === projectId);
    if (projectThatWasProcessed) {
        addRecentEntry(projectThatWasProcessed); 
    }

    const updatedProjects = processedProjects.filter(p => p.id !== projectId);
    setProcessedProjects(updatedProjects); 
    
    setCurrentProjectIndexInModal(idx => Math.max(0, Math.min(idx, updatedProjects.length - 1)));
    
    toast({ 
      title: t('successToastTitle', language), 
      description: t('projectProcessedAndDownloadedToast', language, { projectName: getProjectBaseName(downloadData.fileName.replace('_unificado.txt', '')) }) 
    });

    if (updatedProjects.length === 0) {
        setIsSelectionModalOpen(false);
    } else {
      setIsSelectionModalOpen(true); // Keep modal open if other projects remain
    }
  };

  const handleMultiProjectProcessed = (projectIdsProcessed: string[], downloadData: { fileName: string; content: string }) => {
    downloadTextFile(downloadData.fileName, downloadData.content);

    const projectsThatWereProcessed = processedProjects.filter(p => projectIdsProcessed.includes(p.id));
    let recentName = t('unifiedProjectsGenericName', language);
    if (projectsThatWereProcessed.length > 0) {
        const names = projectsThatWereProcessed.map(p => p.name).slice(0,3);
        recentName = `${t('projectUnifiedNamePrefix', language)}${names.join(', ')}${projectsThatWereProcessed.length > 3 ? t('projectUnifiedNameSuffixOthers', language) : ''}`;
    } else if (downloadData.fileName) {
        recentName = getProjectBaseName(downloadData.fileName.replace('_unificado.txt', '')) || t('unifiedProjectsGenericName', language);
    }

    const unifiedRecentEntry: RecentEntry = {
        id: `unified-${Date.now()}-${Math.random()}`,
        name: recentName,
        timestamp: Date.now(),
        type: 'folder', 
    };
    addRecentEntry(unifiedRecentEntry, recentName); 
    
    setProcessedProjects(prev => prev.filter(p => !projectIdsProcessed.includes(p.id)));
    
    toast({ title: t('successToastTitle', language), description: t('fileDownloadedToast', language, { fileName: downloadData.fileName }) });
    setIsSelectionModalOpen(false); 
  };

  const handleManualContentAddRequested = (fileName: string, content: string, targetProjectId: string | 'new_project') => {
    if (!fileName.trim() || !content.trim()) {
      toast({ title: t('error', language), description: t('fileNameEmptyError', language), variant: "destructive" });
      return;
    }

    const fileType = getFileExtension(fileName);
    let packageName = fileType === 'java' ? extractJavaPackageName(content) : OTHER_FILES_PACKAGE_NAME_LOGIC;
    if (packageName === '' && fileType === 'java') packageName = DEFAULT_PACKAGE_NAME_LOGIC;

    const uniqueFileId = `manual-file-${Date.now()}-${Math.random()}`;

    if (targetProjectId !== 'new_project' && processedProjects.some(p => p.id === targetProjectId)) {
        setProcessedProjects(prevProjects => 
            prevProjects.map(proj => {
                if (proj.id === targetProjectId) {
                    const newFile: ProcessedFile = {
                        id: uniqueFileId,
                        path: fileName, 
                        name: fileName,
                        content,
                        packageName,
                        fileType,
                        projectName: proj.name, 
                        selected: PROJECT_CONFIG[projectType].defaultSelected.includes(fileType),
                    };
                    const updatedProject = { ...proj, files: [...proj.files, newFile], timestamp: Date.now() };
                    addRecentEntry(updatedProject);
                    toast({ title: t('fileAddedToastTitle', language), description: t('fileXAddedToYToast', language, { fileName, projectName: proj.name }) });
                    return updatedProject;
                }
                return proj;
            })
        );
    } else {
        const newProjectName = `Manual: ${getProjectBaseName(fileName) || 'Archivo'}`;
        const newFile: ProcessedFile = {
            id: uniqueFileId,
            path: fileName,
            name: fileName,
            content,
            packageName,
            fileType,
            projectName: newProjectName,
            selected: PROJECT_CONFIG[projectType].defaultSelected.includes(fileType),
        };
        const newProject: ProjectFile = {
            id: `manual-project-${Date.now()}-${Math.random()}`,
            name: newProjectName,
            type: 'file', 
            files: [newFile],
            timestamp: Date.now(),
        };

        setProcessedProjects(prevProjects => [...prevProjects, newProject]);
        addRecentEntry(newProject); 
        
        if (!isSelectionModalOpen || (processedProjects.length === 0 && !isMultiProjectMode)) {
            setCurrentProjectIndexInModal(processedProjects.length); // Go to new project if modal wasn't open or was empty
            setIsSelectionModalOpen(true);
        } else if (!isMultiProjectMode) {
             setCurrentProjectIndexInModal(processedProjects.length); // Go to the new project
        }
        toast({ title: t('fileAddedToastTitle', language), description: t('fileXAddedAsNewProjectToast', language, { fileName }) });
    }
  };

  const handleAddFileManuallyWrapper = useCallback((fileName: string, content: string) => {
    handleManualContentAddRequested(fileName, content, 'new_project');
  }, [language, isMultiProjectMode, processedProjects, isSelectionModalOpen]);


  const handleSelectRecent = (recent: RecentEntry) => {
    setSelectedRecentForInfoModal(recent);
    setIsRecentInfoModalOpen(true);
  };

  const handleVersionClick = () => {
    setIsChangelogModalOpen(true);
  };

  const changelogContent = `
    <ul class="list-disc pl-5 space-y-2 text-sm">
      <li>
        Versión ${APP_VERSION} (Dev_Proyect_to_TXT)
        <ul class="list-disc pl-5 space-y-1 mt-1">
          <li>¡Gran Actualización! La aplicación ahora se llama <strong>Dev_Proyect_to_TXT</strong>.</li>
          <li><strong>Selector de Tipo de Proyecto:</strong> Se ha añadido un selector en la cabecera para elegir entre proyectos de tipo 'Java', 'Web', o 'Total'.</li>
          <li><strong>Soporte Extendido de Archivos:</strong>
            <ul class="list-disc pl-5">
               <li>El tipo 'Java' se centra en archivos de ecosistema Java (.java, .xml, .properties, .gradle, etc.).</li>
               <li>El tipo 'Web' se centra en archivos de desarrollo web (.html, .css, .js, .ts, .jsx, .tsx, .json, etc.).</li>
               <li>El tipo 'Total' reconoce una amplia gama de archivos de desarrollo para una unificación completa.</li>
            </ul>
          </li>
          <li><strong>Selección por Defecto Inteligente:</strong> Los archivos primarios del tipo de proyecto seleccionado (ej: .java para Java, .js/.ts para Web) se seleccionan automáticamente en el modal.</li>
          <li><strong>Agrupación Mejorada:</strong> Los archivos de proyectos 'Web' y 'Total' ahora se agrupan por su ruta de directorio en el modal de selección para una mejor organización.</li>
          <li>Actualizada toda la interfaz y los textos para reflejar el nuevo enfoque multi-proyecto.</li>
        </ul>
      </li>
      <li>
        Versión 0.1.7 (UI Traducida)
        <ul class="list-disc pl-5 space-y-1 mt-1">
          <li>Internacionalización: Interfaz de usuario ahora disponible en Inglés y Español.</li>
          <li>Selector de idioma movido a la cabecera.</li>
          <li>Adición Manual de Archivos Mejorada.</li>
          <li>Historial de Procesados Más Descriptivo.</li>
        </ul>
      </li>
       <li>
        Versiones Anteriores (0.1.0 - 0.1.6)
        <ul class="list-disc pl-5 space-y-1 mt-1">
          <li>Funcionalidades iniciales de unificación de archivos Java, modo multi-proyecto, vista previa, historial, temas y corrección de errores.</li>
        </ul>
      </li>
    </ul>
  `;


  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <HeaderControls 
        previewEnabled={isPreviewEnabled}
        onPreviewToggle={(checked) => setIsPreviewEnabled(!!checked)}
        multiProjectModeEnabled={isMultiProjectMode}
        onMultiProjectModeToggle={(checked) => setIsMultiProjectMode(!!checked)}
        appVersion={APP_VERSION}
        onVersionClick={handleVersionClick}
        currentLanguage={language}
        onLanguageChange={setLanguage}
        projectType={projectType}
        onProjectTypeChange={setProjectType}
      />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <FileDropzone 
          onFilesProcessed={handleFilesDropped} 
          currentLanguage={language} 
          projectType={projectType} 
          onAddFileManually={handleAddFileManuallyWrapper}
        />
        <RecentFilesList 
            recents={recents} 
            onSelectRecent={handleSelectRecent}
            onRemoveRecent={removeRecentEntry}
            currentLanguage={language}
        />
      </main>
      {isSelectionModalOpen && processedProjects.length > 0 && (
        <FileSelectionModal
          key={processedProjects.map(p => p.id).join('-') + `-${currentProjectIndexInModal}-${isMultiProjectMode}-${language}`} 
          isOpen={isSelectionModalOpen}
          onClose={handleSelectionModalClose} 
          projectsToProcess={processedProjects}
          onSingleProjectProcessed={handleSingleProjectProcessed}
          onMultiProjectProcessed={handleMultiProjectProcessed}
          isMultiProjectMode={isMultiProjectMode}
          showPreview={isPreviewEnabled}
          initialProjectIndex={currentProjectIndexInModal}
          onProjectViewedIndexChange={setCurrentProjectIndexInModal}
          onManualFileRequested={handleManualContentAddRequested} 
          currentLanguage={language}
          projectType={projectType}
        />
      )}
      {selectedRecentForInfoModal && (
         <AlertDialog open={isRecentInfoModalOpen} onOpenChange={setIsRecentInfoModalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('recentInfoModalTitle', language, { recentName: selectedRecentForInfoModal.name })}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('recentInfoModalDescription1', language)}
                <br /><br />
                {t('recentInfoModalType', language, { type: selectedRecentForInfoModal.type === 'folder' ? t('folderUnificationType', language) : t('individualFileType', language) })}
                <br />
                {t('recentInfoModalProcessedOn', language, { timestamp: new Date(selectedRecentForInfoModal.timestamp).toLocaleString(language) })}
                <br /><br />
                {t('recentInfoModalSecurity', language)}
                <br /><br />
                {t('recentInfoModalReprocess', language, { recentName: selectedRecentForInfoModal.name })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setIsRecentInfoModalOpen(false)}>{t('understood', language)}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {isChangelogModalOpen && (
        <AlertDialog open={isChangelogModalOpen} onOpenChange={setIsChangelogModalOpen}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>{t('versionNewsTitle', language, { version: APP_VERSION })}</AlertDialogTitle>
              <AlertDialogDescription asChild>
                 <div className="max-h-[60vh] overflow-y-auto pr-2 mt-2" dangerouslySetInnerHTML={{ __html: changelogContent }} />
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setIsChangelogModalOpen(false)}>{t('close', language)}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <footer className="text-center p-4 border-t text-sm text-muted-foreground flex flex-col sm:flex-row justify-between items-center">
        <span className="flex items-center">
          {t('footerAdaptedFrom', language)}&nbsp;
          <a
            href="https://github.com/LucatorL/JavaSourceToTxt"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {t('originalApplicationLinkText', language)}
          </a>
          &nbsp;{t('byText', language)}&nbsp;
          <a 
            href="https://github.com/LucatorL" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center text-primary hover:underline"
          >
            <Image 
              src="https://github.com/LucatorL.png" 
              alt={t('lucasProfileText', language)}
              width={24} 
              height={24} 
              className="rounded-full mr-1.5 ml-0.5"
              data-ai-hint="github profile"
            />
            {t('lucasProfileText', language)}
          </a>.
        </span>
        <Button variant="link" asChild className="mt-2 sm:mt-0 text-muted-foreground hover:text-primary">
          <a href="https://github.com/LucatorL/JavaSourceToTxt-WEB-/issues" target="_blank" rel="noopener noreferrer">
            <Github className="mr-2 h-4 w-4" />
            {t('reportIssueLinkText', language)}
          </a>
        </Button>
      </footer>
    </div>
  );
}

    