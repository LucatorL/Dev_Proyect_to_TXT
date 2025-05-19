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

const MAX_RECENTS = 3;

export default function JavaUnifierPage() {
  const [previewEnabled, setPreviewEnabled] = useLocalStorage<boolean>('java-unifier-previewEnabled', true);
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

      if (projects.length > 1) { // Multiple projects dropped implies multi-project unification
        setProcessedProjects(projects);
        setModalInitialProjectName("Proyectos_Unificados");
        if (previewEnabled) {
          setModalModeMulti(true);
          setIsModalOpen(true);
        } else {
          // Directly unify without modal
          const unifiedContent = unifyJavaFiles(projects, true); // true for multi-project unification
          downloadTextFile("Proyectos_Unificados_directo.txt", unifiedContent);
          toast({ title: "Éxito", description: "Proyectos unificados y descargados." });
        }
      } else if (projects.length === 1) { // Single project dropped
        const projectToProcess = projects[0];
        
        if (!projectToProcess || projectToProcess.javaFiles.length === 0) {
             toast({
                title: "Sin archivos Java",
                description: `No se encontraron archivos .java en ${projectToProcess?.name || 'el proyecto'}.`,
                variant: "default",
            });
            return;
        }

        setProcessedProjects([projectToProcess]); 
        setModalInitialProjectName(getProjectBaseName(projectToProcess.name));

        if (previewEnabled) {
          setModalModeMulti(false); // Single project view in modal
          setIsModalOpen(true);
        } else {
          // Directly unify single project without modal
          const unifiedContent = unifyJavaFiles([projectToProcess], false); // false for single project unification
          downloadTextFile(`${getProjectBaseName(projectToProcess.name)}_unificado_directo.txt`, unifiedContent);
          toast({ title: "Éxito", description: `Proyecto ${projectToProcess.name} unificado y descargado.` });
        }
      }
      // If projects.length is 0, it's handled by the initial check.

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
    // Download is handled inside the modal.
  };

  const handleSelectRecent = (recent: RecentEntry) => {
    toast({
      title: "Re-procesar Reciente",
      description: `Para re-procesar '${recent.name}', por favor, selecciónalo o arrástralo nuevamente. La funcionalidad de recientes no almacena el contenido de los archivos.`,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <HeaderControls
        previewEnabled={previewEnabled}
        onPreviewToggle={setPreviewEnabled}
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
          isMultiProjectView={modalModeMulti} // This is correctly set based on projects.length
          initialProjectName={modalInitialProjectName}
        />
      )}
      <footer className="text-center p-4 border-t text-sm text-muted-foreground">
        Java Unifier - Adaptado de la aplicación original de Lucas.
      </footer>
    </div>
  );
}
