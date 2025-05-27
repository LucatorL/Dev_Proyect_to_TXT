
// app/page.tsx
"use client"

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { HeaderControls } from '@/components/java-unifier/HeaderControls';
import { FileDropzone } from '@/components/java-unifier/FileDropzone';
import { RecentFilesList } from '@/components/java-unifier/RecentFilesList';
import { FileSelectionModal } from '@/components/java-unifier/FileSelectionModal';
import { ManualAddContentModal } from '@/components/java-unifier/ManualAddContentModal';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { ProjectFile, RecentEntry, ProcessedFile } from '@/types/java-unifier';
import { processDroppedItems, unifyJavaFiles, downloadTextFile, getProjectBaseName, getFileExtension, extractJavaPackageName } from '@/lib/file-processor';
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
import { Github, PlusCircle } from 'lucide-react';

const MAX_RECENTS = 3;
const APP_VERSION = "0.1.5"; 

export default function JavaUnifierPage() {
  const [recents, setRecents] = useLocalStorage<RecentEntry[]>('java-unifier-recents', []);
  
  const [processedProjects, setProcessedProjects] = useState<ProjectFile[]>([]);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [isManualAddModalOpen, setIsManualAddModalOpen] = useState(false);
  
  const [isRecentInfoModalOpen, setIsRecentInfoModalOpen] = useState(false);
  const [selectedRecentForInfoModal, setSelectedRecentForInfoModal] = useState<RecentEntry | null>(null);
  const [isPreviewEnabled, setIsPreviewEnabled] = useState(true);
  const [isMultiProjectMode, setIsMultiProjectMode] = useState(true); 
  const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);
  const [currentProjectIndexInModal, setCurrentProjectIndexInModal] = useState(0);

  const { toast } = useToast();

  useEffect(() => {
    if (isSelectionModalOpen && processedProjects.length === 0) {
      setIsSelectionModalOpen(false);
    }
  }, [processedProjects, isSelectionModalOpen]);

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

      setProcessedProjects(projects);
      setCurrentProjectIndexInModal(0); 
      
      if (projects.length > 0) {
        setIsSelectionModalOpen(true); 
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
  
  const handleSelectionModalClose = useCallback(() => {
    const projectToRemoveId = processedProjects[currentProjectIndexInModal]?.id;

    if (!isMultiProjectMode && processedProjects.length > 1 && projectToRemoveId) {
      const updatedProjects = processedProjects.filter(p => p.id !== projectToRemoveId);
      setProcessedProjects(updatedProjects);
      setCurrentProjectIndexInModal(prevIndex => Math.max(0, Math.min(prevIndex, updatedProjects.length - 1)));

      if (updatedProjects.length === 0) {
        setIsSelectionModalOpen(false); 
      }
    } else {
      setProcessedProjects([]);
      setIsSelectionModalOpen(false);
      setCurrentProjectIndexInModal(0); 
    }
  }, [isMultiProjectMode, processedProjects, currentProjectIndexInModal, setProcessedProjects, setIsSelectionModalOpen, setCurrentProjectIndexInModal]);


  const handleSingleProjectProcessed = (projectId: string, downloadData: { fileName: string; content: string }) => {
    downloadTextFile(downloadData.fileName, downloadData.content);
    const updatedProjects = processedProjects.filter(p => p.id !== projectId);
    setProcessedProjects(updatedProjects); 
    setCurrentProjectIndexInModal(idx => Math.max(0, Math.min(idx, updatedProjects.length - 1)));
    toast({ title: "Éxito", description: `Proyecto ${getProjectBaseName(downloadData.fileName.replace('_unificado.txt', ''))} procesado y descargado.` });
    if (updatedProjects.length === 0) {
        setIsSelectionModalOpen(false);
    }
  };

  const handleMultiProjectProcessed = (projectIdsToRemove: string[], downloadData: { fileName: string; content: string }) => {
    downloadTextFile(downloadData.fileName, downloadData.content);
    if (projectIdsToRemove.length > 0) {
      setProcessedProjects(prev => prev.filter(p => !projectIdsToRemove.includes(p.id)));
    } else { 
      setProcessedProjects([]); 
    }
    toast({ title: "Éxito", description: `Archivo ${downloadData.fileName} descargado.` });
    setIsSelectionModalOpen(false); 
  };

  const handleManualContentAdd = (fileName: string, content: string) => {
    if (!fileName.trim() || !content.trim()) {
      toast({ title: "Error", description: "El nombre del archivo y el contenido no pueden estar vacíos.", variant: "destructive" });
      return;
    }

    const fileType = getFileExtension(fileName);
    let packageName = "(Other Project Files)";
    if (fileType === 'java') {
      packageName = extractJavaPackageName(content);
    }

    const newFile: ProcessedFile = {
      id: `manual-${Date.now()}-${Math.random()}`,
      path: fileName, // For manual files, path is just the name
      name: fileName,
      content,
      packageName,
      fileType,
      projectName: `Manual: ${fileName}`, // Each manual file is its own "project"
      selected: fileType === 'java',
    };

    const newProject: ProjectFile = {
      id: `manual-project-${Date.now()}-${Math.random()}`,
      name: `Manual: ${fileName}`,
      type: 'file', // Or a new 'manual' type if needed
      files: [newFile],
      timestamp: Date.now(),
    };

    setProcessedProjects(prevProjects => [...prevProjects, newProject]);
    addRecentEntry(newProject); // Add to recents
    setIsManualAddModalOpen(false);

    // Open selection modal if it's not already, or ensure it updates
    if (!isSelectionModalOpen && (processedProjects.length + 1 > 0)) {
      setCurrentProjectIndexInModal(processedProjects.length); // Point to the new project
      setIsSelectionModalOpen(true);
    } else if (isSelectionModalOpen) {
        // If modal is open, the key change on FileSelectionModal due to processedProjects update should handle re-render
        // We might want to explicitly set currentProjectIndexInModal if modal is already open
        setCurrentProjectIndexInModal(processedProjects.length);
    }
     toast({ title: "Archivo Añadido", description: `"${fileName}" añadido manualmente.` });
  };


  const handleSelectRecent = (recent: RecentEntry) => {
    setSelectedRecentForInfoModal(recent);
    setIsRecentInfoModalOpen(true);
  };

  const handleVersionClick = () => {
    setIsChangelogModalOpen(true);
  };

  const changelogContent = `
    <ul class="list-disc pl-5 space-y-2 text-sm">
      <li>
        Versión 0.1.5
        <ul class="list-disc pl-5 space-y-1 mt-1">
          <li>Añadida la funcionalidad "Añadir Contenido Manualmente":
            <ul class="list-disc pl-5">
              <li>Un nuevo botón permite abrir un modal para pegar contenido y asignarle un nombre de archivo.</li>
              <li>El archivo creado manualmente se añade a la lista de proyectos y puede ser seleccionado para unificación.</li>
              <li>Se intenta determinar el tipo de archivo y el paquete Java (si aplica) a partir del nombre y contenido.</li>
            </ul>
          </li>
        </ul>
      </li>
      <li>
        Versión 0.1.4
        <ul class="list-disc pl-5 space-y-1 mt-1">
          <li>Reestructurado el formato del changelog para mayor claridad por versión.</li>
          <li>Ajustado el comportamiento al cerrar el modal de selección de archivos (con "X", Esc o "Cancelar"):
            <ul class="list-disc pl-5">
              <li>En modo "Unificar Múltiples Proyectos" (opción activada) O si solo había un proyecto (o ninguno) en el lote actual: la lista <code>processedProjects</code> se vaciará y el modal se cerrará.</li>
              <li>En modo de proyecto individual ("Unificar Múltiples Proyectos" desactivado) Y había más de un proyecto en el lote:
                <ul class="list-disc pl-5">
                    <li>El proyecto que se estaba visualizando en el modal al momento de cerrarlo se eliminará del lote.</li>
                    <li>El modal <strong>permanecerá abierto</strong> si quedan otros proyectos en el lote.</li>
                    <li>Si al eliminar el proyecto el lote queda vacío, el modal se cerrará.</li>
                </ul>
              </li>
              <li>Al arrastrar nuevos archivos, siempre se iniciará con un lote nuevo, reemplazando cualquier proyecto anterior.</li>
            </ul>
          </li>
          <li>Corregida la gestión de la descarga de proyectos individuales para que el modal se cierre solo si era el último proyecto.</li>
        </ul>
      </li>
      <li>
        Versión 0.1.3
        <ul class="list-disc pl-5 space-y-1 mt-1">
          <li>Corregido un error grave donde proyectos previamente unificados y cerrados (con X/Cancelar) podían ser incluidos incorrectamente en unificaciones posteriores. Esto se solucionó asegurando que el estado interno del modal de selección se reinicie completamente cuando cambia la lista de proyectos (usando una 'key' dinámica en el componente) y limpiando los proyectos procesados al cerrar el modal sin guardar.</li>
        </ul>
      </li>
      <li>
        Versión 0.1.2
        <ul class="list-disc pl-5 space-y-1 mt-1">
          <li>Corregido error de visualización de conteo de tokens negativo.</li>
          <li>Corregido error de posicionamiento del modal de selección de archivos (estaba cortado).</li>
        </ul>
      </li>
      <li>
        Versión 0.1.1
        <ul class="list-disc pl-5 space-y-1 mt-1">
          <li>Rehabilitado el interruptor "Unificar Múltiples Proyectos" en la cabecera.</li>
          <li>Añadida navegación por proyectos individuales en el modal de selección cuando "Unificar Múltiples Proyectos" está desactivado, con flechas laterales.</li>
          <li>En modo de proyecto individual, al descargar, solo ese proyecto se elimina de la lista y el modal permanece abierto si hay más proyectos.</li>
        </ul>
      </li>
      <li>
        Versión Inicial (0.1.0 y anteriores)
        <ul class="list-disc pl-5 space-y-1 mt-1">
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
        </ul>
      </li>
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
        <div className="mt-4 text-center">
            <Button variant="outline" onClick={() => setIsManualAddModalOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Contenido Manualmente
            </Button>
        </div>
        <RecentFilesList 
            recents={recents} 
            onSelectRecent={handleSelectRecent}
            onRemoveRecent={removeRecentEntry}
        />
      </main>
      {isSelectionModalOpen && processedProjects.length > 0 && (
        <FileSelectionModal
          key={processedProjects.map(p => p.id).join('-') || 'modal-empty'} 
          isOpen={isSelectionModalOpen}
          onClose={handleSelectionModalClose} 
          projectsToProcess={processedProjects}
          onSingleProjectProcessed={handleSingleProjectProcessed}
          onMultiProjectProcessed={handleMultiProjectProcessed}
          isMultiProjectMode={isMultiProjectMode}
          showPreview={isPreviewEnabled}
          initialProjectIndex={currentProjectIndexInModal}
          onProjectViewedIndexChange={setCurrentProjectIndexInModal}
        />
      )}
      {isManualAddModalOpen && (
        <ManualAddContentModal
          isOpen={isManualAddModalOpen}
          onClose={() => setIsManualAddModalOpen(false)}
          onAddContent={handleManualContentAdd}
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
                 <div className="max-h-[60vh] overflow-y-auto pr-2 mt-2" dangerouslySetInnerHTML={{ __html: changelogContent }} />
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

