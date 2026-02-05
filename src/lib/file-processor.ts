import JSZip from 'jszip';
import type { ProcessedFile, ProjectFile } from '@/types/java-unifier';
import { DEFAULT_PACKAGE_NAME_LOGIC, OTHER_FILES_PACKAGE_NAME_LOGIC } from '@/lib/translations';

const MAX_FILE_SIZE = 1024 * 1024 * 5; // 5MB limit per file
const MAX_TOTAL_FILES = 250; // Max number of files to process

export const PROJECT_CONFIG = {
  java: {
    extensions: ['java', 'xml', 'properties', 'pom', 'gradle', 'kt', 'kts', 'sql', 'classpath', 'project'],
    defaultSelected: ['java', 'kt', 'xml', 'gradle', 'pom']
  },
  web: {
    extensions: ['html', 'css', 'scss', 'less', 'js', 'ts', 'jsx', 'tsx', 'json', 'md', 'svg', 'vue', 'svelte', 'yaml', 'yml', 'env', 'mjs', 'cjs', 'dockerfile', 'gitignore', 'package.json', 'tsconfig.json'],
    defaultSelected: ['html', 'css', 'scss', 'js', 'ts', 'jsx', 'tsx', 'vue', 'svelte']
  },
  total: {
    extensions: ['java', 'xml', 'properties', 'pom', 'gradle', 'kt', 'kts', 'sql', 'html', 'css', 'scss', 'less', 'js', 'ts', 'jsx', 'tsx', 'json', 'md', 'svg', 'vue', 'svelte', 'yaml', 'yml', 'env', 'mjs', 'cjs', 'dockerfile', 'gitignore', 'package.json', 'tsconfig.json', 'txt', 'csv', 'dat', 'classpath', 'project', 'py', 'rb', 'php', 'sh', 'bat'],
    defaultSelected: ['java', 'kt', 'js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'sql', 'json', 'md']
  }
};
export type ProjectType = keyof typeof PROJECT_CONFIG;

// A flat list of all supported extensions across all project types
export const ALL_SUPPORTED_EXTENSIONS = [...new Set(Object.values(PROJECT_CONFIG).flatMap(config => config.extensions))];

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

export function getFileExtension(fileName: string): string {
    if (!fileName || typeof fileName !== 'string') return 'unknown';

    // Handle special full filenames first
    const lowerFileName = fileName.toLowerCase();
    if (lowerFileName.endsWith('package.json')) return 'package.json';
    if (lowerFileName.endsWith('tsconfig.json')) return 'tsconfig.json';
    if (lowerFileName.endsWith('.gitignore')) return 'gitignore';
    if (lowerFileName.endsWith('dockerfile')) return 'dockerfile';

    if (fileName.startsWith('.')) { 
        const potentialExtension = fileName.substring(1).toLowerCase();
        if (ALL_SUPPORTED_EXTENSIONS.includes(potentialExtension)) {
            return potentialExtension;
        }
    }
    if (lowerFileName === 'pom.xml') return 'pom';
    if (lowerFileName.endsWith('.gradle')) return 'gradle';


    const parts = fileName.split('.');
    if (parts.length > 1) {
        const lastPart = parts.pop()?.toLowerCase();
        if (lastPart && ALL_SUPPORTED_EXTENSIONS.includes(lastPart)) {
            return lastPart;
        }
    }
    return 'unknown';
}


function isSupportedFile(fileName: string, projectType: ProjectType): boolean {
  const extension = getFileExtension(fileName);
  return PROJECT_CONFIG[projectType].extensions.includes(extension);
}

async function _processZipFile(file: File, projectType: ProjectType): Promise<ProjectFile | null> {
    const projectName = getProjectBaseName(file.name);
    const project: ProjectFile = {
        id: `${projectName}-${Date.now()}-${Math.random()}`,
        name: projectName,
        type: 'folder', // Treat as folder
        files: [],
        timestamp: Date.now(),
    };

    try {
        const zip = await JSZip.loadAsync(file);
        const fileProcessingPromises: Promise<ProcessedFile | null>[] = [];

        zip.forEach((relativePath, zipEntry) => {
            if (!zipEntry.dir) {
                const fileName = zipEntry.name.split('/').pop() || zipEntry.name;
                
                if (isSupportedFile(fileName, projectType)) {
                    const promise = (async () => {
                        try {
                            const content = await zipEntry.async('string');
                            
                            if (new Blob([content]).size > MAX_FILE_SIZE) {
                                console.warn(`File ${fileName} in zip exceeds size limit and was skipped.`);
                                return null;
                            }

                            const fileType = getFileExtension(fileName);
                            const { path, packageName } = parseFileMeta(zipEntry.name, content, fileType, projectType);

                            const processedFile: ProcessedFile = {
                                id: `${project.id}-${path}-${fileName}-${Math.random()}`,
                                path: path,
                                name: fileName,
                                content: content,
                                packageName: packageName,
                                fileType: fileType,
                                projectName: project.name,
                                selected: PROJECT_CONFIG[projectType].defaultSelected.includes(fileType),
                            };
                            return processedFile;
                        } catch (readError) {
                            console.warn(`Could not read file ${fileName} from zip:`, readError);
                            return null;
                        }
                    })();
                    fileProcessingPromises.push(promise);
                }
            }
        });

        const allFiles = (await Promise.all(fileProcessingPromises)).filter((f): f is ProcessedFile => f !== null);
        
        project.files.push(...allFiles);

        if (project.files.length > 0) {
            return project;
        }

    } catch (e) {
        console.error(`Failed to process zip file ${file.name}: `, e);
    }

    return null;
}


export async function processDroppedItems(items: FileSystemFileEntry[], projectType: ProjectType): Promise<ProjectFile[]> {
  const projects: ProjectFile[] = [];
  let totalFilesProcessed = 0;

  for (const item of items) {
    if (totalFilesProcessed >= MAX_TOTAL_FILES) {
        console.warn(`Reached maximum file processing limit (${MAX_TOTAL_FILES}). Some files may not have been processed.`);
        break;
    }

    const isZipFile = item.name.toLowerCase().endsWith('.zip');
    if (isZipFile && item.isFile) {
        try {
            const file = await new Promise<File>((resolve, reject) => (item as FileSystemFileEntry).file(resolve, reject));
            const zipProject = await _processZipFile(file, projectType);
            if(zipProject && zipProject.files.length > 0) {
                projects.push(zipProject);
                totalFilesProcessed += zipProject.files.length;
            }
        } catch (e) {
            console.error(`Error processing dropped zip item ${item.name}:`, e);
        }
        continue; // Move to next item
    }


    const projectName = getProjectBaseName(item.name);
    const project: ProjectFile = {
      id: `${projectName}-${Date.now()}-${Math.random()}`,
      name: projectName,
      type: item.isDirectory ? 'folder' : 'file',
      files: [],
      timestamp: Date.now(),
    };

    if (item.isDirectory) {
      const filesInDir = await getFilesInDirectory(item as FileSystemDirectoryEntry);
      for (const file of filesInDir) { 
        if (totalFilesProcessed >= MAX_TOTAL_FILES) break;
        
        const fileType = getFileExtension(file.name);
        if (isSupportedFile(file.name, projectType) && file.size <= MAX_FILE_SIZE) {
          try {
            const content = await readFileContent(file);
            const filePathForMeta = (file as any).webkitRelativePath || file.name;
            const { path, packageName } = parseFileMeta(filePathForMeta, content, fileType, projectType);
            
            project.files.push({
              id: `${project.id}-${path}-${file.name}-${Math.random()}`, 
              path,
              name: file.name,
              content,
              packageName,
              fileType,
              projectName: project.name,
              selected: PROJECT_CONFIG[projectType].defaultSelected.includes(fileType),
            });
            totalFilesProcessed++;
          } catch (error) {
            console.warn(`Could not read file ${file.name}:`, error);
          }
        } else if (isSupportedFile(file.name, projectType) && file.size > MAX_FILE_SIZE) {
            console.warn(`File ${file.name} exceeds size limit (${MAX_FILE_SIZE} bytes) and was skipped.`);
        }
      }
    } else if (item.isFile && isSupportedFile(item.name, projectType)) {
      const filePromise = new Promise<File>((resolve, reject) => (item as FileSystemFileEntry).file(resolve, reject));
      try {
        const file = await filePromise;
        const fileType = getFileExtension(file.name);
        if (file.size <= MAX_FILE_SIZE && totalFilesProcessed < MAX_TOTAL_FILES) {
          const content = await readFileContent(file);
          const { path, packageName } = parseFileMeta(file.name, content, fileType, projectType);
          project.files.push({
            id: `${project.id}-${path}-${file.name}-${Math.random()}`,
            path, 
            name: file.name,
            content,
            packageName,
            fileType,
            projectName: project.name,
            selected: PROJECT_CONFIG[projectType].defaultSelected.includes(fileType),
          });
          totalFilesProcessed++;
        } else if (file.size > MAX_FILE_SIZE) {
          console.warn(`File ${file.name} exceeds size limit (${MAX_FILE_SIZE} bytes) and was skipped.`);
        }
      } catch (error) {
        console.warn(`Could not read file ${item.name}:`, error);
      }
    }
    
    if (project.files.length > 0) {
      projects.push(project);
    }
  }
  return projects;
}

async function getFilesInDirectory(directory: FileSystemDirectoryEntry): Promise<File[]> {
  const files: File[] = [];
  const reader = directory.createReader();

  return new Promise<File[]>((resolve, reject) => {
    const readEntries = () => {
      reader.readEntries(async (entries) => {
        if (entries.length === 0) {
          resolve(files);
          return;
        }
        for (const entry of entries) {
          if (entry.isFile) {
            const fileEntry = entry as FileSystemFileEntry;
            try {
                const file = await new Promise<File>((res, rej) => fileEntry.file(res, rej));
                if (!(file as any).webkitRelativePath) { 
                    Object.defineProperty(file, 'webkitRelativePath', { 
                        value: entry.fullPath.startsWith('/') ? entry.fullPath.substring(1) : entry.fullPath,
                        writable: true 
                    });
                }
                files.push(file);
            } catch (fileError) {
                console.warn(`Could not access file ${entry.name}:`, fileError);
            }
          } else if (entry.isDirectory) {
            try {
                files.push(...await getFilesInDirectory(entry as FileSystemDirectoryEntry));
            } catch (dirError){
                 console.warn(`Could not read directory ${entry.name}:`, dirError);
            }
          }
        }
        readEntries(); 
      }, reject); 
    };
    readEntries();
  });
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

function parseFileMeta(filePath: string, fileContent: string, fileType: string, projectType: ProjectType): { path: string; packageName: string } {
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
): string {
  const sb: string[] = [];
  
  for (const project of projects) {
    const selectedFiles = project.files.filter(f => f.selected);
    if (selectedFiles.length === 0) continue;

    if (isMultiProjectUnification || sb.length === 0) { 
        if (sb.length > 0) sb.push("\n\n"); 
        sb.push(`//############################################################`);
        sb.push(`// PROYECTO: ${project.name}`);
        sb.push(`//############################################################\n`);
    }
    
    const groupMap = new Map<string, ProcessedFile[]>();
    selectedFiles.forEach(file => {
        const list = groupMap.get(file.packageName) || [];
        list.push(file);
        groupMap.set(file.packageName, list);
    });

    const sortedGroupNames = Array.from(groupMap.keys()).sort((a,b) => {
        if (a === DEFAULT_PACKAGE_NAME_LOGIC) return -1;
        if (b === DEFAULT_PACKAGE_NAME_LOGIC) return 1;
        if (a === OTHER_FILES_PACKAGE_NAME_LOGIC && b !== DEFAULT_PACKAGE_NAME_LOGIC) return 1; 
        if (b === OTHER_FILES_PACKAGE_NAME_LOGIC && a !== DEFAULT_PACKAGE_NAME_LOGIC) return -1;
        return a.localeCompare(b);
    });

    for (const groupName of sortedGroupNames) {
        const filesInGroup = groupMap.get(groupName)!.sort((a,b) => a.name.localeCompare(b.name));
        
        let groupTitle = "Grupo";
        if (groupName.includes('.') && !groupName.includes('/')) {
            groupTitle = "Paquete";
        } else if (groupName.includes('/')) {
            groupTitle = "Directorio";
        }

        sb.push(`//============================================================`);
        sb.push(`// ${groupTitle}: ${groupName}`);
        sb.push(`//============================================================\n`);

        for (const file of filesInGroup) {
            sb.push(`//------------------------------------------------------------`);
            sb.push(`// Archivo (Tipo: ${file.fileType.toUpperCase()}): ${file.name}`);
            sb.push(`// Path: ${file.path}`); 
            sb.push(`//------------------------------------------------------------\n`);
            sb.push(file.content.trim());
            sb.push("\n\n"); 
        }
    }
  }
  return sb.join('\n').trim();
}

export function downloadTextFile(filename: string, text: string) {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  
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
}
