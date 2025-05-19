import type { JavaFile, ProjectFile } from '@/types/java-unifier';

const MAX_FILE_SIZE = 1024 * 1024 * 5; // 5MB limit per file for client-side processing
const MAX_TOTAL_FILES = 100; // Max number of java files to process to prevent browser freeze

// Basic function to get project base name, similar to Java's getProjectBaseName
export function getProjectBaseName(name: string): string {
  let baseName = name;
  // Remove common archive extensions if present at the end of the name string
  if (baseName.toLowerCase().endsWith(".zip")) {
    baseName = baseName.substring(0, baseName.length - 4);
  } else if (baseName.toLowerCase().endsWith(".rar")) {
    baseName = baseName.substring(0, baseName.length - 4);
  }
  // Remove suffixes like (1), (2), etc.
  baseName = baseName.replace(/\s*\(\d+\)$/, "").trim();
  return baseName.length > 0 ? baseName : "UntitledProject";
}

// Processes dropped files/folders to extract Java files
export async function processDroppedItems(items: FileSystemFileEntry[]): Promise<ProjectFile[]> {
  const projects: ProjectFile[] = [];
  let totalFilesProcessed = 0;

  for (const item of items) {
    const projectName = getProjectBaseName(item.name);
    const project: ProjectFile = {
      id: `${projectName}-${Date.now()}-${Math.random()}`, // Added Math.random for better uniqueness
      name: projectName,
      type: item.isDirectory ? 'folder' : 'file', // Simplified type
      javaFiles: [],
      timestamp: Date.now(),
    };

    if (item.isDirectory) {
      const files = await getFilesInDirectory(item as FileSystemDirectoryEntry);
      for (const file of files) { // file here is a File object
        if (totalFilesProcessed >= MAX_TOTAL_FILES) break;
        if (file.name.endsWith('.java') && file.size <= MAX_FILE_SIZE) {
          try {
            const content = await readFileContent(file);
            // (file as any).webkitRelativePath should be set by getFilesInDirectory
            const filePathForMeta = (file as any).webkitRelativePath || file.name;
            const { path, packageName } = parseJavaFileMeta(filePathForMeta);
            project.javaFiles.push({
              id: `${project.id}-${path}`, // More unique file ID
              path,
              name: file.name,
              content,
              packageName,
              projectName: project.name,
              selected: true,
            });
            totalFilesProcessed++;
          } catch (error) {
            console.warn(`Could not read file ${file.name}:`, error);
          }
        } else if (file.name.endsWith('.java') && file.size > MAX_FILE_SIZE) {
            console.warn(`File ${file.name} exceeds size limit (${MAX_FILE_SIZE} bytes) and was skipped.`);
        }
      }
    } else if (item.isFile && item.name.endsWith('.java')) {
      // Handle single .java file drop (item is FileSystemFileEntry)
      const filePromise = new Promise<File>((resolve, reject) => (item as FileSystemFileEntry).file(resolve, reject));
      try {
        const file = await filePromise; // file here is a File object
        if (file.size <= MAX_FILE_SIZE && totalFilesProcessed < MAX_TOTAL_FILES) {
          const content = await readFileContent(file);
          // For a single dropped .java file, webkitRelativePath is usually just the filename or not present.
          // Use file.name as the primary source for path in this context.
          const { path, packageName } = parseJavaFileMeta(file.name);
          project.javaFiles.push({
            id: `${project.id}-${path}`, // More unique file ID
            path, // path will be just file.name
            name: file.name,
            content,
            packageName, // packageName will be (Default Package)
            projectName: project.name,
            selected: true,
          });
          totalFilesProcessed++;
        } else if (file.size > MAX_FILE_SIZE) {
          console.warn(`File ${file.name} exceeds size limit (${MAX_FILE_SIZE} bytes) and was skipped.`);
        }
      } catch (error) {
        console.warn(`Could not read file ${item.name}:`, error);
      }
    }
    // ZIP/RAR processing is not implemented client-side in this version.
    
    if (project.javaFiles.length > 0) {
      projects.push(project);
    }
    if (totalFilesProcessed >= MAX_TOTAL_FILES) {
        // Consider a toast notification here instead of alert for better UX
        console.warn(`Reached maximum file processing limit (${MAX_TOTAL_FILES}). Some files may not have been processed.`);
        // Example: toast({ title: "Límite alcanzado", description: `Se procesaron los primeros ${MAX_TOTAL_FILES} archivos.`});
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
                // Ensure webkitRelativePath is set for later use
                if (!(file as any).webkitRelativePath) {
                    Object.defineProperty(file, 'webkitRelativePath', { 
                        value: entry.fullPath.startsWith('/') ? entry.fullPath.substring(1) : entry.fullPath,
                        writable: true // Make it writable if it needs to be modified later (though usually not)
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
        readEntries(); // Read next batch
      }, reject); // Pass reject to handle errors from reader.readEntries itself
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
    reader.readAsText(file, 'UTF-8'); // Specify UTF-8 encoding
  });
}

function parseJavaFileMeta(filePath: string): { path: string; packageName: string } {
  // Normalize path separators to forward slashes
  const normalizedPath = filePath.replace(/\\/g, '/');
  const parts = normalizedPath.split('/').filter(p => p !== '' && p !== '.'); // remove empty parts and current dir refs
  
  let fileName = parts.pop() || ''; // Get the file name
  if (!fileName.toLowerCase().endsWith(".java")) { 
      // This case should ideally not be hit if pre-filtered, but as a safeguard:
      // If it's not a java file path, treat it as if it's in default package.
      return { path: filePath, packageName: "(Default Package)" };
  }

  // The remaining parts form the package structure
  // Exclude common source roots like 'src', 'src/main/java'
  const commonSourceRoots = ["src/main/java", "src", "source"];
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


export function unifyJavaFiles(
  projects: ProjectFile[],
  isMultiProjectUnification: boolean
): string {
  const sb: string[] = [];
  let projectHeaderWritten = false;

  for (const project of projects) {
    const javaFiles = project.javaFiles.filter(f => f.selected);
    if (javaFiles.length === 0) continue;

    if (isMultiProjectUnification && projects.length > 1) {
        // For multiple distinct projects being unified together
        if (sb.length > 0) sb.push("\n\n"); // Add space before new project, if not the first
        sb.push(`//############################################################`);
        sb.push(`// PROYECTO: ${project.name}`);
        sb.push(`//############################################################\n`);
        projectHeaderWritten = true;
    } else if (projects.length === 1 && !projectHeaderWritten) {
        // For a single project (which might contain multiple files/packages)
        // Optionally, add a header for the single project too if desired
        // sb.push(`// PROYECTO: ${project.name}\n`); 
        projectHeaderWritten = true; // Prevent rewriting if called multiple times with single project
    }
    
    const packageMap = new Map<string, JavaFile[]>();
    javaFiles.forEach(file => {
        const list = packageMap.get(file.packageName) || [];
        list.push(file);
        packageMap.set(file.packageName, list);
    });

    const sortedPackageNames = Array.from(packageMap.keys()).sort((a,b) => {
        if (a === '(Default Package)') return -1;
        if (b === '(Default Package)') return 1;
        return a.localeCompare(b);
    });

    for (const packageName of sortedPackageNames) {
        const filesInPackage = packageMap.get(packageName)!.sort((a,b) => a.name.localeCompare(b.name));
        
        sb.push(`//============================================================`);
        sb.push(`// Paquete: ${packageName}`);
        sb.push(`//============================================================\n`);

        for (const javaFile of filesInPackage) {
            sb.push(`//------------------------------------------------------------`);
            sb.push(`// Archivo: ${javaFile.name}`);
            sb.push(`// Path: ${javaFile.path}`);
            sb.push(`//------------------------------------------------------------\n`);
            sb.push(javaFile.content.trim());
            sb.push("\n\n"); 
        }
    }
  }
  return sb.join('\n').trim(); // Trim final output
}

export function downloadTextFile(filename: string, text: string) {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  
  // Sanitize filename
  const safeFilename = filename.replace(/[^a-z0-9_.\-]/gi, '_') || "unificado.txt";
  element.setAttribute('download', safeFilename);
  
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}
