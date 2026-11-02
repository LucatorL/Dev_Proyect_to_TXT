// src/lib/translations.ts
import type { ProjectType } from "./file-processor";

export type Language = 'en' | 'es';

// Constants used in logic, their display text will be translated
export const DEFAULT_PACKAGE_NAME_LOGIC = "(Default Package)";
export const OTHER_FILES_PACKAGE_NAME_LOGIC = "(Other Project Files)";


export const translations = {
  en: {
    // HeaderControls
    activatePreview: "Activate Preview",
    unifyMultipleProjects: "Unify Multiple Projects",
    viewVersionNews: "View version {version} news",
    selectLanguage: "Language",
    english: "English",
    spanish: "Español",
    appVersion: "v{version}",
    resizePanels: "Resize file list and preview",
    resetPanelWidth: "Drag to resize · double-click to restore automatic width",
    projectType: "Project Type",
    projectTypeJava: "Java",
    projectTypeWeb: "Web",
    projectTypeTotal: "Total",
    mainFiles: "Main files",
    otherFiles: "Other files",

    // FileDropzone
    dropzoneHint: "Drag projects, folders or files here",
    dropzoneSubHint: "You can drag project folders, single files, ZIP or RAR archives.",
    selectFiles: "Select files, ZIP or RAR",
    selectFolders: "Select folder",
    importing: "Reading files…",
    importIssuesTitle: "Some files were not imported",
    importSize: "Exceeds the 5 MiB limit",
    importLimit: "Exceeds the limit of 250 files per import",
    importRead: "Could not read this file or folder",
    importArchive: "Could not open this archive",
    importArchivePassword: "Password-protected RAR; extract it first",
    importArchiveVolume: "Multipart RAR; extract it first",
    importUnsupported: "Unsupported file type",
    goToFile: "Go to {fileName}",
    unsupportedItem: "Unsupported Item",
    unsupportedItemDescription: "Item '{fileName}' is not a folder or a supported file and will be ignored.",
    noValidFilesSelected: "No valid files selected",
    noValidFilesSelectedDescription: "No supported file types were selected for the current project type. Please try again.",
    
    // RecentFilesList
    processedHistory: "Processed History",
    viewInfoAbout: "Open again: {fileName}\nType: {type}\nLast time: {timestamp}",
    historyReconnectHint: "This older entry has no access to your files yet. Select its folder or source file once to reconnect it. Your browser may ask for permission again later.",
    historyLink: "Reconnect",
    historyReopenError: "Could not reopen the original files. Choose the source again.",
    historyPermissionDenied: "Access to these files was not granted. You can try again from the history.",
    historyBrowserUnsupported: "This browser cannot remember access to files. Drag the project onto the home page again.",
    unifiedFilesBoard: "Unified files",
    boardFileCount: "Total unified files",
    boardDescription: "Shared leaderboard. Your name and totals are visible to everyone with access. Project contents are never sent to the leaderboard.",
    boardName: "Name",
    boardProject: "Project",
    boardFiles: "Files",
    boardDate: "Date",
    boardEmpty: "The first unification will appear here.",
    boardParticipants: "participants",
    boardParticipant: "participant",
    boardYours: "Your files",
    boardYourName: "Your name on the leaderboard",
    boardDefaultName: "Random name",
    boardNameWarning: "The exact same name on another device combines both scores. Anyone can use an existing name; identities are not verified.",
    boardExistingNameWarning: "This name is already on the leaderboard. Saving it will combine your scores.",
    boardSaveName: "Save name",
    boardUnifications: "Unifications",
    boardMe: "you",
    boardPending: "{count} unification(s) waiting to sync. They will be retried automatically.",
    boardUnavailable: "The shared leaderboard is temporarily unavailable.",
    boardRetry: "Retry",
    boardLoading: "Loading leaderboard…",
    boardTopFifty: "Showing the top 50 participants.",
    deleteFromRecents: "Delete from recents",
    confirmDeletion: "Confirm deletion",
    confirmDeletionDescription: "Are you sure you want to remove \"{fileName}\" from the list of recently processed items? This action cannot be undone.",
    cancel: "Cancel",
    delete: "Delete",

    // FileSelectionModal
    unifyMultipleProjectsTitle: "Unify Multiple Projects",
    selectFilesFromProjectTitle: "Select Files from: {projectName}",
    projectPageIndicator: "({currentIndex} of {totalProjects})",
    selectFilesModalDescription: "Select the files to include. Primary files for the project type are selected by default.",
    onlyUnsupportedFilesDescription: "No standard files for this project type were found, but you can add any of the files listed below.",
    projectFiles: "Project Files",
    filesFromProject: "Files from: {projectName}",
    currentProjectFallbackName: "Current Project",
    previousProject: "Previous Project",
    nextProject: "Next Project",
    onlyJava: "Only Java",
    onlyWebCore: "Web Core",
    selectAll: "Select All",
    deselectAll: "Deselect All",
    noSelectableFiles: "No selectable files in this project or view.",
    addManually: "Add Manually",
    unifiedPreview: "Unified Preview",
    approxTokens: "(~{tokenCount} tokens approx.)",
    tokenEstimationTooltip: "Estimation based on ~4 characters per token. Actual count may vary depending on the AI model used.",
    previewDeactivated: "Preview is deactivated.",
    previewDeactivatedPlaceholder: "Preview is deactivated or no files selected.",
    copyAll: "Copy All",
    acceptAndSave: "Accept and Save",
    previewFileTitle: "Preview: {fileName}",
    copy: "Copy",
    close: "Close",
    noSelection: "No Selection",
    pleaseSelectOneFileFromAProject: "Please select at least one file from a project.", 
    pleaseSelectOneFileFromCurrentProject: "Please select at least one file from the current project.", 
    error: "Error",
    noProjectToUnify: "No project selected to unify.",
    emptyContent: "Empty",
    nothingToCopy: "No content to copy.",
    copied: "Copied",
    unifiedContentCopied: "Unified content copied to clipboard.",
    couldNotCopy: "Could not copy to clipboard.",
    fileContentCopied: "Content of {fileName} copied.",
    couldNotCopyToClipboard: "Could not copy to clipboard.", 
    otherFileTypesFound: "{count} other file types found",
    otherFileTypesDescription: "These files are not standard for the '{projectType}' project type, but you can add them to the unification process.",
    add: "Add",
    searchInPreview: "Search in preview...",
    searchFilesAndFolders: "Search files and folders...",
    clearSearch: "Clear search",
    noFilesFound: "No matching files or folders.",
    selectFolderContents: "Select all files in {folder}",
    search: "Search",
    largeProjectWarningTitle: "Large Project Warning",
    largeProjectWarningDescription: "This project is very large. Large context windows can worsen the output quality of LLMs.",

    // ManualAddContentModal
    addManualContentTitle: "Add Content Manually",
    addManualContentDescription: "Drag a file directly into the content area, or paste the text manually. Assign it a name to add it to the project.",
    fileNameLabel: "File Name",
    fileNamePlaceholder: "E.g.: MyClass.java, styles.css",
    contentLabel: "Content",
    contentPlaceholder: "Drag a file here, or paste content",
    destinationLabel: "Destination",
    selectDestinationPlaceholder: "Select destination...",
    addToProject: "Add to: {projectName}",
    createNewProject: "Create as new project",
    addFile: "Add File",
    fileNameEmptyError: "File name cannot be empty.",
    contentEmptyError: "Content cannot be empty.",
    noExtensionWarning: "File name does not seem to have an extension (e.g., .java, .txt).",
    multipleFilesDraggedTitle: "Multiple files detected",
    multipleFilesDraggedDescription: "Only the first file, '{fileName}', was processed. Please drag and drop one file at a time.",
    
    // page.tsx (general UI)
    appTitle: "Dev_Proyect_to_TXT",
    appDescription: "Unify project files (Java, Web, etc.) into a single document.",
    
    // Toasts in page.tsx
    entryDeletedFromHistoryToast: "Entry deleted from history.", 
    noSupportedFilesFoundToastTitle: "No standard files found",
    noSupportedFilesFoundToastDescription: "No standard files for the '{projectType}' project type were found in the provided items. You can add other recognized file types from the selection modal.",
    processingErrorToastTitle: "Processing Error",
    processingErrorToastDescription: "An error occurred while processing the files. Check the console for more details.",
    processingErrorToastDescriptionShort: "Could not read file {fileName}.",
    successToastTitle: "Success",
    projectProcessedAndDownloadedToast: "Project {projectName} processed and downloaded.",
    fileDownloadedToast: "File {fileName} downloaded.",
    fileAddedToastTitle: "File Added",
    fileXAddedToYToast: "\"{fileName}\" added to {projectName}.",
    fileXAddedAsNewProjectToast: "\"{fileName}\" added as new project.",

    // Recent Info Modal (page.tsx)
    recentInfoModalTitle: "History Information: \"{recentName}\"",
    recentInfoModalDescription1: "This item appears in the \"Processed History\" as a reminder.",
    recentInfoModalType: "Type: {type}",
    recentInfoModalProcessedOn: "Processed on: {timestamp}",
    folderUnificationType: "Folder/Unification",
    individualFileType: "Individual File",
    understood: "Understood",

    // Changelog Modal (page.tsx)
    versionNewsTitle: "Version {version} News", 

    // Footer (page.tsx)
    footerAdaptedFrom: "Adapted from the",
    originalApplicationLinkText: "original JavaSourceToTxt",
    byText: "by",
    lucasProfileText: "Lucas",
    reportIssueLinkText: "Report an Issue / Suggestions",

    // Display names for package types
    defaultPackageNameDisplay: "(Default Package)",
    otherFilesPackageNameDisplay: "(Other Project Files)",
    
    // File-processor related (for UI, not generated file comments)
    projectUnifiedNamePrefix: "Unification of: ",
    projectUnifiedNameSuffixOthers: " and others...",
    unifiedProjectsGenericName: "Unified Projects",


  },
  es: {
    // HeaderControls
    activatePreview: "Activar Vista Previa",
    unifyMultipleProjects: "Unificar Múltiples Proyectos",
    viewVersionNews: "Ver novedades de la versión {version}",
    selectLanguage: "Idioma",
    english: "English",
    spanish: "Español",
    appVersion: "v{version}",
    resizePanels: "Ajustar lista de archivos y vista previa",
    resetPanelWidth: "Arrastra para ajustar · doble clic para volver al ancho automático",
    projectType: "Tipo de Proyecto",
    projectTypeJava: "Java",
    projectTypeWeb: "Web",
    projectTypeTotal: "Total",
    mainFiles: "Archivos principales",
    otherFiles: "Otros archivos",

    // FileDropzone
    dropzoneHint: "Arrastra aquí proyectos, carpetas o archivos",
    dropzoneSubHint: "Puedes arrastrar carpetas de proyectos, archivos sueltos, ZIP o RAR.",
    selectFiles: "Seleccionar archivos, ZIP o RAR",
    selectFolders: "Seleccionar carpeta",
    importing: "Leyendo archivos…",
    importIssuesTitle: "Hay archivos que no se han importado",
    importSize: "Supera el límite de 5 MiB",
    importLimit: "Supera el límite de 250 archivos por importación",
    importRead: "No se pudo leer este archivo o carpeta",
    importArchive: "No se pudo abrir este archivo comprimido",
    importArchivePassword: "RAR protegido con contraseña; extráelo primero",
    importArchiveVolume: "RAR dividido en partes; extráelo primero",
    importUnsupported: "Tipo de archivo no compatible",
    goToFile: "Ir a {fileName}",
    unsupportedItem: "Elemento no soportado",
    unsupportedItemDescription: "El elemento '{fileName}' no es una carpeta o un archivo soportado y será ignorado.",
    noValidFilesSelected: "Sin archivos válidos",
    noValidFilesSelectedDescription: "No se seleccionaron archivos de tipos soportados para el tipo de proyecto actual. Por favor, inténtalo de nuevo.",

    // RecentFilesList
    processedHistory: "Historial de Procesados",
    viewInfoAbout: "Volver a abrir: {fileName}\nTipo: {type}\nÚltima vez: {timestamp}",
    historyReconnectHint: "Esta entrada antigua aún no tiene acceso a tus archivos. Elige una vez su carpeta o archivo original para volver a conectarla. Puede que el navegador vuelva a pedir permiso más adelante.",
    historyLink: "Vincular",
    historyReopenError: "No se pudieron abrir los archivos originales. Vuelve a elegir la fuente.",
    historyPermissionDenied: "No se ha concedido acceso a esos archivos. Puedes intentarlo de nuevo desde el historial.",
    historyBrowserUnsupported: "Este navegador no permite recordar el acceso a archivos. Arrastra de nuevo el proyecto al inicio.",
    unifiedFilesBoard: "Archivos unificados",
    boardFileCount: "Total de archivos unificados",
    boardDescription: "Clasificación compartida. Tu nombre y tus cifras son visibles para quienes accedan a la app. No se envía el contenido de los proyectos.",
    boardName: "Nombre",
    boardProject: "Proyecto",
    boardFiles: "Archivos",
    boardDate: "Fecha",
    boardEmpty: "La primera unificación aparecerá aquí.",
    boardParticipants: "participantes",
    boardParticipant: "participante",
    boardYours: "Tus archivos",
    boardYourName: "Tu nombre en la clasificación",
    boardDefaultName: "Nombre aleatorio",
    boardNameWarning: "El mismo nombre exacto en otro equipo suma ambas puntuaciones. Cualquiera puede usar un nombre existente; no se verifica la identidad.",
    boardExistingNameWarning: "Este nombre ya está en la clasificación. Al guardarlo, se sumarán las puntuaciones.",
    boardSaveName: "Guardar nombre",
    boardUnifications: "Unificaciones",
    boardMe: "tú",
    boardPending: "{count} unificación(es) pendiente(s) de sincronizar. Se reintentará automáticamente.",
    boardUnavailable: "La clasificación compartida no está disponible ahora.",
    boardRetry: "Reintentar",
    boardLoading: "Cargando clasificación…",
    boardTopFifty: "Se muestran las 50 primeras personas.",
    deleteFromRecents: "Eliminar de recientes",
    confirmDeletion: "Confirmar eliminación",
    confirmDeletionDescription: "¿Estás seguro de que quieres eliminar \"{fileName}\" de la lista de procesados recientes? Esta acción no se puede deshacer.",
    cancel: "Cancelar",
    delete: "Eliminar",

    // FileSelectionModal
    unifyMultipleProjectsTitle: "Unificar Múltiples Proyectos",
    selectFilesFromProjectTitle: "Seleccionar Archivos de: {projectName}",
    projectPageIndicator: "({currentIndex} de {totalProjects})",
    selectFilesModalDescription: "Selecciona los archivos a incluir. Los archivos primarios para el tipo de proyecto se seleccionan por defecto.",
    onlyUnsupportedFilesDescription: "No se encontraron archivos estándar para este tipo de proyecto, pero puedes añadir los que se listan abajo.",
    projectFiles: "Archivos de Proyectos",
    filesFromProject: "Archivos de: {projectName}",
    currentProjectFallbackName: "Proyecto Actual",
    previousProject: "Proyecto Anterior",
    nextProject: "Siguiente Proyecto",
    onlyJava: "Solo Java",
    onlyWebCore: "Núcleo Web",
    selectAll: "Todo",
    deselectAll: "Nada",
    noSelectableFiles: "No hay archivos seleccionables en este proyecto o vista.",
    addManually: "Añadir Manualmente",
    unifiedPreview: "Vista Previa Unificada",
    approxTokens: "(~{tokenCount} tokens aprox.)",
    tokenEstimationTooltip: "Estimación basada en ~4 caracteres por token. El recuento real puede variar según el modelo de IA utilizado.",
    previewDeactivated: "La vista previa está desactivada.",
    previewDeactivatedPlaceholder: "La vista previa está desactivada o no hay archivos seleccionados.",
    copyAll: "Copiar Todo",
    acceptAndSave: "Aceptar y Guardar",
    previewFileTitle: "Vista Previa: {fileName}",
    copy: "Copiar",
    close: "Cerrar",
    noSelection: "Sin selección",
    pleaseSelectOneFileFromAProject: "Por favor, selecciona al menos un archivo de algún proyecto.",
    pleaseSelectOneFileFromCurrentProject: "Por favor, selecciona al menos un archivo del proyecto actual.",
    error: "Error",
    noProjectToUnify: "No hay proyecto seleccionado para unificar.",
    emptyContent: "Vacío",
    nothingToCopy: "No hay contenido para copiar.",
    copied: "Copiado",
    unifiedContentCopied: "Contenido unificado copiado al portapapeles.",
    couldNotCopy: "No se pudo copiar al portapapeles.",
    fileContentCopied: "Contenido de {fileName} copiado.",
    couldNotCopyToClipboard: "No se pudo copiar.",
    otherFileTypesFound: "{count} archivos de otro tipo encontrados",
    otherFileTypesDescription: "Estos archivos no son estándar para el tipo de proyecto '{projectType}', pero puedes añadirlos al proceso de unificación.",
    add: "Añadir",
    searchInPreview: "Buscar en la vista previa...",
    searchFilesAndFolders: "Buscar archivos y carpetas...",
    clearSearch: "Borrar búsqueda",
    noFilesFound: "No hay archivos ni carpetas que coincidan.",
    selectFolderContents: "Seleccionar todos los archivos de {folder}",
    search: "Buscar",
    largeProjectWarningTitle: "Aviso de Proyecto Grande",
    largeProjectWarningDescription: "Este proyecto es muy grande. Ventanas de contexto grandes pueden empeorar la calidad de salida de los LLMs.",


    // ManualAddContentModal
    addManualContentTitle: "Añadir Contenido Manualmente",
    addManualContentDescription: "Arrastra un archivo directamente al área de contenido, o pega el texto manualmente. Asígnale un nombre para añadirlo al proyecto.",
    fileNameLabel: "Nombre Archivo",
    fileNamePlaceholder: "Ej: MiClase.java, styles.css",
    contentLabel: "Contenido",
    contentPlaceholder: "Arrastra un archivo aquí, o pega el contenido",
    destinationLabel: "Destino",
    selectDestinationPlaceholder: "Seleccionar destino...",
    addToProject: "Añadir a: {projectName}",
    createNewProject: "Crear como nuevo proyecto",
    addFile: "Añadir Archivo",
    fileNameEmptyError: "El nombre del archivo no puede estar vacío.",
    contentEmptyError: "El contenido no puede estar vacío.",
    noExtensionWarning: "El nombre del archivo no parece tener una extensión (ej: .java, .txt).",
    multipleFilesDraggedTitle: "Múltiples archivos detectados",
    multipleFilesDraggedDescription: "Solo se ha procesado el primer archivo, '{fileName}'. Por favor, arrastra y suelta un archivo cada vez.",

    // page.tsx (general UI)
    appTitle: "Dev_Proyect_to_TXT",
    appDescription: "Unifica archivos de proyectos (Java, Web, etc.) en un solo documento.",

    // Toasts in page.tsx
    entryDeletedFromHistoryToast: "Entrada eliminada del historial.",
    noSupportedFilesFoundToastTitle: "Sin archivos estándar",
    noSupportedFilesFoundToastDescription: "No se encontraron archivos estándar para el tipo de proyecto '{projectType}'. Puedes añadir otros tipos de archivo reconocidos desde el modal de selección.",
    processingErrorToastTitle: "Error de Procesamiento",
    processingErrorToastDescription: "Ocurrió un error al procesar los archivos. Revisa la consola para más detalles.",
    processingErrorToastDescriptionShort: "No se pudo leer el archivo {fileName}.",
    successToastTitle: "Éxito",
    projectProcessedAndDownloadedToast: "Proyecto {projectName} procesado y descargado.",
    fileDownloadedToast: "Archivo {fileName} descargado.",
    fileAddedToastTitle: "Archivo Añadido",
    fileXAddedToYToast: "\"{fileName}\" añadido a {projectName}.",
    fileXAddedAsNewProjectToast: "\"{fileName}\" añadido como nuevo proyecto.",

    // Recent Info Modal (page.tsx)
    recentInfoModalTitle: "Información del Historial: \"{recentName}\"",
    recentInfoModalDescription1: "Este elemento aparece en el \"Historial de Procesados\" como un recordatorio.",
    recentInfoModalType: "Tipo: {type}",
    recentInfoModalProcessedOn: "Procesado el: {timestamp}",
    folderUnificationType: "Carpeta/Unificación",
    individualFileType: "Archivo Individual",
    understood: "Entendido",

    // Changelog Modal (page.tsx) - Title only
    versionNewsTitle: "Novedades de la Versión {version}",

    // Footer (page.tsx)
    footerAdaptedFrom: "Adaptado de",
    originalApplicationLinkText: "la aplicación original JavaSourceToTxt",
    byText: "de",
    lucasProfileText: "Lucas",
    reportIssueLinkText: "Reportar un Problema / Sugerencias",

    // Display names for package types
    defaultPackageNameDisplay: "(Paquete por Defecto)",
    otherFilesPackageNameDisplay: "(Otros Archivos de Proyecto)",

    // File-processor related (for UI, not generated file comments)
    projectUnifiedNamePrefix: "Unificación de: ",
    projectUnifiedNameSuffixOthers: " y otros...",
    unifiedProjectsGenericName: "Proyectos Unificados",
  }
};

export function t(key: string, lang: Language, replacements?: Record<string, string | number | undefined>): string {
  const langKey = lang || 'es'; // Fallback to Spanish if lang is undefined
  let translationSet = translations[langKey];
  if (!translationSet) { // Fallback if language is not found
      console.warn(`Translation set for language \"${langKey}\" not found. Falling back to Spanish.`);
      translationSet = translations['es'];
  }

  let str = translationSet[key as keyof typeof translations.es]; // Use 'es' as a reference for keys

  if (str === undefined) { // If key not found in target lang, try English as a general fallback
    console.warn(`Translation key \"${key}\" not found for language \"${langKey}\". Trying English.`);
    str = translations.en[key as keyof typeof translations.en];
  }
  if (str === undefined) { // If still not found, return key itself
    console.warn(`Translation key \"${key}\" not found in any language. Returning key.`);
    return key;
  }

  if (replacements) {
    Object.keys(replacements).forEach(pKey => {
      const value = replacements[pKey];
      if (value !== undefined) {
        str = str.replace(new RegExp(`{${pKey}}`, 'g'), String(value));
      }
    });
  }
  return str;
}
