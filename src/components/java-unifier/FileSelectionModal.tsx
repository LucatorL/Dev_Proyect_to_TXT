// components/java-unifier/FileSelectionModal.tsx
"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { Label } from "@/components/ui/label";
import type { ProcessedFile, ProjectFile, PackageGroup, ProjectGroup, UnifiedFileMapEntry } from '@/types/java-unifier';
import { unifyProjectFiles, getProjectBaseName, type ProjectType, type SourceFileEntry, type ImportIssue, readFileContent, getFileExtension } from '@/lib/file-processor';
import { Copy, Download, Eye, CheckSquare, Square, FileText, FileCode, Database, Settings2, Info, ChevronLeft, ChevronRight, PlusCircle, Globe, Combine, Code, FileJson, FileKey, AlertTriangle, Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ImportIssues } from '@/components/java-unifier/ImportIssues';
import { ManualAddContentModal } from '@/components/java-unifier/ManualAddContentModal';
import { t, type Language, DEFAULT_PACKAGE_NAME_LOGIC, OTHER_FILES_PACKAGE_NAME_LOGIC } from '@/lib/translations';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { findMatchByOrdinal } from '@/lib/preview-search';

const TOKEN_WARNING_THRESHOLD = 100000;
const PANEL_DIVIDER_WIDTH = 16;
const MIN_FILE_PANEL_WIDTH = 240;
const MIN_PREVIEW_PANEL_WIDTH = 280;

const marqueeVisibility = new WeakMap<Element, (visible: boolean) => void>();
let marqueeObserver: IntersectionObserver | null = null;
const marqueeSizing = new WeakMap<Element, () => void>();
let marqueeSizeObserver: ResizeObserver | null = null;

function getMarqueeObserver() {
  if (!marqueeObserver) {
    marqueeObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => marqueeVisibility.get(entry.target)?.(entry.isIntersecting));
    });
  }
  return marqueeObserver;
}

function getMarqueeSizeObserver() {
  if (!marqueeSizeObserver) {
    marqueeSizeObserver = new ResizeObserver(entries => {
      const callbacks = new Set(entries.map(entry => marqueeSizing.get(entry.target)).filter((callback): callback is () => void => !!callback));
      callbacks.forEach(callback => callback());
    });
  }
  return marqueeSizeObserver;
}

function ScrollingName({ name }: { name: string }) {
  const viewportRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [travel, setTravel] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    marqueeVisibility.set(viewport, setVisible);
    getMarqueeObserver().observe(viewport);
    return () => { marqueeObserver?.unobserve(viewport); marqueeVisibility.delete(viewport); };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const text = textRef.current;
    if (!viewport || !text) return;
    let frame = 0;
    let active = true;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!active) return;
        const width = text.getBoundingClientRect().width;
        const space = viewport.getBoundingClientRect().width;
        const next = width > space + 1 ? Math.ceil(width + 32) : 0;
        setTravel(previous => previous === next ? previous : next);
      });
    };
    const observer = getMarqueeSizeObserver();
    marqueeSizing.set(viewport, measure);
    marqueeSizing.set(text, measure);
    observer.observe(viewport);
    observer.observe(text);
    measure();
    document.fonts?.ready.then(measure);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      observer.unobserve(viewport);
      observer.unobserve(text);
      marqueeSizing.delete(viewport);
      marqueeSizing.delete(text);
    };
  }, [name]);

  return (
    <span ref={viewportRef} className="file-name-viewport" title={name}
      data-overflow={travel > 0} data-visible={visible}>
      <span className="file-name-track" style={{
        '--file-name-duration': `${Math.max(6, travel / 50)}s`,
      } as React.CSSProperties}>
        <span ref={textRef}>{name}</span>
        {travel > 0 && <span aria-hidden="true" className="file-name-copy">{name}</span>}
      </span>
    </span>
  );
}

interface FileSelectionModalProps {
  importIssues?: ImportIssue[];
  isOpen: boolean;
  onClose: () => void; 
  projectsToProcess: ProjectFile[];
  onAddOtherTypeFile: (entry: SourceFileEntry, targetProjectId: string) => void;
  onSingleProjectProcessed: (projectId: string, downloadData: { fileName: string; content: string; fileCount: number; operationKey: string }) => void;
  onMultiProjectProcessed: (projectIdsToRemove: string[], downloadData: { fileName: string; content: string; fileCount: number; operationKey: string }) => void;
  onUnifiedCopied: (projectIds: string[], fileCount: number, operationKey: string) => void;
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
    case 'php':
        return <FileCode className="w-3.5 h-3.5 mr-1.5 text-purple-600 shrink-0" />;
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
  importIssues = [],
  isOpen,
  onClose,
  projectsToProcess,
  onAddOtherTypeFile,
  onSingleProjectProcessed,
  onMultiProjectProcessed,
  onUnifiedCopied,
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
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFileSearchVisible, setIsFileSearchVisible] = useState(false);
  const [fileSearchTerm, setFileSearchTerm] = useState("");
  const fileSearchInput = useRef<HTMLInputElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const listPanelRef = useRef<HTMLDivElement>(null);
  const [listWidth, setListWidth] = useState(320);
  const [manualListWidth, setManualListWidth] = useState<number | null>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const draggingDivider = useRef(false);
  const selectionOperations = useRef(new Map<string, string>());

  const selectionKey = (projects: ProjectFile[]) => {
    const selection = projects.map(project => `${project.id}:${project.files.map(file => file.id).join(',')}`).join('|');
    if (!selectionOperations.current.has(selection)) selectionOperations.current.set(selection, crypto.randomUUID());
    return selectionOperations.current.get(selection)!;
  };

  const getAvailableWidth = useCallback(() => {
    const layout = layoutRef.current;
    if (!layout) return 0;
    const styles = getComputedStyle(layout);
    return layout.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight) - PANEL_DIVIDER_WIDTH;
  }, []);

  const clampListWidth = useCallback((width: number) => {
    const available = getAvailableWidth();
    if (!available) return width;
    return Math.round(Math.max(Math.min(MIN_FILE_PANEL_WIDTH, available / 2),
      Math.min(width, available - MIN_PREVIEW_PANEL_WIDTH)));
  }, [getAvailableWidth]);

  useEffect(() => {
    const layout = layoutRef.current;
    if (!layout) return;
    let frame = 0;
    const refresh = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setAvailableWidth(getAvailableWidth());
        setManualListWidth(previous => previous === null ? null : clampListWidth(previous));
      });
    };
    const observer = new ResizeObserver(refresh);
    observer.observe(layout);
    window.addEventListener('resize', refresh);
    refresh();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('resize', refresh); };
  }, [clampListWidth, getAvailableWidth]);

  const moveDivider = (clientX: number) => {
    const left = listPanelRef.current?.getBoundingClientRect().left;
    if (left !== undefined) setManualListWidth(clampListWidth(clientX - left));
  };

  const finishDivider = () => {
    if (draggingDivider.current) {
      draggingDivider.current = false;
    }
  };

  const [currentMatch, setCurrentMatch] = useState(-1);
  const currentMatchRef = useRef<HTMLElement | null>(null);
  const checkpointsRef = useRef<number[]>([]);
  const [searchState, setSearchState] = useState({ query: '', count: 0, done: true });
  const activeSearch = searchState.query === searchTerm && isSearchVisible && showPreview
    ? searchState : { query: searchTerm, count: 0, done: !searchTerm.trim() };
  const matchesCount = activeSearch.count;

  useEffect(() => {
    const query = searchTerm.trim() ? searchTerm : '';
    checkpointsRef.current = [];
    setSearchState({ query, count: 0, done: !query });
    setCurrentMatch(query ? 0 : -1);
    if (!query || !isSearchVisible || !showPreview || !unifiedPreview) return;

    const worker = new Worker(new URL('../../workers/preview-search.worker.ts', import.meta.url));
    worker.onmessage = (event: MessageEvent<{ query: string; count: number; checkpoints: number[]; done: boolean }>) => {
      if (event.data.query !== query) return;
      checkpointsRef.current.push(...event.data.checkpoints);
      setSearchState({ query, count: event.data.count, done: event.data.done });
    };
    worker.onerror = error => {
      console.error('Preview search failed:', error);
      setSearchState(previous => previous.query === query ? { ...previous, done: true } : previous);
    };
    worker.postMessage({ text: unifiedPreview, query });
    return () => worker.terminate();
  }, [searchTerm, unifiedPreview, isSearchVisible, showPreview]);

  const currentMatchRange = useMemo(() => {
    if (!searchTerm.trim() || currentMatch < 0 || currentMatch >= matchesCount) return null;
    return findMatchByOrdinal(unifiedPreview, searchTerm, checkpointsRef.current, currentMatch);
  }, [unifiedPreview, searchTerm, searchState.count, searchState.query, currentMatch, matchesCount]);
  const matchIndex = currentMatchRange?.index ?? -1;
  const matchLength = currentMatchRange?.length ?? 0;

  // The file list navigates by folder/package; the unified preview navigates by file.
  const [fileMap, setFileMap] = useState<UnifiedFileMapEntry[]>([]);

  const getDisplayPackageName = (packageNameConstant: string) => {
    if (packageNameConstant === DEFAULT_PACKAGE_NAME_LOGIC) {
      return t('defaultPackageNameDisplay', currentLanguage);
    }
    if (packageNameConstant === OTHER_FILES_PACKAGE_NAME_LOGIC) {
      return t('otherFilesPackageNameDisplay', currentLanguage);
    }
    return packageNameConstant;
  };

  const handlePreviewOtherFile = async (entry: SourceFileEntry) => {
    try {
        const file = await new Promise<File>((resolve, reject) => entry.file(resolve, reject));
        const content = await readFileContent(file);
        const fileType = getFileExtension(file.name);
        setIndividualFilePreview({ name: file.name, content, fileType });
    } catch (error) {
        console.error("Error reading file for preview:", error);
        toast({
            title: t('error', currentLanguage),
            description: t('processingErrorToastDescriptionShort', currentLanguage, { fileName: entry.name }),
            variant: "destructive",
        });
    }
  };

  useEffect(() => {
    setCurrentDisplayProjects(previous => {
      const selections = new Map(previous.flatMap(project => project.files.map(file => [file.id, file.selected] as const)));
      return projectsToProcess.map(project => ({ ...project, files: project.files.map(file => ({ ...file, selected: selections.get(file.id) ?? file.selected })) }));
    });
  }, [projectsToProcess]);

  useEffect(() => {
    setCurrentProjectIndex(Math.max(0, Math.min(initialProjectIndex, projectsToProcess.length - 1)));
  }, [initialProjectIndex, projectsToProcess.length]);

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
            setFileMap([]);
            return;
        }
        const { content, fileMap } = unifyProjectFiles(selectedProjectsForPreview, isMultiProjectMode);
        setUnifiedPreview(content);
        setFileMap(fileMap);

        const tokens = Math.max(0, Math.ceil(content.length / 4));
        setEstimatedTokens(tokens);
    } else {
        setUnifiedPreview("");
        setEstimatedTokens(0);
        setFileMap([]);
    }
  }, [currentDisplayProjects, isMultiProjectMode, currentProjectIndex, showPreview]);
  
  useEffect(() => {
    if (matchIndex < 0) return;
    const frame = requestAnimationFrame(() => currentMatchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    return () => cancelAnimationFrame(frame);
  }, [matchIndex]);

  const handleNextMatch = () => { if (matchesCount) setCurrentMatch(previous => (previous + 1) % matchesCount); };
  const handlePrevMatch = () => { if (matchesCount) setCurrentMatch(previous => (previous - 1 + matchesCount) % matchesCount); };

  const highlightedContent = useMemo(() => {
    const renderRange = (start: number, end: number) => {
      const parts: React.ReactNode[] = [];
      let cursor = start;
      if (matchIndex >= 0) {
        const matchStart = Math.max(start, matchIndex);
        const matchEnd = Math.min(end, matchIndex + matchLength);
        if (matchEnd > matchStart) {
          if (matchStart > cursor) parts.push(unifiedPreview.slice(cursor, matchStart));
          parts.push(<mark key={`match-${matchIndex}-${start}`} ref={element => {
            if (matchIndex >= start && matchIndex < end) currentMatchRef.current = element;
          }} className="bg-primary/70 rounded-sm p-0">
            {unifiedPreview.slice(matchStart, matchEnd)}
          </mark>);
          cursor = matchEnd;
        }
      }
      if (cursor < end) parts.push(unifiedPreview.slice(cursor, end));
      return parts;
    };
    const parts: React.ReactNode[] = [];
    let cursor = 0;
    const multipleProjects = new Set(fileMap.map(file => file.projectIndex)).size > 1;
    fileMap.forEach((file, index) => {
      if (file.start > cursor) {
        parts.push(<React.Fragment key={`prefix-${index}`}>{renderRange(cursor, file.start)}</React.Fragment>);
      }
      const fileLabel = file.groupName === DEFAULT_PACKAGE_NAME_LOGIC
        ? file.fileName
        : `${getDisplayPackageName(file.groupName)} / ${file.fileName}`;
      const label = multipleProjects ? `${file.projectName} / ${fileLabel}` : fileLabel;
      parts.push(<span key={`file-${index}`} className="preview-file-section" data-preview-file={index}
        data-dotscroll-section data-dotscroll-label={label}>
        <span className="preview-file-banner" aria-hidden="true">
          <span className="preview-file-number">{index + 1} / {fileMap.length}</span>
          <ScrollingName name={file.fileName} />
        </span>
        {renderRange(file.start, file.end)}
      </span>);
      cursor = file.end;
    });
    if (cursor < unifiedPreview.length) parts.push(<React.Fragment key="tail">{renderRange(cursor, unifiedPreview.length)}</React.Fragment>);
    return parts;
  }, [unifiedPreview, fileMap, matchIndex, matchLength, currentLanguage]);

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

  const handlePackageSelectionChange = (projectId: string, fileIds: string[], selected: boolean) => {
    const ids = new Set(fileIds);
    setCurrentDisplayProjects(projects => projects.map(project => project.id === projectId
      ? { ...project, files: project.files.map(file => ids.has(file.id) ? { ...file, selected } : file) }
      : project));
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
      finalUnifiedContent = unifyProjectFiles(projectsToUnify, true).content;
      const baseName = projectsToUnify.length > 1 || !projectsToUnify[0] 
        ? t('unifiedProjectsGenericName', currentLanguage).replace(/\s/g, '_') 
        : getProjectBaseName(projectsToUnify[0].name);
      finalOutputFileName = `${baseName}_unificado.txt`;
      
      const projectIdsProcessed = projectsToUnify.map(p => p.id);

      onMultiProjectProcessed(projectIdsProcessed, {
        fileName: finalOutputFileName, content: finalUnifiedContent,
        fileCount: projectsToUnify.reduce((sum, project) => sum + project.files.length, 0),
        operationKey: selectionKey(projectsToUnify),
      });
    
    } else if (currentDisplayProjects[currentProjectIndex]) {
      const currentProjectForConfirm = currentDisplayProjects[currentProjectIndex];
      const selectedFiles = currentProjectForConfirm.files.filter(f => f.selected);

      if (selectedFiles.length === 0) {
        toast({ title: t('noSelection', currentLanguage), description: t('pleaseSelectOneFileFromCurrentProject', currentLanguage), variant: "destructive" });
        return;
      }
      finalUnifiedContent = unifyProjectFiles([{...currentProjectForConfirm, files: selectedFiles}], false).content;
      finalOutputFileName = getProjectBaseName(currentProjectForConfirm.name) + "_unificado.txt";
      
      onSingleProjectProcessed(currentProjectForConfirm.id, { fileName: finalOutputFileName, content: finalUnifiedContent, fileCount: selectedFiles.length,
        operationKey: selectionKey([{ ...currentProjectForConfirm, files: selectedFiles }]) });
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
    const projectsCopied = (isMultiProjectMode ? currentDisplayProjects : currentDisplayProjects.slice(currentProjectIndex, currentProjectIndex + 1))
      .map(project => ({ ...project, files: project.files.filter(file => file.selected) }))
      .filter(project => project.files.length > 0);
    navigator.clipboard.writeText(unifiedPreview)
      .then(() => {
        onUnifiedCopied(projectsCopied.map(project => project.id),
          projectsCopied.reduce((sum, project) => sum + project.files.length, 0), selectionKey(projectsCopied));
        toast({ title: t('copied', currentLanguage), description: t('unifiedContentCopied', currentLanguage) });
      })
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

  const filteredOrganizedData = useMemo(() => {
    const query = fileSearchTerm.trim().toLocaleLowerCase();
    if (!query) return organizedData;
    return organizedData.map(project => {
      const projectMatches = project.projectName.toLocaleLowerCase().includes(query);
      const packages = project.packages.map(pkg => ({
        ...pkg,
        files: projectMatches || pkg.packageName.toLocaleLowerCase().includes(query) ||
          getDisplayPackageName(pkg.packageName).toLocaleLowerCase().includes(query)
          ? pkg.files : pkg.files.filter(file => file.name.toLocaleLowerCase().includes(query) || file.path.toLocaleLowerCase().includes(query)),
      })).filter(pkg => pkg.files.length > 0);
      const otherFiles = project.otherFiles?.filter(file => projectMatches || file.name.toLocaleLowerCase().includes(query) || file.fullPath.toLocaleLowerCase().includes(query));
      return { ...project, packages, otherFiles };
    }).filter(project => project.packages.length > 0 || (project.otherFiles?.length ?? 0) > 0);
  }, [organizedData, fileSearchTerm, currentLanguage]);

  const allPackageFiles = useMemo(() => new Map(organizedData.flatMap(project =>
    project.packages.map(pkg => [`${project.projectActualId}\u0000${pkg.packageName}`,
      project.packages.filter(child => child.packageName === pkg.packageName ||
        (pkg.packageName !== DEFAULT_PACKAGE_NAME_LOGIC && pkg.packageName !== OTHER_FILES_PACKAGE_NAME_LOGIC &&
          child.packageName.startsWith(`${pkg.packageName}${projectType === 'java' ? '.' : '/'}`)))
        .flatMap(child => child.files)] as const))), [organizedData, projectType]);

  const visibleNames = useMemo(() => organizedData.flatMap(project => [
    project.projectName,
    ...project.packages.flatMap(pkg => [
      pkg.packageName === DEFAULT_PACKAGE_NAME_LOGIC ? t('defaultPackageNameDisplay', currentLanguage)
        : pkg.packageName === OTHER_FILES_PACKAGE_NAME_LOGIC ? t('otherFilesPackageNameDisplay', currentLanguage) : pkg.packageName,
      ...pkg.files.map(file => file.name),
    ]),
    ...(project.otherFiles?.map(file => file.name) ?? []),
  ]), [organizedData, currentLanguage]);

  useEffect(() => {
    const panel = listPanelRef.current;
    if (!panel) return;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;
    const sample = panel.querySelector('li label') || panel;
    const font = getComputedStyle(sample);
    context.font = `${font.fontWeight} ${font.fontSize} ${font.fontFamily}`;
    const longest = visibleNames.reduce((width, name) => Math.max(width, context.measureText(name).width), 0);
    // Checkbox, file icon, preview action and DotScroll need space beside the title.
    setListWidth(Math.ceil(Math.max(320, longest + 112)));
  }, [visibleNames]);


  const handleNextProject = () => {
    const index = Math.min(projectsToProcess.length - 1, currentProjectIndex + 1);
    setCurrentProjectIndex(index);
    onProjectViewedIndexChange?.(index);
  };

  const handlePrevProject = () => {
    const index = Math.max(0, currentProjectIndex - 1);
    setCurrentProjectIndex(index);
    onProjectViewedIndexChange?.(index);
  };

  const handleModalManualContentSubmit = (fileName: string, content: string, targetProjectId: string | 'new_project') => {
    onManualFileRequested(fileName, content, targetProjectId);
    setIsManualAddModalOpen(false); 
  };


  if (!isOpen) return null; 
  const currentSingleProjectNameForTitle = !isMultiProjectMode && currentDisplayProjects[currentProjectIndex] ? currentDisplayProjects[currentProjectIndex].name : (projectsToProcess[0]?.name || "Proyecto");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!open) onClose(); }}>
      <DialogContent onInteractOutside={(e) => {
        if ((e.target as HTMLElement)?.closest('[data-toast-viewport="true"]')) {
          e.preventDefault();
        }
      }} className="w-[96vw] max-w-6xl h-[90vh] flex flex-col p-0">
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
          <ImportIssues issues={importIssues} currentLanguage={currentLanguage} />
        </DialogHeader>

        <div ref={layoutRef} className="file-selection-layout flex-grow min-h-0 overflow-hidden p-6 pt-2"
          data-resized={manualListWidth !== null}
          style={{ '--file-list-width': `${manualListWidth ?? listWidth}px` } as React.CSSProperties}>
          <div ref={listPanelRef} className="flex min-w-0 min-h-0 flex-col overflow-hidden">
            <div className="file-list-header flex items-center justify-between mb-2 p-1 rounded-md bg-secondary gap-1">
              <Label className="font-semibold px-2 min-w-0 flex-1">
                <ScrollingName name={isMultiProjectMode ? t('projectFiles', currentLanguage) : t('filesFromProject', currentLanguage, { projectName: currentDisplayProjects[currentProjectIndex]?.name || t('currentProjectFallbackName', currentLanguage) })} />
              </Label>
              <div className="flex shrink-0 gap-1">
                 {projectType === 'java' && (
                    <Button variant="ghost" size="sm" onClick={() => handleSelectSpecificFiles(['java', 'kt'])} title={t('onlyJava', currentLanguage)}>
                        <FileCode className="w-4 h-4 text-blue-500" /> <span className="file-list-action-label">{t('onlyJava', currentLanguage)}</span>
                    </Button>
                 )}
                 {projectType === 'web' && (
                    <Button variant="ghost" size="sm" onClick={() => handleSelectSpecificFiles(['html', 'css', 'scss', 'js', 'ts', 'jsx', 'tsx', 'php'])} title={t('onlyWebCore', currentLanguage)}>
                        <Globe className="w-4 h-4 text-orange-600" /> <span className="file-list-action-label">{t('onlyWebCore', currentLanguage)}</span>
                    </Button>
                 )}
                <Button variant="ghost" size="sm" onClick={() => handleSelectAllInVisibleProjects(true)} title={t('selectAll', currentLanguage)}>
                  <CheckSquare className="w-4 h-4" /> <span className="file-list-action-label">{t('selectAll', currentLanguage)}</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleSelectAllInVisibleProjects(false)} title={t('deselectAll', currentLanguage)}>
                  <Square className="w-4 h-4" /> <span className="file-list-action-label">{t('deselectAll', currentLanguage)}</span>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t('searchFilesAndFolders', currentLanguage)}
                  title={t('searchFilesAndFolders', currentLanguage)} onClick={() => {
                    setIsFileSearchVisible(visible => !visible);
                    if (!isFileSearchVisible) requestAnimationFrame(() => fileSearchInput.current?.focus());
                    else setFileSearchTerm('');
                  }}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {isFileSearchVisible && <div className="relative mb-2">
              <Input ref={fileSearchInput} className="h-8 pr-9" value={fileSearchTerm}
                placeholder={t('searchFilesAndFolders', currentLanguage)}
                onChange={event => setFileSearchTerm(event.target.value)}
                onKeyDown={event => { if (event.key === 'Escape') { setFileSearchTerm(''); setIsFileSearchVisible(false); } }} />
              {fileSearchTerm && <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-8 w-8"
                aria-label={t('clearSearch', currentLanguage)} onClick={() => { setFileSearchTerm(''); fileSearchInput.current?.focus(); }}>
                <X className="h-4 w-4" />
              </Button>}
            </div>}
            
            <ScrollArea className="flex-grow border rounded-md p-1">
              {filteredOrganizedData.length === 0 && (
                  <p className="text-sm text-muted-foreground p-4 text-center">{fileSearchTerm.trim() ? t('noFilesFound', currentLanguage) : t('noSelectableFiles', currentLanguage)}</p>
              )}

              {filteredOrganizedData.map(projectGroup => (
                <div key={projectGroup.projectActualId} className="mb-3">
                  {(isMultiProjectMode && projectsToProcess.length > 1 && projectsForListDisplay.length > 1) && (
                    <h4 className="text-sm font-semibold p-2 bg-muted rounded-t-md sticky top-0 z-10"><ScrollingName name={projectGroup.projectName} /></h4>
                  )}
                  
                  {projectGroup.packages.map(pkgGroup => {
                    const packageFiles = allPackageFiles.get(`${projectGroup.projectActualId}\u0000${pkgGroup.packageName}`) ?? pkgGroup.files;
                    return (
                    <div key={pkgGroup.packageName} data-dotscroll-section
                      data-dotscroll-label={projectsForListDisplay.length > 1
                        ? `${projectGroup.projectName} / ${getDisplayPackageName(pkgGroup.packageName)}`
                        : getDisplayPackageName(pkgGroup.packageName)} className="mb-2">
                       <div className="flex items-center gap-2 px-2 py-1">
                         <Checkbox id={`folder-${projectGroup.projectActualId}-${pkgGroup.packageName}`}
                           checked={packageFiles.every(file => file.selected) ? true : packageFiles.some(file => file.selected) ? 'indeterminate' : false}
                           onCheckedChange={checked => handlePackageSelectionChange(projectGroup.projectActualId, packageFiles.map(file => file.id), checked === true)}
                           aria-label={t('selectFolderContents', currentLanguage, { folder: getDisplayPackageName(pkgGroup.packageName) })}
                           className="shrink-0" />
                         <Label htmlFor={`folder-${projectGroup.projectActualId}-${pkgGroup.packageName}`}
                           className="min-w-0 flex-1 cursor-pointer text-xs font-medium text-muted-foreground">
                           <ScrollingName name={getDisplayPackageName(pkgGroup.packageName)} />
                         </Label>
                       </div>
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
                              <Label htmlFor={`${projectGroup.projectActualId}-${file.id}`} className="min-w-0 flex-1 cursor-pointer">
                                <ScrollingName name={file.name} />
                              </Label>
                            </div>
                            <Button variant="ghost" size="icon" className="w-6 h-6 shrink-0 opacity-50 group-hover:opacity-100" onClick={() => setIndividualFilePreview({name: file.name, content: file.content, fileType: file.fileType})}>
                               <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                    );
                  })}

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
                                                    <div className="flex items-center flex-grow overflow-hidden">
                                                        {getFileIcon(getFileExtension(entry.name))}
                                                        <ScrollingName name={entry.name} />
                                                    </div>
                                                    <div className="flex items-center shrink-0">
                                                        <TooltipProvider delayDuration={300}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => handlePreviewOtherFile(entry)}>
                                                                        <Eye className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top">
                                                                    <p>{t('previewFileTitle', currentLanguage, { fileName: entry.name })}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <Button size="sm" variant="ghost" className="h-7" onClick={() => onAddOtherTypeFile(entry, projectGroup.projectActualId)}>
                                                            {t('add', currentLanguage)}
                                                        </Button>
                                                    </div>
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

          <div role="separator" tabIndex={0} aria-orientation="vertical"
            aria-label={t('resizePanels', currentLanguage)}
            aria-valuemin={MIN_FILE_PANEL_WIDTH} aria-valuemax={Math.max(MIN_FILE_PANEL_WIDTH, availableWidth - MIN_PREVIEW_PANEL_WIDTH)}
            aria-valuenow={clampListWidth(manualListWidth ?? Math.min(listWidth, availableWidth / 2 || listWidth))}
            title={t('resetPanelWidth', currentLanguage)}
            className="file-panel-divider" data-dragging={draggingDivider.current}
            onPointerDown={event => {
              if (event.button !== 0) return;
              event.preventDefault();
              draggingDivider.current = true;
              event.currentTarget.setPointerCapture(event.pointerId);
              moveDivider(event.clientX);
            }}
            onPointerMove={event => { if (draggingDivider.current) moveDivider(event.clientX); }}
            onPointerUp={event => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
              finishDivider();
            }}
            onLostPointerCapture={finishDivider}
            onDoubleClick={() => setManualListWidth(null)}
            onKeyDown={event => {
              if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                event.preventDefault();
                const direction = event.key === 'ArrowLeft' ? -1 : 1;
                setManualListWidth(clampListWidth((manualListWidth ?? Math.min(listWidth, availableWidth / 2)) + direction * 24));
              } else if (event.key === 'Home') {
                event.preventDefault(); setManualListWidth(null);
              }
            }}
          />

          <div className="flex min-w-0 min-h-0 flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-2 p-1">
               <div className="flex items-center">
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
                {showPreview && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setIsSearchVisible(!isSearchVisible)}>
                                    <Search className="w-4 h-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>{t('search', currentLanguage)}</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
            {isSearchVisible && showPreview && (
                <div className="relative mb-2 flex items-center gap-2">
                    <Input
                        placeholder={t('searchInPreview', currentLanguage)}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-8 pr-8 flex-grow"
                    />
                    {searchTerm && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute right-0 top-0 h-8 w-8 text-muted-foreground"
                            style={{ right: matchesCount > 0 ? '8rem' : '0' }}
                            onClick={() => setSearchTerm('')}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                    {matchesCount > 0 && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground whitespace-nowrap bg-background p-1 rounded-md">
                          <span>{Math.max(0, currentMatch + 1)} / {matchesCount}{!activeSearch.done && '…'}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handlePrevMatch}>
                              <ChevronUp className="h-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleNextMatch}>
                              <ChevronDown className="h-4 h-4" />
                          </Button>
                      </div>
                    )}
                    {searchTerm.trim() && !activeSearch.done && matchesCount === 0 && (
                      <span role="status" className="text-xs text-muted-foreground whitespace-nowrap">
                        {currentLanguage === 'es' ? 'Buscando…' : 'Searching…'}
                      </span>
                    )}
                </div>
            )}

            {showPreview && estimatedTokens > TOKEN_WARNING_THRESHOLD && (
                <div className="p-2 mb-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-md text-xs flex items-center min-w-0">
                    <AlertTriangle className="w-4 h-4 mr-2 shrink-0" />
                    <ScrollingName name={`${t('largeProjectWarningTitle', currentLanguage)}: ${t('largeProjectWarningDescription', currentLanguage)}`} />
                </div>
            )}

            <div className="flex-grow flex gap-1 border rounded-md bg-muted/50 overflow-hidden p-1 relative">
              {showPreview ? (
                  <ScrollArea dotKey={`${fileMap.length}-${unifiedPreview.length}`} className="flex-grow rounded-md">
                    <pre className="w-full min-w-0 text-xs p-4 font-mono whitespace-pre-wrap break-words min-h-full">
                      {highlightedContent}
                    </pre>
                  </ScrollArea>
              ) : (
                <div className="flex-grow flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">{t('previewDeactivated', currentLanguage)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-4 border-t mt-auto flex justify-end gap-3">
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
                    <pre data-dotscroll-section data-dotscroll-label={individualFilePreview.name} className="w-full min-w-0 text-xs p-4 font-mono whitespace-pre-wrap break-all">{individualFilePreview.content}</pre>
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
          existingProjects={currentDisplayProjects}
          preferredProjectId={currentDisplayProjects[currentProjectIndex]?.id}
          isMultiProjectMode={isMultiProjectMode}
          currentLanguage={currentLanguage}
        />
      )}
    </Dialog>
  );
}
