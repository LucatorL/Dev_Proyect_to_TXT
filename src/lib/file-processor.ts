import JSZip from 'jszip';
import type { ProcessedFile, ProjectFile, CommentOption } from '@/types/java-unifier';
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

async function getFileEntriesInDirectory(directory: FileSystemDirectoryEntry): Promise<FileSystemFileEntry[]> {
  const fileEntries: FileSystemFileEntry[] = [];
  const reader = directory.createReader();

  return new Promise<FileSystemFileEntry[]>((resolve, reject) => {
    const readEntries = () => {
      reader.readEntries(async (entries) => {
        if (entries.length === 0) {
          resolve(fileEntries);
          return;
        }
        for (const entry of entries) {
          if (entry.isFile) {
            // Add webkitRelativePath polyfill for files from manual selection
            const file = await new Promise<File>((res) => (entry as FileSystemFileEntry).file(res));
            if (!(file as any).webkitRelativePath) { 
                Object.defineProperty(file, 'webkitRelativePath', { 
                    value: entry.fullPath.startsWith('/') ? entry.fullPath.substring(1) : entry.fullPath,
                    writable: true 
                });
            }
            fileEntries.push(entry as FileSystemFileEntry);
          } else if (entry.isDirectory) {
            fileEntries.push(...await getFileEntriesInDirectory(entry as FileSystemDirectoryEntry));
          }
        }
        readEntries();
      }, reject);
    };
    readEntries();
  });
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

                            return {
                                id: `${project.id}-${path}-${fileName}-${Math.random()}`,
                                path: path,
                                name: fileName,
                                content: content,
                                packageName: packageName,
                                fileType: fileType,
                                projectName: project.name,
                                selected: PROJECT_CONFIG[projectType].defaultSelected.includes(fileType),
                            };
                        } catch (readError) {
                            console.warn(`Could not read file ${fileName} from zip:`, readError);
                            return null;
                        }
                    })();
                    fileProcessingPromises.push(promise);
                }
                // Note: 'otherFiles' from zips are not handled in this version for simplicity.
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


export async function processDroppedItems(items: FileSystemFileEntry[], projectType: ProjectType): Promise<{ projects: ProjectFile[] }> {
  const projects: ProjectFile[] = [];
  let totalFilesProcessed = 0;

  const projectMap = new Map<string, ProjectFile>();

  for (const item of items) {
    if (totalFilesProcessed >= MAX_TOTAL_FILES) {
        console.warn(`Reached maximum file processing limit (${MAX_TOTAL_FILES}).`);
        break;
    }

    if (item.isFile && item.name.toLowerCase().endsWith('.zip')) {
        try {
            const file = await new Promise<File>((resolve, reject) => item.file(resolve, reject));
            const zipProject = await _processZipFile(file, projectType);
            if(zipProject && zipProject.files.length > 0) {
                projects.push(zipProject);
                totalFilesProcessed += zipProject.files.length;
            }
        } catch (e) {
            console.error(`Error processing zip item ${item.name}:`, e);
        }
    } else if (item.isDirectory) {
        const fileEntries = await getFileEntriesInDirectory(item as FileSystemDirectoryEntry);
        const projectName = getProjectBaseName(item.name);
        let project = projectMap.get(projectName);
        if (!project) {
            project = {
                id: `${projectName}-${Date.now()}-${Math.random()}`,
                name: projectName, type: 'folder', files: [], timestamp: Date.now(), otherFiles: []
            };
            projectMap.set(projectName, project);
        }

        for (const fileEntry of fileEntries) {
             if (isSupportedFile(fileEntry.name, projectType)) {
                 try {
                     const file = await new Promise<File>((res) => fileEntry.file(res));
                     if (file.size <= MAX_FILE_SIZE) {
                         const content = await readFileContent(file);
                         const filePathForMeta = (file as any).webkitRelativePath || fileEntry.fullPath;
                         const fileType = getFileExtension(file.name);
                         const { path, packageName } = parseFileMeta(filePathForMeta, content, fileType, projectType);
                         
                         project.files.push({
                           id: `${project.id}-${path}-${file.name}-${Math.random()}`, 
                           path, name: file.name, content, packageName, fileType,
                           projectName: project.name,
                           selected: PROJECT_CONFIG[projectType].defaultSelected.includes(fileType),
                         });
                         totalFilesProcessed++;
                     }
                 } catch (e) { console.warn(`Could not read file ${fileEntry.name}`, e); }
             } else {
                 const extension = getFileExtension(fileEntry.name);
                 if (ALL_SUPPORTED_EXTENSIONS.includes(extension)) {
                    project.otherFiles!.push(fileEntry);
                 }
             }
        }

    } else if (item.isFile) {
        const projectName = getProjectBaseName(item.name);
        let project = projectMap.get(projectName);
        if (!project) {
            project = {
                id: `${projectName}-${Date.now()}-${Math.random()}`,
                name: projectName, type: 'file', files: [], timestamp: Date.now(), otherFiles: []
            };
            projectMap.set(projectName, project);
        }
         if (isSupportedFile(item.name, projectType)) {
             try {
                 const file = await new Promise<File>((res) => (item as FileSystemFileEntry).file(res));
                 if (file.size <= MAX_FILE_SIZE) {
                     const content = await readFileContent(file);
                     const fileType = getFileExtension(file.name);
                     const { path, packageName } = parseFileMeta(file.name, content, fileType, projectType);

                     project.files.push({
                       id: `${project.id}-${path}-${file.name}-${Math.random()}`,
                       path, name: file.name, content, packageName, fileType,
                       projectName: project.name,
                       selected: PROJECT_CONFIG[projectType].defaultSelected.includes(fileType),
                     });
                     totalFilesProcessed++;
                 }
             } catch(e) { console.warn(`Could not read file ${item.name}`, e); }
         } else {
            const extension = getFileExtension(item.name);
            if (ALL_SUPPORTED_EXTENSIONS.includes(extension)) {
                project.otherFiles!.push(item as FileSystemFileEntry);
            }
         }
    }
  }

  projectMap.forEach(proj => {
    if (proj.files.length > 0 || (proj.otherFiles && proj.otherFiles.length > 0)) {
      projects.push(proj);
    }
  });

  return { projects };
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

const removePastUnificationComments = (content: string): string => {
    // This regex targets the specific comment patterns added by the app.
    // It looks for lines starting with optional whitespace, then //, then ####, ====, or ----
    const appCommentRegex = /(^\s*\/\/(#|={5,}|-{5,}).*$\r?\n?)/gm;
    return content.replace(appCommentRegex, '');
};

const removeAllCommentsFromCode = (content: string, fileType: string): string => {
    let cleanedContent = content;
    // Generic C-style comments (JS, Java, CSS, etc.)
    cleanedContent = cleanedContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
    
    // Specific types
    if (['xml', 'html', 'vue', 'svelte', 'pom'].includes(fileType)) {
        cleanedContent = cleanedContent.replace(/<!--[\s\S]*?-->/g, '');
    }
    if (['py', 'sh', 'rb', 'yaml', 'yml'].includes(fileType)) {
        cleanedContent = cleanedContent.replace(/#.*/g, '');
    }
    if (['sql'].includes(fileType)) {
        cleanedContent = cleanedContent.replace(/--.*/g, '');
    }
    
    // Remove empty lines that might result from comment removal
    return cleanedContent.replace(/^\s*[\r\n]/gm, '').trim();
};


export function unifyProjectFiles( 
  projects: ProjectFile[],
  isMultiProjectUnification: boolean,
  commentOption: CommentOption = 'default'
): string {
  const sb: string[] = [];
  
  for (const project of projects) {
    const selectedFiles = project.files.filter(f => f.selected);
    if (selectedFiles.length === 0) continue;

    if (commentOption !== 'noAppComments' && commentOption !== 'removeAllComments') {
        if (isMultiProjectUnification || sb.length === 0) { 
            if (sb.length > 0) sb.push("\n\n"); 
            sb.push(`//############################################################`);
            sb.push(`// PROYECTO: ${project.name}`);
            sb.push(`//############################################################\n`);
        }
    }
    
    const groupMap = new Map<string, ProcessedFile[]>();
    selectedFiles.forEach(file => {
        let content = file.content;
        
        if (commentOption === 'removePastAppComments') {
            content = removePastUnificationComments(content);
        } else if (commentOption === 'removeAllComments') {
            content = removeAllCommentsFromCode(content, file.fileType);
        }

        const updatedFile = { ...file, content: content };
        const list = groupMap.get(file.packageName) || [];
        list.push(updatedFile);
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
        
        if (commentOption !== 'noAppComments' && commentOption !== 'removeAllComments') {
            let groupTitle = "Grupo";
            if (groupName.includes('.') && !groupName.includes('/')) {
                groupTitle = "Paquete";
            } else if (groupName.includes('/')) {
                groupTitle = "Directorio";
            }

            sb.push(`//============================================================`);
            sb.push(`// ${groupTitle}: ${groupName}`);
            sb.push(`//============================================================\n`);
        }

        for (const file of filesInGroup) {
            if (commentOption !== 'noAppComments' && commentOption !== 'removeAllComments') {
                sb.push(`//------------------------------------------------------------`);
                sb.push(`// Archivo (Tipo: ${file.fileType.toUpperCase()}): ${file.name}`);
                sb.push(`// Path: ${file.path}`); 
                sb.push(`//------------------------------------------------------------\n`);
            }
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
