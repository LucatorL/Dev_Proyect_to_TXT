
import type { ProcessedFile, ProjectFile } from '@/types/java-unifier';

const MAX_FILE_SIZE = 1024 * 1024 * 5; // 5MB limit per file for client-side processing
const MAX_TOTAL_FILES = 200; // Max number of files to process to prevent browser freeze

export const SUPPORTED_EXTENSIONS = ['java', 'xml', 'txt', 'properties', 'md', 'sql', 'csv', 'yaml', 'yml', 'pom', 'classpath', 'project', 'dat'];
const JAVA_EXTENSION = 'java';
export const OTHER_FILES_PACKAGE_NAME = "(Other Project Files)";
export const DEFAULT_PACKAGE_NAME = "(Default Package)";

// Basic function to get project base name
export function getProjectBaseName(name: string): string {
  if (!name) return "UntitledProject";
  let baseName = name;
  if (baseName.toLowerCase().endsWith(".zip")) {
    baseName = baseName.substring(0, baseName.length - 4);
  } else if (baseName.toLowerCase().endsWith(".rar")) {
    baseName = baseName.substring(0, baseName.length - 4);
  }
  baseName = baseName.replace(/\s*\(\d+\)$/, "").trim();
  baseName = baseName.replace(/_unificado$/, "").trim(); // Clean up suffix if present
  return baseName.length > 0 ? baseName : "UntitledProject";
}

export function getFileExtension(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') return 'unknown';
  
  // Handle filenames that are the extension itself (e.g., ".classpath", "pom.xml" where "pom" could be considered)
  // More robust check for hidden files or files that look like extensions
  if (fileName.startsWith('.')) { 
    const potentialExtension = fileName.substring(1);
    if (SUPPORTED_EXTENSIONS.includes(potentialExtension)) {
      return potentialExtension;
    }
  }
  // For pom.xml specifically
  if (fileName.toLowerCase() === 'pom.xml') {
    return 'pom';
  }

  const parts = fileName.split('.');
  if (parts.length > 1) {
    const lastPart = parts.pop()?.toLowerCase();
    if (lastPart && SUPPORTED_EXTENSIONS.includes(lastPart)) {
      return lastPart;
    }
    // If "pom.xml", parts would be ["pom", "xml"], lastPart is "xml"
    // If "my.classpath", parts would be ["my", "classpath"], lastPart is "classpath"
  }
  return 'unknown'; // No recognized extension found
}

function isSupportedFile(fileName: string): boolean {
  const extension = getFileExtension(fileName);
  return SUPPORTED_EXTENSIONS.includes(extension) && extension !== 'unknown';
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
            const { path, packageName } = parseFileMeta(filePathForMeta, content, fileType);
            
            project.files.push({
              id: `${project.id}-${path}-${file.name}-${Math.random()}`, // More unique file ID
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
          const { path, packageName } = parseFileMeta(file.name, content, fileType);
          project.files.push({
            id: `${project.id}-${path}-${file.name}-${Math.random()}`,
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
                if (!(file as any).webkitRelativePath) { // Ensure webkitRelativePath exists for path parsing
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

function parseFileMeta(filePath: string, fileContent: string, fileType: string): { path: string; packageName: string } {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const parts = normalizedPath.split('/').filter(p => p !== '' && p !== '.');
  
  // The path prop in ProcessedFile should be the relative path for display.
  // For a single file dropped, filePath might just be its name.
  // For a file in a directory, filePath is like "MyProject/src/com/example/MyClass.java"
  // We want to keep this relative path.

  if (fileType !== JAVA_EXTENSION) {
    return { path: filePath, packageName: OTHER_FILES_PACKAGE_NAME };
  }

  const packageNameFromContent = extractJavaPackageName(fileContent);
  if (packageNameFromContent !== DEFAULT_PACKAGE_NAME) {
      return { path: filePath, packageName: packageNameFromContent };
  }

  // Fallback: Try to derive package name from path if not found in content
  // This is a heuristic and might not always be correct if folder structure doesn't match package
  const commonSourceRoots = ["src/main/java", "src/test/java", "src"];
  let packageStartIndex = -1;

  // Iterate backwards to find the deepest common source root
  for (let i = parts.length - 2; i >= 0; i--) { // -2 to exclude filename
    const currentPathPrefix = parts.slice(0, i + 1).join('/');
    if (commonSourceRoots.some(root => filePath.toLowerCase().includes(root.toLowerCase() + '/'))) {
        // Find where the actual package structure might begin after the root
        const rootPath = commonSourceRoots.find(root => filePath.toLowerCase().includes(root.toLowerCase() + '/'))!;
        const rootIndexInParts = parts.findIndex(p => rootPath.endsWith(p.toLowerCase())); // simplified
        if (rootIndexInParts !== -1 && rootIndexInParts < parts.length -1) {
             packageStartIndex = rootIndexInParts + 1;
             break;
        }
    }
  }
  
  let packageNameFromPath = DEFAULT_PACKAGE_NAME;
  if (packageStartIndex !== -1 && packageStartIndex < parts.length - 1) {
      packageNameFromPath = parts.slice(packageStartIndex, parts.length -1).join('.');
  } else if (parts.length > 1) { // If no common source root found, but there are parent dirs
      // This is a very basic fallback if no src roots are found.
      // It might grab parts of the project name if it's like "project/com/mypackage/File.java"
      // For a simple drop of "com/mypackage/File.java", it would be "com.mypackage"
      // Check if parts before filename look like package structure
      const potentialPackageParts = parts.slice(0, parts.length - 1);
      if (potentialPackageParts.every(p => /^[a-zA-Z_]\w*$/.test(p))) {
         packageNameFromPath = potentialPackageParts.join('.');
      }
  }
  
  return { path: filePath, packageName: packageNameFromPath || DEFAULT_PACKAGE_NAME };
}

export function extractJavaPackageName(content: string): string {
  if (typeof content !== 'string') return DEFAULT_PACKAGE_NAME;
  const packageMatch = content.match(/^\s*package\s+([a-zA-Z_][\w.]*);/m);
  return packageMatch && packageMatch[1] ? packageMatch[1] : DEFAULT_PACKAGE_NAME;
}


export function unifyJavaFiles( 
  projects: ProjectFile[],
  isMultiProjectUnification: boolean 
): string {
  const sb: string[] = [];
  
  for (const project of projects) {
    const selectedFiles = project.files.filter(f => f.selected);
    if (selectedFiles.length === 0) continue;

    // Add project header if multiple projects are being unified OR if it's the first project in the output
    if (isMultiProjectUnification || sb.length === 0) { 
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
        if (a === DEFAULT_PACKAGE_NAME) return -1;
        if (b === DEFAULT_PACKAGE_NAME) return 1;
        if (a === OTHER_FILES_PACKAGE_NAME && b !== DEFAULT_PACKAGE_NAME) return 1; 
        if (b === OTHER_FILES_PACKAGE_NAME && a !== DEFAULT_PACKAGE_NAME) return -1;
        return a.localeCompare(b);
    });

    for (const packageName of sortedPackageNames) {
        const filesInPackage = packageMap.get(packageName)!.sort((a,b) => a.name.localeCompare(b.name));
        
        sb.push(`//============================================================`);
        sb.push(`// Paquete: ${packageName}`); 
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


    