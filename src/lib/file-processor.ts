import type { JavaFile, ProjectFile } from '@/types/java-unifier';

const MAX_FILE_SIZE = 1024 * 1024 * 5; // 5MB limit per file for client-side processing
const MAX_TOTAL_FILES = 100; // Max number of java files to process to prevent browser freeze

// Basic function to get project base name, similar to Java's getProjectBaseName
export function getProjectBaseName(name: string): string {
  let baseName = name;
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
      id: `${projectName}-${Date.now()}`,
      name: projectName,
      type: item.isDirectory ? 'folder' : getFileType(item.name),
      javaFiles: [],
      timestamp: Date.now(),
    };

    if (item.isDirectory) {
      const files = await getFilesInDirectory(item as FileSystemDirectoryEntry);
      for (const file of files) {
        if (totalFilesProcessed >= MAX_TOTAL_FILES) break;
        if (file.name.endsWith('.java') && file.size <= MAX_FILE_SIZE) {
          try {
            const content = await readFileContent(file);
            const { path, packageName } = parseJavaFileMeta(file.webkitRelativePath || file.name);
            project.javaFiles.push({
              id: path,
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
        }
      }
    } else if (item.isFile && item.name.endsWith('.java') && (item as FileSystemFileEntry as any).fileSync().size <= MAX_FILE_SIZE) {
      // Handle single .java file drop (less common for "projects")
      // This part needs conversion from FileSystemFileEntry to File to use readFileContent
      const file = await new Promise<File>((resolve, reject) => (item as FileSystemFileEntry).file(resolve, reject));
       if (totalFilesProcessed < MAX_TOTAL_FILES) {
        try {
            const content = await readFileContent(file);
            const { path, packageName } = parseJavaFileMeta(file.name);
            project.javaFiles.push({
                id: path,
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
      }
    } else if (item.isFile && (item.name.endsWith('.zip') || item.name.endsWith('.rar'))) {
      // Placeholder: Actual ZIP/RAR processing is complex client-side
      // For now, we just acknowledge the file type.
      // If you add a library like JSZip, you'd process it here.
      console.log(`Acknowledged archive: ${item.name}. Extraction not implemented in this version.`);
    }
    
    if (project.javaFiles.length > 0) {
      projects.push(project);
    }
     if (totalFilesProcessed >= MAX_TOTAL_FILES) {
        alert(`Reached maximum file processing limit (${MAX_TOTAL_FILES}). Some files may not have been processed.`);
        break;
    }
  }
  return projects;
}

function getFileType(fileName: string): 'zip' | 'rar' | 'file' {
  if (fileName.toLowerCase().endsWith('.zip')) return 'zip';
  if (fileName.toLowerCase().endsWith('.rar')) return 'rar';
  return 'file';
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
            // Cast to FileSystemFileEntry to access .file()
            const fileEntry = entry as FileSystemFileEntry;
            const file = await new Promise<File>((res, rej) => fileEntry.file(res, rej));
            // Add webkitRelativePath if not present (it should be for folder drops)
            if (!(file as any).webkitRelativePath) {
                 Object.defineProperty(file, 'webkitRelativePath', { value: entry.fullPath.startsWith('/') ? entry.fullPath.substring(1) : entry.fullPath });
            }
            files.push(file);
          } else if (entry.isDirectory) {
            files.push(...await getFilesInDirectory(entry as FileSystemDirectoryEntry));
          }
        }
        readEntries(); // Read next batch
      }, reject);
    };
    readEntries();
  });
}


function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
}

function parseJavaFileMeta(filePath: string): { path: string; packageName: string } {
  const parts = filePath.split('/').filter(p => p !== '');
  const fileName = parts.pop() || '';
  const packagePath = parts.join('.');
  return { path: filePath, packageName: packagePath || "(Default Package)" };
}


// Unifies selected Java files into a single string
export function unifyJavaFiles(
  projects: ProjectFile[],
  isMultiProjectUnification: boolean
): string {
  const sb: string[] = [];
  let currentProjectHeader = "";

  for (const project of projects) {
    const javaFiles = project.javaFiles.filter(f => f.selected);
    if (javaFiles.length === 0) continue;

    if (isMultiProjectUnification) {
        if (currentProjectHeader !== project.name) {
            if (sb.length > 0) sb.push("\n\n");
            sb.push(`//############################################################`);
            sb.push(`// PROYECTO: ${project.name}`);
            sb.push(`//############################################################\n`);
            currentProjectHeader = project.name;
        }
    }
    
    // Group files by package name for this project
    const packageMap = new Map<string, JavaFile[]>();
    javaFiles.forEach(file => {
        const list = packageMap.get(file.packageName) || [];
        list.push(file);
        packageMap.set(file.packageName, list);
    });

    // Sort package names
    const sortedPackageNames = Array.from(packageMap.keys()).sort();

    for (const packageName of sortedPackageNames) {
        const filesInPackage = packageMap.get(packageName)!.sort((a,b) => a.name.localeCompare(b.name));
        
        sb.push(`//============================================================`);
        sb.push(`// Paquete: ${packageName === '(Default Package)' || packageName === '' ? '(Default Package)' : packageName}`);
        sb.push(`//============================================================\n`);

        for (const javaFile of filesInPackage) {
            sb.push(`//------------------------------------------------------------`);
            sb.push(`// Archivo: ${javaFile.name}`);
            sb.push(`//------------------------------------------------------------\n`);
            sb.push(javaFile.content.trim());
            sb.push("\n\n"); // Ensure separation between files
        }
    }
  }
  return sb.join('\n');
}

// Helper to trigger download
export function downloadTextFile(filename: string, text: string) {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}
