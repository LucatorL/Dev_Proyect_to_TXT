export interface JavaFile {
  id: string; // path within project can serve as id
  path: string; // relative path within project e.g., com/example/MyClass.java
  name: string; // MyClass.java
  content: string;
  packageName: string; // com.example
  projectName?: string; // Name of the original project, for multi-project unification
  selected: boolean; // For the selection modal
}

export interface ProjectFile {
  id: string; // A unique ID, could be the original dropped item's name + timestamp
  name: string; // Original file/folder name (e.g., MyProject, project.zip)
  type: 'folder' | 'file'; // Type of the root item (folder or a single .java file)
  javaFiles: JavaFile[]; // List of found/processed Java files
  timestamp: number; // Timestamp of processing
}

export interface RecentEntry {
  id: string; // Usually same as ProjectFile id
  name: string; // Name of the project/file
  timestamp: number; // Timestamp of last access
  type: 'folder' | 'file'; // Simplified type
}

export interface PackageGroup {
  packageName: string;
  files: JavaFile[];
}

export interface ProjectGroup {
  projectName: string;
  packages: PackageGroup[];
}

export type UnifiedData = ProjectGroup[];
