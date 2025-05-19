
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MAX_RECENTS = 3;

export default function JavaUnifierPage() {
  const [recents, setRecents] = useLocalStorage<RecentEntry[]>('java-unifier-recents', []);
  
  const [processedProjects, setProcessedProjects] = useState<ProjectFile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // const [modalModeMulti, setModalModeMulti] = useState(false); // Always multi-project unification mode
  const [modalInitialProjectName, setModalInitialProjectName] = useState("");

  const [isRecentInfoModalOpen, setIsRecentInfoModalOpen] = useState(false);
  const [selectedRecentForInfoModal, setSelectedRecentForInfoModal] = useState<RecentEntry | null>(null);

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

      // Always handle as potentially multiple projects for unification logic,
      // FileSelectionModal will adapt its view based on projects.length
      setProcessedProjects(projects);
      if (projects.length > 1) {
        setModalInitialProjectName("Proyectos_Unificados");
      } else if (projects.length === 1) {
        setModalInitialProjectName(getProjectBaseName(projects[0].name));
      }
      
      // Always true, as per user request to remove toggle
      const previewEnabled = true; 

      if (previewEnabled) {
          // setModalModeMulti(projects.length > 1); // This state is no longer needed due to always-on multi-project
          setIsModalOpen(true);
      } else {
          // This 'else' branch for direct download is less likely to be hit if preview is always effectively on.
          // Kept for logical completeness if previewEnabled were to be re-introduced.
          const unifiedContent = unifyJavaFiles(projects, projects.length > 1); 
          const downloadName = projects.length > 1 
                               ? "Proyectos_Unificados_directo.txt" 
                               : `${getProjectBaseName(projects[0].name)}_unificado_directo.txt`;
          downloadTextFile(downloadName, unifiedContent);
          toast({ title: "Éxito", description: "Proyectos unificados y descargados." });
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
    // Download is handled inside the modal.
  };

  const handleSelectRecent = (recent: RecentEntry) => {
    setSelectedRecentForInfoModal(recent);
    setIsRecentInfoModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <HeaderControls />
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
          // isMultiProjectView is now determined by projectsToProcess.length > 1 inside the modal or by default
          // Forcing true here means it always considers the possibility of multiple projects initially.
          // The modal itself can then adjust its title/behavior based on actual number of projects.
          isMultiProjectView={processedProjects.length > 1} 
          initialProjectName={modalInitialProjectName}
        />
      )}
      {selectedRecentForInfoModal && (
        <AlertDialog open={isRecentInfoModalOpen} onOpenChange={setIsRecentInfoModalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Información sobre: "{selectedRecentForInfoModal.name}"</AlertDialogTitle>
              <AlertDialogDescription>
                Este elemento aparece en "Recientes" como un recordatorio de los proyectos que has procesado.
                <br /><br />
                Debido a las limitaciones de seguridad del navegador, la aplicación no puede recargar automáticamente los archivos.
                <br /><br />
                Para volver a procesar '{selectedRecentForInfoModal.name}', por favor, arrastra y suelta la carpeta o los archivos .java correspondientes nuevamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setIsRecentInfoModalOpen(false)}>Entendido</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <footer className="text-center p-4 border-t text-sm text-muted-foreground">
        Java Unifier - Adaptado de la aplicación original de Lucas.
      </footer>
    </div>
  );
}
