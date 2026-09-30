
import JSZip from 'jszip';
import type { ProcessedFile, ProjectFile, UnificationResult, UnifiedFileMapEntry } from '@/types/java-unifier';
import { DEFAULT_PACKAGE_NAME_LOGIC, OTHER_FILES_PACKAGE_NAME_LOGIC } from '@/lib/translations';
import { ALL_SUPPORTED_EXTENSIONS, getFileExtension, MAX_FILE_SIZE, PROJECT_CONFIG } from '@/lib/file-types';
import type { ProjectType } from '@/lib/file-types';
export { ALL_SUPPORTED_EXTENSIONS, getFileExtension, MAX_FILE_SIZE, PROJECT_CONFIG } from '@/lib/file-types';
export type { ProjectType } from '@/lib/file-types';

export const MAX_TOTAL_FILES = 250; // Max number of files to process

const JAVA_EXTENSION = 'java';


export function getProjectBaseName(name: string): string {
  if (!name) return "UntitledProject";
  let baseName = name;
  if (baseName.toLowerCase().endsWith(".zip")) {
    baseName = baseName.substring(0, baseName.length - 4);
  } else if (baseName.toLowerCase().endsWith(".rar")) {
    baseName = baseName.substring(0, baseName.length - 4);
  }
  baseName = baseName.replace(/\s*\(\d+\)$/, "").trim();
  baseName = baseName.replace(/_unificado$/, "").trim(); 
  return baseName.length > 0 ? baseName : "UntitledProject";
}

function isSupportedFile(fileName: string, projectType: ProjectType): boolean {
  const extension = getFileExtension(fileName);
  return PROJECT_CONFIG[projectType].extensions.includes(extension);
}

export type HandleItem = { kind: 'local-handle'; handle: FileSystemFileHandle | FileSystemDirectoryHandle };
export type DroppedItem = FileSystemEntry | File | HandleItem;
export type SourceFileEntry = Pick<FileSystemFileEntry, 'name' | 'fullPath' | 'isFile' | 'file'>;
export interface ImportIssue {
  path: string;
  reason: 'size' | 'limit' | 'read' | 'archive' | 'archivePassword' | 'archiveVolume' | 'unsupported';
}

function fileEntry(file: File, fullPath: string): SourceFileEntry {
  return { name: file.name, fullPath, isFile: true, file: resolve => resolve(file) };
}

class OversizedZipEntryError extends Error {}

type ZipEntryStream = {
  on(event: 'data', callback: (chunk: Uint8Array) => void): ZipEntryStream;
  on(event: 'error', callback: (error: Error) => void): ZipEntryStream;
  on(event: 'end', callback: () => void): ZipEntryStream;
  pause(): void;
  resume(): void;
};

function readZipEntryWithinLimit(entry: JSZip.JSZipObject): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const stream = (entry as JSZip.JSZipObject & { internalStream(type: string): ZipEntryStream }).internalStream('uint8array');
    let chunks: Uint8Array[] = [];
    let size = 0;
    stream.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_FILE_SIZE) {
        stream.pause();
        chunks = [];
        reject(new OversizedZipEntryError());
      } else {
        chunks.push(chunk);
      }
    }).on('error', error => {
      chunks = [];
      reject(error);
    }).on('end', () => {
      const blob = new Blob(chunks.map(chunk => new Uint8Array(chunk)));
      chunks = [];
      resolve(blob);
    }).resume();
  });
}

async function* directoryFiles(directory: FileSystemDirectoryEntry, issues: ImportIssue[]): AsyncGenerator<FileSystemFileEntry> {
  const reader = directory.createReader();
  try {
    while (true) {
      const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
      if (!entries.length) return;
      for (const entry of entries) {
        if (entry.isDirectory) yield* directoryFiles(entry as FileSystemDirectoryEntry, issues);
        else if (entry.isFile) yield entry as FileSystemFileEntry;
      }
    }
  } catch {
    issues.push({ path: directory.fullPath, reason: 'read' });
  }
}

async function* handleDirectoryFiles(directory: FileSystemDirectoryHandle, path: string, issues: ImportIssue[]): AsyncGenerator<SourceFileEntry> {
  try {
    const entries = (directory as unknown as {
      entries(): AsyncIterable<[string, FileSystemFileHandle | FileSystemDirectoryHandle]>;
    }).entries();
    for await (const [name, child] of entries) {
      if (child.kind === 'directory') yield* handleDirectoryFiles(child, `${path}/${name}`, issues);
      else yield { name, fullPath: `${path}/${name}`, isFile: true,
        file: (resolve, reject) => { child.getFile().then(resolve, reject); } };
    }
  } catch {
    issues.push({ path, reason: 'read' });
  }
}

type RarResult = {
  entries: { name: string; path: string; bytes: ArrayBuffer }[];
  issues: ImportIssue[];
};

async function extractRar(file: File, remainingFiles: number): Promise<RarResult> {
  const archive = await file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/rar-extract.worker.ts', import.meta.url));
    worker.onmessage = (event: MessageEvent<RarResult>) => { worker.terminate(); resolve(event.data); };
    worker.onerror = error => { worker.terminate(); reject(error); };
    worker.postMessage({ archive, archiveName: file.name, remainingFiles }, [archive]);
  });
}

export async function processDroppedItems(items: DroppedItem[], projectType: ProjectType): Promise<{ projects: ProjectFile[]; issues: ImportIssue[] }> {
  const projects: ProjectFile[] = [];
  const issues: ImportIssue[] = [];
  const pickedFolders = new Map<string, ProjectFile>();
  let totalFiles = 0;
  const makeProject = (name: string, type: 'folder' | 'file'): ProjectFile => {
    const project: ProjectFile = { id: crypto.randomUUID(), name: getProjectBaseName(name), type, timestamp: Date.now(), files: [], otherFiles: [] };
    projects.push(project);
    return project;
  };
  const canAccept = (name: string, path: string) => {
    if (!ALL_SUPPORTED_EXTENSIONS.includes(getFileExtension(name))) {
      issues.push({ path, reason: 'unsupported' });
      return false;
    }
    if (totalFiles >= MAX_TOTAL_FILES) {
      issues.push({ path, reason: 'limit' });
      return false;
    }
    return true;
  };
  const addFile = async (entry: SourceFileEntry, project: ProjectFile, checked = false) => {
    if (!checked && !canAccept(entry.name, entry.fullPath)) return;
    try {
      const file = await new Promise<File>((resolve, reject) => entry.file(resolve, reject));
      if (file.size > MAX_FILE_SIZE) {
        issues.push({ path: entry.fullPath, reason: 'size' });
        return;
      }
      if (!isSupportedFile(file.name, projectType)) {
        project.otherFiles!.push(entry);
      } else {
        const content = await readFileContent(file);
        const fileType = getFileExtension(file.name);
        const meta = parseFileMeta(entry.fullPath.replace(/^\//, ''), content, fileType, projectType);
        project.files.push({ id: crypto.randomUUID(), ...meta, name: file.name, content, fileType, projectName: project.name,
          selected: PROJECT_CONFIG[projectType].defaultSelected.includes(fileType) });
      }
      totalFiles++;
    } catch {
      issues.push({ path: entry.fullPath, reason: 'read' });
    }
  };
  const addZip = async (file: File) => {
    const project = makeProject(file.name, 'folder');
    try {
      const zip = await JSZip.loadAsync(file);
      let visitedEntries = 0;
      for (const zipEntry of Object.values(zip.files)) {
        if (++visitedEntries % 20 === 0) await new Promise<void>(resolve => setTimeout(resolve, 0));
        if (zipEntry.dir) continue;
        const name = zipEntry.name.split('/').pop()!;
        const issuePath = `${file.name}/${zipEntry.name}`;
        if (!canAccept(name, issuePath)) continue;
        try {
          // JSZip exposes the declared uncompressed size from the ZIP directory.
          // The streaming check below also covers archives with incorrect metadata.
          const declaredSize = (zipEntry as JSZip.JSZipObject & { _data?: { uncompressedSize?: number } })._data?.uncompressedSize;
          if (typeof declaredSize === 'number' && declaredSize > MAX_FILE_SIZE) {
            issues.push({ path: issuePath, reason: 'size' });
            continue;
          }
          const blob = await readZipEntryWithinLimit(zipEntry);
          await addFile(fileEntry(new File([blob], name), zipEntry.name), project, true);
        } catch (error) {
          issues.push({ path: issuePath, reason: error instanceof OversizedZipEntryError ? 'size' : 'read' });
        }
      }
    } catch {
      issues.push({ path: file.name, reason: 'archive' });
    }
  };
  const addRar = async (file: File) => {
    const project = makeProject(file.name, 'folder');
    try {
      const result = await extractRar(file, MAX_TOTAL_FILES - totalFiles);
      issues.push(...result.issues);
      for (const entry of result.entries) {
        const path = entry.path.replace(/\\/g, '/');
        await addFile(fileEntry(new File([entry.bytes], entry.name), path), project, true);
      }
    } catch {
      issues.push({ path: file.name, reason: 'archive' });
    }
    return project;
  };
  for (const item of items) {
    if (!(item instanceof File) && 'kind' in item) {
      const handle = item.handle;
      if (handle.kind === 'directory') {
        const project = makeProject(handle.name, 'folder');
        project.sourceHandle = handle;
        for await (const entry of handleDirectoryFiles(handle, handle.name, issues)) await addFile(entry, project);
      } else {
        try {
          const file = await handle.getFile();
          if (file.name.toLowerCase().endsWith('.zip')) {
            const before = projects.length;
            await addZip(file);
            projects[before].sourceHandle = handle;
          } else if (file.name.toLowerCase().endsWith('.rar')) {
            (await addRar(file)).sourceHandle = handle;
          } else {
            const project = makeProject(file.name, 'file');
            project.sourceHandle = handle;
            await addFile(fileEntry(file, file.name), project);
          }
        } catch {
          issues.push({ path: handle.name, reason: 'read' });
        }
      }
      continue;
    }
    if (!(item instanceof File) && item.isDirectory) {
      const project = makeProject(item.name, 'folder');
      for await (const entry of directoryFiles(item as FileSystemDirectoryEntry, issues)) await addFile(entry, project);
      continue;
    }
    try {
      const file = item instanceof File ? item : await new Promise<File>((resolve, reject) => (item as FileSystemFileEntry).file(resolve, reject));
      if (file.name.toLowerCase().endsWith('.zip')) {
        await addZip(file);
        continue;
      }
      if (file.name.toLowerCase().endsWith('.rar')) {
        await addRar(file);
        continue;
      }
      const relativePath = file.webkitRelativePath || (!(item instanceof File) ? item.fullPath : file.name);
      const folderName = (file.webkitRelativePath || '').split('/')[0];
      let project: ProjectFile;
      if (folderName) {
        project = pickedFolders.get(folderName) ?? makeProject(folderName, 'folder');
        pickedFolders.set(folderName, project);
      } else {
        project = makeProject(file.name, 'file');
      }
      await addFile(fileEntry(file, relativePath), project);
    } catch {
      issues.push({ path: item.name, reason: 'read' });
    }
  }
  return { projects: projects.filter(p => p.files.length || p.otherFiles?.length), issues };
}


export function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_SIZE) {
        reject(new Error(`File ${file.name} is too large (${file.size} bytes). Max size is ${MAX_FILE_SIZE} bytes.`));
        return;
    }
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file, 'UTF-8'); 
  });
}

export function parseFileMeta(filePath: string, fileContent: string, fileType: string, projectType: ProjectType): { path: string; packageName: string } {
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  if (projectType === 'java' && fileType === JAVA_EXTENSION) {
    const packageNameFromContent = extractJavaPackageName(fileContent);
    return { path: filePath, packageName: packageNameFromContent };
  }
  
  if (projectType === 'web' || projectType === 'total') {
    const pathParts = normalizedPath.split('/');
    if (pathParts.length > 1) {
        pathParts.pop(); // remove filename
        const dirPath = pathParts.join('/');
        if (dirPath) {
            return { path: filePath, packageName: dirPath };
        }
    }
  }

  // Fallback for root files or other cases
  return { path: filePath, packageName: OTHER_FILES_PACKAGE_NAME_LOGIC };
}


export function extractJavaPackageName(content: string): string {
  if (typeof content !== 'string') return DEFAULT_PACKAGE_NAME_LOGIC;
  const packageMatch = content.match(/^\s*package\s+([a-zA-Z_][\w.]*);/m);
  return packageMatch && packageMatch[1] ? packageMatch[1] : DEFAULT_PACKAGE_NAME_LOGIC;
}

export function unifyProjectFiles(
    projects: ProjectFile[],
    isMultiProjectUnification: boolean
): UnificationResult {
    let contentBuilder = "";
    const fileMap: UnifiedFileMapEntry[] = [];

    projects.forEach((project, projectIndex) => {
        const selectedFiles = project.files.filter(f => f.selected);
        if (selectedFiles.length === 0) return;

        if (projectIndex > 0) {
            contentBuilder += '\n\n';
        }

        if (isMultiProjectUnification || projects.length > 1) {
            contentBuilder += `//############################################################\n`;
            contentBuilder += `// PROYECTO: ${project.name}\n`;
            contentBuilder += `//############################################################\n\n`;
        }

        const groupMap = new Map<string, ProcessedFile[]>();
        selectedFiles.forEach(file => {
            const list = groupMap.get(file.packageName) || [];
            list.push(file);
            groupMap.set(file.packageName, list);
        });

        const sortedGroupNames = Array.from(groupMap.keys()).sort((a, b) => {
            if (a === DEFAULT_PACKAGE_NAME_LOGIC) return -1;
            if (b === DEFAULT_PACKAGE_NAME_LOGIC) return 1;
            if (a === OTHER_FILES_PACKAGE_NAME_LOGIC && b !== DEFAULT_PACKAGE_NAME_LOGIC) return 1;
            if (b === OTHER_FILES_PACKAGE_NAME_LOGIC && a !== DEFAULT_PACKAGE_NAME_LOGIC) return -1;
            return a.localeCompare(b);
        });

        sortedGroupNames.forEach((groupName) => {
            const filesInGroup = groupMap.get(groupName)!.sort((a, b) => a.name.localeCompare(b.name));

            let groupTitle = "Grupo";
            if (groupName.includes('.') && !groupName.includes('/')) {
                groupTitle = "Paquete";
            } else if (groupName.includes('/')) {
                groupTitle = "Directorio";
            }
            contentBuilder += `//============================================================\n`;
            contentBuilder += `// ${groupTitle}: ${groupName}\n`;
            contentBuilder += `//============================================================\n\n`;

            filesInGroup.forEach((file) => {
                const start = contentBuilder.length;

                contentBuilder += `//------------------------------------------------------------\n`;
                contentBuilder += `// Archivo (Tipo: ${file.fileType.toUpperCase()}): ${file.name}\n`;
                contentBuilder += `// Path: ${file.path}\n`;
                contentBuilder += `//------------------------------------------------------------\n\n`;

                contentBuilder += file.content + "\n\n";

                const end = contentBuilder.length;
                fileMap.push({
                    fileName: file.name,
                    fileType: file.fileType,
                    projectName: project.name,
                    projectIndex,
                    groupName,
                    start,
                    end,
                });
            });
        });
    });

    return { content: contentBuilder, fileMap };
}


export function downloadTextFile(filename: string, text: string) {
  const element = document.createElement('a');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  element.href = url;
  
  let safeFilename = filename.replace(/[^a-z0-9_.\-]/gi, '_');
  if (!safeFilename.toLowerCase().endsWith(".txt")) {
      safeFilename += ".txt";
  }
  safeFilename = safeFilename || "unificado.txt";

  element.setAttribute('download', safeFilename);
  
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
