
// app/page.tsx
"use client"

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { HeaderControls } from '@/components/java-unifier/HeaderControls';
import { FileDropzone } from '@/components/java-unifier/FileDropzone';
import { RecentFilesList } from '@/components/java-unifier/RecentFilesList';
import { FileSelectionModal } from '@/components/java-unifier/FileSelectionModal';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { ProjectFile, RecentEntry, ProcessedFile } from '@/types/java-unifier';
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
import { Button } from '@/components/ui/button';
import { Github } from 'lucide-react';

const MAX_RECENTS = 3;
const APP_VERSION = "0.1.1"; 

export default function JavaUnifierPage() {
  const [recents, setRecents] = useLocalStorage<RecentEntry[]>('java-unifier-recents', []);
  
  const [processedProjects, setProcessedProjects] = useState<ProjectFile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [isRecentInfoModalOpen, setIsRecentInfoModalOpen] = useState(false);
  const [selectedRecentForInfoModal, setSelectedRecentForInfoModal] = useState<RecentEntry | null>(null);
  const [isPreviewEnabled, setIsPreviewEnabled] = useState(true);
  const [isMultiProjectMode, setIsMultiProjectMode] = useState(true); 
  const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    // If modal is open and there are no more projects to process, close the modal
    if (isModalOpen && processedProjects.length === 0) {
      setIsModalOpen(false);
    }
  }, [processedProjects, isModalOpen]);

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
    toast({ title: "Eliminado", description: "Entrada eliminada del historial." });
  }, [setRecents, toast]);

  const handleFilesDropped = async (droppedItems: FileSystemFileEntry[]) => {
    if (droppedItems.length === 0) return;

    try {
      const projects = await processDroppedItems(droppedItems);
      if (projects.length === 0 || projects.every(p => p.files.length === 0)) {
        toast({
          title: "Sin archivos soportados",
          description: `No se encontraron archivos soportados (${['java', 'xml', 'pom', 'txt', 'properties', 'md', 'sql', 'csv', 'yaml', 'yml', 'classpath', 'project', 'dat'].join(', ')}) en los elementos proporcionados o no se pudieron procesar.`,
          variant: "default",
        });
        return;
      }
      
      projects.forEach(proj => {
        if(proj.files.length > 0) addRecentEntry(proj);
      });

      setProcessedProjects(prev => {
        // Avoid duplicating projects if they are dropped again, or handle updates if necessary
        const newProjectIds = new Set(projects.map(p => p.id));
        const existingProjects = prev.filter(ep => !newProjectIds.has(ep.id));
        return [...existingProjects, ...projects];
      });
      
      setIsModalOpen(true); 

    } catch (error) {
      console.error("Error processing files:", error);
      toast({
        title: "Error de Procesamiento",
        description: "Ocurrió un error al procesar los archivos. Revisa la consola para más detalles.",
        variant: "destructive",
      });
    }
  };

  const handleSingleProjectProcessed = (projectId: string, downloadData: { fileName: string; content: string }) => {
    downloadTextFile(downloadData.fileName, downloadData.content);
    setProcessedProjects(prev => prev.filter(p => p.id !== projectId));
    toast({ title: "Éxito", description: `Proyecto ${getProjectBaseName(downloadData.fileName.replace('_unificado.txt', ''))} procesado y descargado.` });
    // Modal stays open if more projects, handled by useEffect
  };

  const handleMultiProjectProcessed = (projectIdsToRemove: string[], downloadData: { fileName: string; content: string }) => {
    downloadTextFile(downloadData.fileName, downloadData.content);
    if (projectIdsToRemove.length > 0) {
      setProcessedProjects(prev => prev.filter(p => !projectIdsToRemove.includes(p.id)));
    } else { // If no specific projects to remove (e.g. user selected nothing but clicked download)
      setProcessedProjects([]); // Clear all, or just close modal
    }
    toast({ title: "Éxito", description: `Archivo ${downloadData.fileName} descargado.` });
    setIsModalOpen(false); // Close modal after multi-project download
  };


  const handleSelectRecent = (recent: RecentEntry) => {
    setSelectedRecentForInfoModal(recent);
    setIsRecentInfoModalOpen(true);
  };

  const handleVersionClick = () => {
    setIsChangelogModalOpen(true);
  };

  const changelogContentForV011 = `
    <ul class="list-disc pl-5 space-y-1 text-sm">
      <li>Versión inicial de Java Unifier.</li>
      <li>Funcionalidad de arrastrar y soltar para carpetas y archivos soportados.</li>
      <li>Soporte para tipos de archivo: .java, .xml, .pom, .txt, .properties, .md, .sql, .csv, .yaml, .yml, .classpath, .project, .dat.</li>
      <li>Modal de selección de archivos con vista previa unificada.</li>
      <li>Los archivos .java se seleccionan por defecto, otros tipos de archivo están deseleccionados.</li>
      <li>Descarga del archivo unificado.</li>
      <li>Historial de procesados (con diálogo informativo sobre limitaciones).</li>
      <li>Selector de tema (claro/oscuro).</li>
      <li>Enlace para reportar problemas/sugerencias en GitHub.</li>
      <li>Estimación de tokens aproximada en la vista previa.</li>
      <li>Visualización de la versión de la aplicación en la cabecera y changelog.</li>
      <li>El asistente de IA ahora actualizará este changelog con cada cambio aplicado.</li>
      <li>Añadida la foto de perfil de GitHub de Lucas junto a su nombre en el pie de página.</li>
      <li>El texto "aplicación original" en el pie de página ahora enlaza al repositorio de GitHub.</li>
      <li>La foto de perfil y el nombre "Lucas" en el pie de página ahora enlazan a su perfil de GitHub.</li>
      <li>Rehabilitado el interruptor "Unificar Múltiples Proyectos" en la cabecera.</li>
      <li>Añadida navegación por proyectos individuales en el modal de selección cuando "Unificar Múltiples Proyectos" está desactivado, con flechas laterales.</li>
      <li>En modo de proyecto individual, al descargar, solo ese proyecto se elimina de la lista y el modal permanece abierto si hay más proyectos.</li>
      <li>Actualización de la versión a 0.1.1.</li>
    </ul>
  `;


  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <HeaderControls 
        previewEnabled={isPreviewEnabled}
        onPreviewToggle={(checked) => setIsPreviewEnabled(!!checked)}
        multiProjectModeEnabled={isMultiProjectMode}
        onMultiProjectModeToggle={(checked) => setIsMultiProjectMode(!!checked)}
        appVersion={APP_VERSION}
        onVersionClick={handleVersionClick}
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
          onSingleProjectProcessed={handleSingleProjectProcessed}
          onMultiProjectProcessed={handleMultiProjectProcessed}
          isMultiProjectMode={isMultiProjectMode}
          showPreview={isPreviewEnabled}
        />
      )}
      {selectedRecentForInfoModal && (
         <AlertDialog open={isRecentInfoModalOpen} onOpenChange={setIsRecentInfoModalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Información sobre el Historial: "{selectedRecentForInfoModal.name}"</AlertDialogTitle>
              <AlertDialogDescription>
                Este elemento aparece en el "Historial de Procesados" como un recordatorio de los proyectos que has procesado.
                <br /><br />
                Debido a las limitaciones de seguridad del navegador, la aplicación no puede recargar automáticamente los archivos desde aquí.
                <br /><br />
                Para volver a procesar '{selectedRecentForInfoModal.name}', por favor, arrastra y suelta la carpeta o los archivos correspondientes nuevamente en la zona principal.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setIsRecentInfoModalOpen(false)}>Entendido</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {isChangelogModalOpen && (
        <AlertDialog open={isChangelogModalOpen} onOpenChange={setIsChangelogModalOpen}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Novedades de la Versión {APP_VERSION}</AlertDialogTitle>
              <AlertDialogDescription asChild>
                 <div className="max-h-[60vh] overflow-y-auto pr-2 mt-2" dangerouslySetInnerHTML={{ __html: changelogContentForV011 }} />
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setIsChangelogModalOpen(false)}>Cerrar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <footer className="text-center p-4 border-t text-sm text-muted-foreground flex flex-col sm:flex-row justify-between items-center">
        <span className="flex items-center">
          Java Unifier - Adaptado de la&nbsp;
          <a
            href="https://github.com/LucatorL/JavaSourceToTxt"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            aplicación original
          </a>
          &nbsp;de&nbsp;
          <a 
            href="https://github.com/LucatorL" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center text-primary hover:underline"
          >
            <Image 
              src="https://github.com/LucatorL.png" 
              alt="Foto de perfil de Lucas" 
              width={24} 
              height={24} 
              className="rounded-full mr-1.5 ml-0.5"
              data-ai-hint="github profile"
            />
            Lucas
          </a>.
        </span>
        <Button variant="link" asChild className="mt-2 sm:mt-0 text-muted-foreground hover:text-primary">
          <a href="https://github.com/LucatorL/JavaSourceToTxt/issues" target="_blank" rel="noopener noreferrer">
            <Github className="mr-2 h-4 w-4" />
            Reportar un Problema / Sugerencias
          </a>
        </Button>
      </footer>
    </div>
  );
}

