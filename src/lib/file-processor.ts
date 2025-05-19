
import type { ProcessedFile, ProjectFile } from '@/types/java-unifier';

const MAX_FILE_SIZE = 1024 * 1024 * 5; // 5MB limit per file for client-side processing
const MAX_TOTAL_FILES = 200; // Max number of files to process to prevent browser freeze

const SUPPORTED_EXTENSIONS = ['java', 'xml', 'txt', 'properties', 'md', 'sql', 'csv', 'yaml', 'yml', 'pom'];
const JAVA_EXTENSION = 'java';
const OTHER_FILES_PACKAGE_NAME = "(Other Project Files)";

// Basic function to get project base name
export function getProjectBaseName(name: string): string {
  let baseName = name;
  if (baseName.toLowerCase().endsWith(".zip")) {
    baseName = baseName.substring(0, baseName.length - 4);
  } else if (baseName.toLowerCase().endsWith(".rar")) {
    baseName = baseName.substring(0, baseName.length - 4);
  }
  baseName = baseName.replace(/\s*\(\d+\)$/, "").trim();
  return baseName.length > 0 ? baseName : "UntitledProject";
}

function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || 'unknown';
}

function isSupportedFile(fileName: string): boolean {
  const extension = getFileExtension(fileName);
  return SUPPORTED_EXTENSIONS.includes(extension);
}

// Processes dropped files/folders to extract relevant files
export async function processDroppedItems(items: FileSystemFileEntry[]): Promise<ProjectFile[]> {
  const projects: ProjectFile[] = [];
  let totalFilesProcessed = 0;

  for (const item of items) {
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
      for (const file of filesInDir) { // file here is a File object
        if (totalFilesProcessed >= MAX_TOTAL_FILES) break;
        
        const fileType = getFileExtension(file.name);
        if (isSupportedFile(file.name) && file.size <= MAX_FILE_SIZE) {
          try {
            const content = await readFileContent(file);
            const filePathForMeta = (file as any).webkitRelativePath || file.name;
            const { path, packageName } = parseFileMeta(filePathForMeta, fileType);
            
            project.files.push({
              id: `${project.id}-${path}-${file.name}`, // More unique file ID
              path,
              name: file.name,
              content,
              packageName,
              fileType,
              projectName: project.name,
              selected: fileType === JAVA_EXTENSION, // Java files selected by default
            });
            totalFilesProcessed++;
          } catch (error) {
            console.warn(`Could not read file ${file.name}:`, error);
          }
        } else if (isSupportedFile(file.name) && file.size > MAX_FILE_SIZE) {
            console.warn(`File ${file.name} exceeds size limit (${MAX_FILE_SIZE} bytes) and was skipped.`);
        }
      }
    } else if (item.isFile && isSupportedFile(item.name)) {
      const filePromise = new Promise<File>((resolve, reject) => (item as FileSystemFileEntry).file(resolve, reject));
      try {
        const file = await filePromise;
        const fileType = getFileExtension(file.name);
        if (file.size <= MAX_FILE_SIZE && totalFilesProcessed < MAX_TOTAL_FILES) {
          const content = await readFileContent(file);
          const { path, packageName } = parseFileMeta(file.name, fileType);
          project.files.push({
            id: `${project.id}-${path}-${file.name}`,
            path, 
            name: file.name,
            content,
            packageName,
            fileType,
            projectName: project.name,
            selected: fileType === JAVA_EXTENSION,
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
    if (totalFilesProcessed >= MAX_TOTAL_FILES) {
        console.warn(`Reached maximum file processing limit (${MAX_TOTAL_FILES}). Some files may not have been processed.`);
        break;
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


function readFileContent(file: File): Promise<string> {
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

function parseFileMeta(filePath: string, fileType: string): { path: string; packageName: string } {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const parts = normalizedPath.split('/').filter(p => p !== '' && p !== '.');
  
  const fileName = parts.pop() || ''; 

  if (fileType !== JAVA_EXTENSION) {
    // For non-Java files, group them under a special package name
    // Their path is still the full original relative path.
    return { path: filePath, packageName: OTHER_FILES_PACKAGE_NAME };
  }

  // Java file: attempt to derive package name
  const commonSourceRoots = ["src/main/java", "src/test/java", "src"];
  let packageStartIndex = 0;
  for (let i = 0; i < parts.length; i++) {
    const currentPathPrefix = parts.slice(0, i + 1).join('/');
    if (commonSourceRoots.includes(currentPathPrefix.toLowerCase())) {
      packageStartIndex = i + 1;
    }
  }
  const packageParts = parts.slice(packageStartIndex);
  const packageName = packageParts.join('.') || "(Default Package)";
  
  return { path: filePath, packageName: packageName };
}


export function unifyJavaFiles( // Renaming this might be good later if it truly unifies more than Java
  projects: ProjectFile[],
  isMultiProjectUnification: boolean // This parameter might be less relevant if unification always handles multi-project structure
): string {
  const sb: string[] = [];
  
  for (const project of projects) {
    const selectedFiles = project.files.filter(f => f.selected);
    if (selectedFiles.length === 0) continue;

    // Add project header if multiple projects are being processed together, or if it's the first one.
    if (projects.length > 1 || sb.length === 0) { // Always add for the first project if it's the only one as well
        if (sb.length > 0) sb.push("\n\n"); 
        sb.push(`//############################################################`);
        sb.push(`// PROYECTO: ${project.name}`);
        sb.push(`//############################################################\n`);
    }
    
    const packageMap = new Map<string, ProcessedFile[]>();
    selectedFiles.forEach(file => {
        const list = packageMap.get(file.packageName) || [];
        list.push(file);
        packageMap.set(file.packageName, list);
    });

    const sortedPackageNames = Array.from(packageMap.keys()).sort((a,b) => {
        if (a === '(Default Package)') return -1;
        if (b === '(Default Package)') return 1;
        if (a === OTHER_FILES_PACKAGE_NAME) return 1; // Put "Other Project Files" last or first? Let's try last among custom packages.
        if (b === OTHER_FILES_PACKAGE_NAME) return -1;
        return a.localeCompare(b);
    });

    for (const packageName of sortedPackageNames) {
        const filesInPackage = packageMap.get(packageName)!.sort((a,b) => a.name.localeCompare(b.name));
        
        sb.push(`//============================================================`);
        sb.push(`// Paquete: ${packageName}`); // This will show "(Other Project Files)" as a package
        sb.push(`//============================================================\n`);

        for (const file of filesInPackage) {
            sb.push(`//------------------------------------------------------------`);
            if (file.fileType === JAVA_EXTENSION) {
                sb.push(`// Archivo Java: ${file.name}`);
            } else {
                sb.push(`// Archivo (Tipo: ${file.fileType.toUpperCase()}): ${file.name}`);
            }
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
  
  const safeFilename = filename.replace(/[^a-z0-9_.\-]/gi, '_') || "unificado.txt";
  element.setAttribute('download', safeFilename);
  
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}
