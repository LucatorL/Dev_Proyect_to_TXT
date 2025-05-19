// app/page.tsx
"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { HeaderControls } from '@/components/java-unifier/HeaderControls';
import { FileDropzone } from '@/components/java-unifier/FileDropzone';
import { RecentFilesList } from '@/components/java-unifier/RecentFilesList';
import { FileSelectionModal } from '@/components/java-unifier/FileSelectionModal';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { ProjectFile, RecentEntry, JavaFile } from '@/types/java-unifier';
import { processDroppedItems, unifyJavaFiles, downloadTextFile, getProjectBaseName } from '@/lib/file-processor';
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

// Install uuid: npm install uuid @types/uuid

const MAX_RECENTS = 3;

export default function JavaUnifierPage() {
  const [previewEnabled, setPreviewEnabled] = useLocalStorage<boolean>('java-unifier-previewEnabled', true);
  const [unifyMultipleEnabled, setUnifyMultipleEnabled] = useLocalStorage<boolean>('java-unifier-unifyMultipleEnabled', false);
  const [recents, setRecents] = useLocalStorage<RecentEntry[]>('java-unifier-recents', []);
  
  const [processedProjects, setProcessedProjects] = useState<ProjectFile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalModeMulti, setModalModeMulti] = useState(false);
  const [modalInitialProjectName, setModalInitialProjectName] = useState("");


  const { toast } = useToast();

  const addRecentEntry = useCallback((project: ProjectFile) => {
    setRecents(prevRecents => {
      const newEntry: RecentEntry = { id: project.id, name: project.name, timestamp: Date.now(), type: project.type };
      const filteredRecents = prevRecents.filter(r => r.id !== newEntry.id);
      const updatedRecents = [newEntry, ...filteredRecents].slice(0, MAX_RECENTS);
      return updatedRecents;
    });
  }, [setRecents]);

  const removeRecentEntry = useCallback((id: string) => {
    setRecents(prevRecents => prevRecents.filter(r => r.id !== id));
    toast({ title: "Eliminado", description: "Entrada eliminada de recientes." });
  }, [setRecents, toast]);

  const handleFilesDropped = async (droppedItems: FileSystemFileEntry[]) => {
    if (droppedItems.length === 0) return;

    try {
      const projects = await processDroppedItems(droppedItems);
      if (projects.length === 0 || projects.every(p => p.javaFiles.length === 0)) {
        toast({
          title: "Sin archivos Java",
          description: "No se encontraron archivos .java en los elementos proporcionados o no se pudieron procesar.",
          variant: "default",
        });
        return;
      }
      
      projects.forEach(proj => {
        if(proj.javaFiles.length > 0) addRecentEntry(proj);
      });

      if (unifyMultipleEnabled && projects.length > 1) {
        // Process multiple projects for unification
        setProcessedProjects(projects);
        setModalInitialProjectName("Proyectos_Unificados");
        if (previewEnabled) {
          setModalModeMulti(true);
          setIsModalOpen(true);
        } else {
          // Directly unify without modal
          const unifiedContent = unifyJavaFiles(projects, true);
          downloadTextFile("Proyectos_Unificados_directo.txt", unifiedContent);
          toast({ title: "Éxito", description: "Proyectos unificados y descargados." });
        }
      } else {
        // Process projects individually or a single multi-file project
        const projectToProcess = projects.length > 1 ? projects[0] : projects[0]; // If unifyMultiple not checked, but multiple dropped, process first.
                                                                                    // Or if only one project dropped.
        
        if (!projectToProcess || projectToProcess.javaFiles.length === 0) {
             toast({
                title: "Sin archivos Java",
                description: `No se encontraron archivos .java en ${projectToProcess?.name || 'el proyecto'}.`,
                variant: "default",
            });
            return;
        }

        setProcessedProjects([projectToProcess]); // Modal expects an array
        setModalInitialProjectName(getProjectBaseName(projectToProcess.name));

        if (previewEnabled) {
          setModalModeMulti(false); // Single project view in modal
          setIsModalOpen(true);
        } else {
          // Directly unify single project without modal
          const unifiedContent = unifyJavaFiles([projectToProcess], false);
          downloadTextFile(`${getProjectBaseName(projectToProcess.name)}_unificado_directo.txt`, unifiedContent);
          toast({ title: "Éxito", description: `Proyecto ${projectToProcess.name} unificado y descargado.` });
        }
      }

    } catch (error) {
      console.error("Error processing files:", error);
      toast({
        title: "Error de Procesamiento",
        description: "Ocurrió un error al procesar los archivos. Revisa la consola para más detalles.",
        variant: "destructive",
      });
    }
  };

  const handleModalConfirm = (selectedFiles: JavaFile[], unifiedContent: string) => {
    // The download is handled inside the modal for now.
    // This callback can be used for any post-confirmation logic if needed.
    // console.log("Modal confirmed, unified content length:", unifiedContent.length);
  };

  const handleSelectRecent = (recent: RecentEntry) => {
    // This is tricky. We don't have the actual files from a recent entry.
    // We can re-trigger a file selection dialog, perhaps pre-filling the name if it was a known path (not applicable in web).
    // Or, if we stored the project structure (too complex for localStorage), we could re-populate.
    // For now, selecting a recent will just be a placeholder or could show its metadata.
    // A more practical approach for web might be to re-process if the user drops the same item again.
    toast({
      title: "Re-procesar Reciente",
      description: `Para re-procesar '${recent.name}', por favor, selecciónalo o arrástralo nuevamente.`,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <HeaderControls
        previewEnabled={previewEnabled}
        onPreviewToggle={setPreviewEnabled}
        unifyMultipleEnabled={unifyMultipleEnabled}
        onUnifyMultipleToggle={setUnifyMultipleEnabled}
      />
      <main className="flex-grow container mx-auto px-4 py-8">
        <FileDropzone onFilesProcessed={handleFilesDropped} />
        <RecentFilesList 
            recents={recents} 
            onSelectRecent={handleSelectRecent}
            onRemoveRecent={removeRecentEntry}
        />
      </main>
      {isModalOpen && processedProjects.length > 0 && (
        <FileSelectionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          projectsToProcess={processedProjects}
          onConfirm={handleModalConfirm}
          isMultiProjectView={modalModeMulti}
          initialProjectName={modalInitialProjectName}
        />
      )}
      <footer className="text-center p-4 border-t text-sm text-muted-foreground">
        Java Unifier - Adaptado de la aplicación original de Lucas.
      </footer>
    </div>
  );
}
