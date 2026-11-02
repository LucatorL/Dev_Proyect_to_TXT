// app/page.tsx
"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { HeaderControls } from '@/components/java-unifier/HeaderControls';
import { PageDots } from '@/components/java-unifier/PageDots';
import { FileDropzone } from '@/components/java-unifier/FileDropzone';
import { RecentFilesList } from '@/components/java-unifier/RecentFilesList';
import { UnificationBoard } from '@/components/java-unifier/UnificationBoard';
import { FileSelectionModal } from '@/components/java-unifier/FileSelectionModal';
import useLocalStorage from '@/hooks/useLocalStorage';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import useSettings from '@/hooks/useSettings';
import type { ProjectFile, RecentEntry, ProcessedFile } from '@/types/java-unifier';
import { processDroppedItems, downloadTextFile, getProjectBaseName, getFileExtension, type ProjectType, type DroppedItem, type SourceFileEntry, type ImportIssue, PROJECT_CONFIG, readFileContent, parseFileMeta } from '@/lib/file-processor';
import { t, type Language } from '@/lib/translations';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bug, Lightbulb } from 'lucide-react';
import { deleteSourceHandles, loadSourceHandles, requestSourcePermission, saveSourceHandles } from '@/lib/local-sources';


const MAX_RECENTS = 5; 
const APP_VERSION = "0.2.20";
const REPOSITORY_URL = "https://github.com/LucatorL/Dev_Proyect_to_TXT";

function suggestedAuthor(projects: ProjectFile[]): string | undefined {
  const names = projects.flatMap(project => project.files.filter(file => file.name.toLowerCase() === 'package.json' &&
    !file.path.replace(/\\/g, '/').split('/').includes('node_modules')).map(file => {
      try {
        const author = (JSON.parse(file.content) as { author?: string | { name?: string } }).author;
        const name = typeof author === 'string' ? author : author?.name;
        return typeof name === 'string' ? name.replace(/<[^>]*>|\([^)]*\)/g, '').trim() : '';
      } catch { return ''; }
    })).filter(name => name.length > 1 && name.length < 80);
  return [...new Set(names)].length === 1 ? names[0] : undefined;
}

export default function DevProjectUnifierPage() {
  const [recents, setRecents] = useLocalStorage<RecentEntry[]>('dev-project-unifier-recents', []);
  const leaderboard = useLeaderboard();
  const [language, setLanguage] = useLocalStorage<Language>('dev-project-unifier-language', 'es');
  const { settings, updateSettings } = useSettings();
  
  const [importIssues, setImportIssues] = useState<ImportIssue[]>([]);
  const [processedProjects, setProcessedProjects] = useState<ProjectFile[]>([]);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  
  const [isRecentInfoModalOpen, setIsRecentInfoModalOpen] = useState(false);
  const [selectedRecentForInfoModal, setSelectedRecentForInfoModal] = useState<RecentEntry | null>(null);
  const [isPreviewEnabled, setIsPreviewEnabled] = useState(true);
  const [isMultiProjectMode, setIsMultiProjectMode] = useState(true); 
  const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentProjectIndexInModal, setCurrentProjectIndexInModal] = useState(0);
  const localSources = useRef(new Map<string, FileSystemHandle[]>());
  const countedUnifications = useRef(new Set<string>());

  const { toast } = useToast();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t('appTitle', language);
  }, [language]);

  useEffect(() => {
    let active = true;
    recents.filter(recent => recent.reopenable).forEach(recent => {
      void loadSourceHandles(recent.id).then(handles => {
        if (active && handles?.length) localSources.current.set(recent.id, handles);
      }).catch(() => {});
    });
    return () => { active = false; };
  }, [recents]);

  useEffect(() => {
    if (isSelectionModalOpen && processedProjects.length === 0) {
      setIsSelectionModalOpen(false);
    }
  }, [processedProjects, isSelectionModalOpen]);

  useEffect(() => {
    if (isHydrated && settings.lastSeenVersion !== APP_VERSION) {
      setIsChangelogModalOpen(true);
      updateSettings({ lastSeenVersion: APP_VERSION });
    }
  }, [isHydrated, settings.lastSeenVersion, updateSettings]);

  const handleProjectTypeChange = (newProjectType: ProjectType) => {
    updateSettings({ lastProjectType: newProjectType });
  };

  const addRecentEntry = useCallback(async (project: ProjectFile | RecentEntry, customName?: string, handles?: FileSystemHandle[]) => {
    const sources = handles ?? ('sourceHandle' in project && project.sourceHandle ? [project.sourceHandle] : []);
    let reopenable = false;
    if (sources.length) {
      try {
        await saveSourceHandles(project.id, sources);
        localSources.current.set(project.id, sources);
        reopenable = true;
      } catch (error) { console.warn('Could not remember access to local files', error); }
    }
    setRecents(prevRecents => {
      const newEntry: RecentEntry = { 
        id: project.id, 
        name: customName || project.name, 
        timestamp: Date.now(), 
        type: project.type,
        reopenable: reopenable || prevRecents.some(recent => recent.id === project.id && recent.reopenable),
      };
      const filteredRecents = prevRecents.filter(r => r.id !== newEntry.id);
      const updatedRecents = [newEntry, ...filteredRecents].slice(0, MAX_RECENTS);
      filteredRecents.slice(MAX_RECENTS - 1).forEach(recent => {
        localSources.current.delete(recent.id);
        void deleteSourceHandles(recent.id).catch(() => {});
      });
      return updatedRecents;
    });
  }, [setRecents]);

  const removeRecentEntry = useCallback((id: string) => {
    setRecents(prevRecents => prevRecents.filter(r => r.id !== id));
    localSources.current.delete(id);
    void deleteSourceHandles(id).catch(() => {});
    toast({ title: t('successToastTitle', language), description: t('entryDeletedFromHistoryToast', language) });
  }, [setRecents, toast, language]);

  const handleManualContentAddRequested = useCallback((fileName: string, content: string, targetProjectId: string | 'new_project') => {
    if (!fileName.trim() || !content.trim()) {
      toast({ title: t('error', language), description: t('fileNameEmptyError', language), variant: "destructive" });
      return;
    }
    const target = processedProjects.find(project => project.id === targetProjectId);
    const name = target?.name ?? `Manual: ${getProjectBaseName(fileName)}`;
    const fileType = getFileExtension(fileName);
    const file: ProcessedFile = {
      id: crypto.randomUUID(), name: fileName, content, fileType, projectName: name, selected: true,
      ...parseFileMeta(fileName, content, fileType, settings.lastProjectType),
    };
    if (target) {
      setProcessedProjects(previous => previous.map(project => project.id === target.id
        ? { ...project, files: [...project.files, file], timestamp: Date.now() } : project));
      void addRecentEntry(target);
      toast({ title: t('fileAddedToastTitle', language), description: t('fileXAddedToYToast', language, { fileName, projectName: name }) });
    } else {
      const project: ProjectFile = { id: crypto.randomUUID(), name, type: 'file', timestamp: Date.now(), files: [file] };
      setProcessedProjects(previous => [...previous, project]);
      void addRecentEntry(project);
      setCurrentProjectIndexInModal(processedProjects.length);
      setIsSelectionModalOpen(true);
      toast({ title: t('fileAddedToastTitle', language), description: t('fileXAddedAsNewProjectToast', language, { fileName }) });
    }
  }, [processedProjects, settings.lastProjectType, addRecentEntry, toast, language]);

  const handleAddOtherTypeFile = useCallback((entry: SourceFileEntry, targetProjectId: string) => {
    if (!entry.isFile) return;

    const addFileToState = (file: File, content: string) => {
        const fileName = file.name;
        const fileType = getFileExtension(fileName);

        setProcessedProjects(prevProjects => {
            return prevProjects.map(proj => {
                if (proj.id === targetProjectId && proj.otherFiles?.some(item => item.fullPath === entry.fullPath)) {
                    const newFile: ProcessedFile = {
                        id: `manual-file-${Date.now()}-${Math.random()}`,
                        ...parseFileMeta(entry.fullPath.replace(/^\//, ''), content, fileType, settings.lastProjectType),
                        name: fileName,
                        content,
                        fileType,
                        projectName: proj.name,
                        selected: true,
                    };

                    const updatedOtherFiles = proj.otherFiles?.filter(f => f.fullPath !== entry.fullPath);

                    return { ...proj, files: [...proj.files, newFile], otherFiles: updatedOtherFiles };
                }
                return proj;
            });
        });
    };

    entry.file(
        (file) => {
            readFileContent(file)
                .then(content => addFileToState(file, content))
                .catch(error => {
                    console.error("Error reading file to add anyway:", error);
                    toast({
                        title: t('processingErrorToastTitle', language),
                        description: t('processingErrorToastDescriptionShort', language, { fileName: entry.name }),
                        variant: "destructive",
                    });
                });
        },
        (error) => {
            console.error("Error getting file from entry:", error);
            toast({
                title: t('processingErrorToastTitle', language),
                description: t('processingErrorToastDescriptionShort', language, { fileName: entry.name }),
                variant: "destructive",
            });
        }
    );
  }, [settings.lastProjectType, toast, language]);


  const handleFilesDropped = async (droppedItems: DroppedItem[], recentToReopen?: RecentEntry) => {
    if (droppedItems.length === 0) return;

    setProcessedProjects([]);
    setImportIssues([]);

    try {
      const { projects, issues } = await processDroppedItems(droppedItems, settings.lastProjectType);

      setImportIssues(issues);
      const totalFileCount = projects.reduce((acc, p) => acc + p.files.length + (p.otherFiles?.length || 0), 0);

      if (totalFileCount === 0) {
        toast({
          title: recentToReopen ? t('historyReopenError', language) : t('noSupportedFilesFoundToastTitle', language),
          description: t('noSupportedFilesFoundToastDescription', language, { projectType: settings.lastProjectType, extensions: PROJECT_CONFIG[settings.lastProjectType].extensions.join(', ') }),
          variant: "default",
        });
        if (recentToReopen) {
          setSelectedRecentForInfoModal(recentToReopen);
          setIsRecentInfoModalOpen(true);
        }
        return;
      }
      
      const validProjects = projects.filter(p => p.files.length > 0 || (p.otherFiles && p.otherFiles.length > 0));

      if (validProjects.length > 0) {
        setProcessedProjects(validProjects);
        if (recentToReopen) {
          const handles = droppedItems.filter(item => !(item instanceof File) && 'kind' in item && item.kind === 'local-handle')
            .map(item => (item as { kind: 'local-handle'; handle: FileSystemHandle }).handle);
          await addRecentEntry(recentToReopen, recentToReopen.name, handles);
        } else for (const project of validProjects) {
          if (project.files.length > 0) await addRecentEntry(project);
        }
        setCurrentProjectIndexInModal(0); 
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
    setImportIssues([]);

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
  }, [isMultiProjectMode, processedProjects, currentProjectIndexInModal]);


  const recordUnification = (projects: ProjectFile[], fileCount: number, operationKey: string) => {
    if (fileCount === 0 || countedUnifications.current.has(operationKey)) return;
    countedUnifications.current.add(operationKey);
    leaderboard.record(operationKey, fileCount, suggestedAuthor(projects));
  };

  const handleUnifiedCopied = (projectIds: string[], fileCount: number, operationKey: string) => {
    const projects = processedProjects.filter(project => projectIds.includes(project.id));
    if (!projects.length) return;
    recordUnification(projects, fileCount, operationKey);
  };

  const handleSingleProjectProcessed = (projectId: string, downloadData: { fileName: string; content: string; fileCount: number; operationKey: string }) => {
    downloadTextFile(downloadData.fileName, downloadData.content);
    const projectThatWasProcessed = processedProjects.find(p => p.id === projectId);
    if (projectThatWasProcessed) {
        void addRecentEntry(projectThatWasProcessed);
        recordUnification([projectThatWasProcessed], downloadData.fileCount, downloadData.operationKey);
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
      setImportIssues([]);
    } else {
      setIsSelectionModalOpen(true);
    }
  };

  const handleMultiProjectProcessed = (projectIdsProcessed: string[], downloadData: { fileName: string; content: string; fileCount: number; operationKey: string }) => {
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
    void addRecentEntry(unifiedRecentEntry, recentName,
      projectsThatWereProcessed.every(project => project.sourceHandle)
        ? projectsThatWereProcessed.map(project => project.sourceHandle!) : []);
    recordUnification(projectsThatWereProcessed, downloadData.fileCount, downloadData.operationKey);
    
    setProcessedProjects(prev => prev.filter(p => !projectIdsProcessed.includes(p.id)));
    
    toast({ title: t('successToastTitle', language), description: t('fileDownloadedToast', language, { fileName: downloadData.fileName }) });
    setIsSelectionModalOpen(false);
    setImportIssues([]);
  };


  const handleSelectRecent = async (recent: RecentEntry) => {
    if (recent.reopenable) {
      try {
        const handles = localSources.current.get(recent.id) ?? await loadSourceHandles(recent.id);
        if (handles?.length) {
          for (const handle of handles) {
            if (!await requestSourcePermission(handle)) {
              toast({ title: t('historyPermissionDenied', language), variant: 'destructive' });
              return;
            }
          }
          await handleFilesDropped(handles.map(handle => ({ kind: 'local-handle', handle: handle as FileSystemFileHandle | FileSystemDirectoryHandle })), recent);
          return;
        }
      } catch (error) {
        console.warn('Could not reopen local project', error);
        toast({ title: t('historyReopenError', language), variant: 'destructive' });
      }
    }
    setSelectedRecentForInfoModal(recent);
    setIsRecentInfoModalOpen(true);
  };

  const reconnectRecent = async (recent: RecentEntry, kind: 'file' | 'directory') => {
    try {
      const pickerWindow = window as Window & {
        showOpenFilePicker?: (options: { multiple: boolean }) => Promise<FileSystemFileHandle[]>;
        showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
      };
      const handles = kind === 'directory'
        ? pickerWindow.showDirectoryPicker ? [await pickerWindow.showDirectoryPicker()] : []
        : pickerWindow.showOpenFilePicker ? await pickerWindow.showOpenFilePicker({ multiple: true }) : [];
      if (!handles.length) {
        toast({ title: t('historyBrowserUnsupported', language), variant: 'destructive' });
        return;
      }
      setIsRecentInfoModalOpen(false);
      await handleFilesDropped(handles.map(handle => ({ kind: 'local-handle', handle })), recent);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError'))
        toast({ title: t('historyReopenError', language), variant: 'destructive' });
    }
  };

  const handleVersionClick = () => {
    setIsChangelogModalOpen(true);
  };

  const changelogContent = `
    <ul class="list-disc pl-5 space-y-2 text-sm">
      <li>
        Versión ${APP_VERSION}
        <ul class="list-disc pl-5 space-y-1 mt-1">
          <li>Restaurado el comportamiento de DotScroll de la versión 0.2.20.</li>
          <li>Se mantienen la búsqueda por nombre de archivo o carpeta y la selección completa de carpetas.</li>
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
        projectType={settings.lastProjectType}
        onProjectTypeChange={handleProjectTypeChange}
        boardControl={<UnificationBoard entries={leaderboard.entries} totalFiles={leaderboard.totalFiles}
          participantCount={leaderboard.participantCount} profile={leaderboard.profile}
          pendingCount={leaderboard.pendingCount} error={leaderboard.error} loading={leaderboard.loading}
          language={language} onRename={leaderboard.rename} onRefresh={() => { void leaderboard.retry(); }} />}
      />
      
      <main className="page-scroll-safe flex-grow container mx-auto px-4 py-8">
        <section data-dotscroll-page data-dotscroll-label={t('dropzoneHint', language)}>
          <FileDropzone
            onFilesProcessed={handleFilesDropped}
            currentLanguage={language}
            projectType={settings.lastProjectType}
          />
        </section>
        {recents.length > 0 && (
          <section data-dotscroll-page data-dotscroll-label={t('processedHistory', language)}>
            <RecentFilesList
              recents={recents}
              onSelectRecent={handleSelectRecent}
              onRemoveRecent={removeRecentEntry}
              currentLanguage={language}
            />
          </section>
        )}
      </main>
      {isSelectionModalOpen && (processedProjects.length > 0) && (
        <FileSelectionModal
          importIssues={importIssues}
          isOpen={isSelectionModalOpen}
          onClose={handleSelectionModalClose} 
          projectsToProcess={processedProjects}
          onAddOtherTypeFile={handleAddOtherTypeFile}
          onSingleProjectProcessed={handleSingleProjectProcessed}
          onMultiProjectProcessed={handleMultiProjectProcessed}
          onUnifiedCopied={handleUnifiedCopied}
          isMultiProjectMode={isMultiProjectMode}
          showPreview={isPreviewEnabled}
          initialProjectIndex={currentProjectIndexInModal}
          onProjectViewedIndexChange={setCurrentProjectIndexInModal}
          onManualFileRequested={handleManualContentAddRequested} 
          currentLanguage={language}
          projectType={settings.lastProjectType}
        />
      )}
      {selectedRecentForInfoModal && (
         <AlertDialog open={isRecentInfoModalOpen} onOpenChange={setIsRecentInfoModalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('recentInfoModalTitle', language, { recentName: selectedRecentForInfoModal.name })}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('historyReconnectHint', language)}
                <br /><br />
                {t('recentInfoModalType', language, { type: selectedRecentForInfoModal.type === 'folder' ? t('folderUnificationType', language) : t('individualFileType', language) })}
                <br />
                {t('recentInfoModalProcessedOn', language, { timestamp: new Date(selectedRecentForInfoModal.timestamp).toLocaleString(language) })}
                <br /><br />
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button variant="outline" onClick={() => void reconnectRecent(selectedRecentForInfoModal, 'directory')}>
                {t('selectFolders', language)}
              </Button>
              <Button variant="outline" onClick={() => void reconnectRecent(selectedRecentForInfoModal, 'file')}>
                {t('selectFiles', language)}
              </Button>
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
                <div>
                  <ScrollArea className="mt-2 h-[min(60vh,18rem)]">
                    <div className="pr-2" dangerouslySetInnerHTML={{ __html: changelogContent }} />
                  </ScrollArea>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setIsChangelogModalOpen(false)}>{t('close', language)}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <footer data-dotscroll-page data-dotscroll-label="Footer" className="page-scroll-safe text-center p-4 border-t text-sm text-muted-foreground flex flex-col gap-2 lg:flex-row justify-between items-center">
        <span className="flex flex-wrap items-center justify-center gap-x-1">
          <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Dev_Proyect_to_TXT
          </a>
          <span aria-hidden="true">-</span>
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
        <nav aria-label={t('feedbackLinksLabel', language)} className="flex flex-wrap items-center justify-center gap-x-2">
          <Button variant="link" asChild className="text-muted-foreground hover:text-primary">
            <a href={`${REPOSITORY_URL}/issues/new?title=${encodeURIComponent(language === 'es' ? '[Error] ' : '[Bug] ')}`} target="_blank" rel="noopener noreferrer">
              <Bug className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('reportIssueLinkText', language)}
            </a>
          </Button>
          <Button variant="link" asChild className="text-muted-foreground hover:text-primary">
            <a href={`${REPOSITORY_URL}/issues/new?title=${encodeURIComponent(language === 'es' ? '[Sugerencia] ' : '[Suggestion] ')}`} target="_blank" rel="noopener noreferrer">
              <Lightbulb className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('suggestFeatureLinkText', language)}
            </a>
          </Button>
        </nav>
      </footer>
      <PageDots hasHistory={recents.length > 0} modalOpen={isSelectionModalOpen || isRecentInfoModalOpen || isChangelogModalOpen} language={language} />
    </div>
  );
}
