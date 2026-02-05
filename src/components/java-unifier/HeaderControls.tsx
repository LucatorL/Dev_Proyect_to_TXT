// components/java-unifier/HeaderControls.tsx
"use client"

import React from 'react';
import { ThemeToggle } from "./ThemeToggle"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Info, Coffee, Globe, Layers } from "lucide-react"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Language } from "@/lib/translations";
import { PROJECT_CONFIG, type ProjectType } from "@/lib/file-processor";
import { t } from "@/lib/translations";

interface HeaderControlsProps {
  previewEnabled: boolean;
  onPreviewToggle: (enabled: boolean) => void;
  multiProjectModeEnabled: boolean;
  onMultiProjectModeToggle: (enabled: boolean) => void;
  appVersion?: string;
  onVersionClick?: () => void;
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  projectType: ProjectType;
  onProjectTypeChange: (type: ProjectType) => void;
}

const ProjectTypeInfoTooltip = ({ projectType, currentLanguage }: { projectType: ProjectType, currentLanguage: Language }) => {
    const config = PROJECT_CONFIG[projectType];
    const mainExtensions = config.defaultSelected;
    const otherExtensions = config.extensions.filter(ext => !mainExtensions.includes(ext));
    const projectTypeName = t(`projectType${projectType.charAt(0).toUpperCase() + projectType.slice(1)}`, currentLanguage);

    return (
        <div className="text-left p-1">
            <p className="font-bold text-base mb-1">{projectTypeName}</p>
            <p className="text-sm">
                <span className="font-semibold">{t('mainFiles', currentLanguage)}:</span> {mainExtensions.map(e => `.${e}`).join(', ')}
            </p>
            {otherExtensions.length > 0 && (
                 <p className="text-sm mt-1">
                    <span className="font-semibold">{t('otherFiles', currentLanguage)}:</span> <strong>{otherExtensions.map(e => `.${e}`).join(', ')}</strong>
                 </p>
            )}
        </div>
    );
};

const projectTypeIcons: Record<ProjectType, React.ReactNode> = {
    java: <Coffee className="h-4 w-4" />,
    web: <Globe className="h-4 w-4" />,
    total: <Layers className="h-4 w-4" />,
};

export function HeaderControls({
  previewEnabled,
  onPreviewToggle,
  multiProjectModeEnabled,
  onMultiProjectModeToggle,
  appVersion,
  onVersionClick,
  currentLanguage,
  onLanguageChange,
  projectType,
  onProjectTypeChange
}: HeaderControlsProps) {
  return (
    <header className="flex items-center justify-between p-4 border-b gap-4 flex-wrap">
       <div className="flex items-center space-x-4 flex-wrap gap-y-2">
         <div className="flex items-center space-x-2">
            <Label htmlFor="project-type" className="text-sm font-medium whitespace-nowrap">
              {t('projectType', currentLanguage)}:
            </Label>
            <Select value={projectType} onValueChange={(value: ProjectType) => onProjectTypeChange(value)}>
                <SelectTrigger id="project-type" className="w-[150px] h-9 text-sm">
                    <div className="flex items-center gap-2">
                      {projectTypeIcons[projectType]}
                      <span className="truncate">{t(`projectType${projectType.charAt(0).toUpperCase() + projectType.slice(1)}`, currentLanguage)}</span>
                    </div>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="java">
                        {projectTypeIcons['java']}
                        <span className="ml-2">{t('projectTypeJava', currentLanguage)}</span>
                        <div className="ml-auto pl-2">
                            <TooltipProvider>
                                <Tooltip delayDuration={100}>
                                    <TooltipTrigger asChild onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                        <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-md" side="right">
                                        <ProjectTypeInfoTooltip projectType="java" currentLanguage={currentLanguage} />
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </SelectItem>
                    <SelectItem value="web">
                        {projectTypeIcons['web']}
                        <span className="ml-2">{t('projectTypeWeb', currentLanguage)}</span>
                        <div className="ml-auto pl-2">
                           <TooltipProvider>
                              <Tooltip delayDuration={100}>
                                  <TooltipTrigger asChild onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                      <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-md" side="right">
                                      <ProjectTypeInfoTooltip projectType="web" currentLanguage={currentLanguage} />
                                  </TooltipContent>
                              </Tooltip>
                          </TooltipProvider>
                        </div>
                    </SelectItem>
                    <SelectItem value="total">
                        {projectTypeIcons['total']}
                        <span className="ml-2">{t('projectTypeTotal', currentLanguage)}</span>
                        <div className="ml-auto pl-2">
                           <TooltipProvider>
                              <Tooltip delayDuration={100}>
                                  <TooltipTrigger asChild onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                      <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-md" side="right">
                                      <ProjectTypeInfoTooltip projectType="total" currentLanguage={currentLanguage} />
                                  </TooltipContent>
                              </Tooltip>
                          </TooltipProvider>
                        </div>
                    </SelectItem>
                </SelectContent>
            </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="preview-enabled"
            checked={previewEnabled}
            onCheckedChange={(checked) => {
              if (typeof checked === 'boolean') onPreviewToggle(checked);
            }}
          />
          <Label htmlFor="preview-enabled" className="text-sm font-medium">
            {t('activatePreview', currentLanguage)}
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="multi-project-mode"
            checked={multiProjectModeEnabled}
             onCheckedChange={(checked) => {
              if (typeof checked === 'boolean') onMultiProjectModeToggle(checked);
            }}
          />
          <Label htmlFor="multi-project-mode" className="text-sm font-medium">
            {t('unifyMultipleProjects', currentLanguage)}
          </Label>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <Select value={currentLanguage} onValueChange={(value: Language) => onLanguageChange(value)}>
          <SelectTrigger className="w-[120px] h-9 text-sm">
            <SelectValue placeholder={t('selectLanguage', currentLanguage)} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">{t('english', currentLanguage)}</SelectItem>
            <SelectItem value="es">{t('spanish', currentLanguage)}</SelectItem>
          </SelectContent>
        </Select>
        {appVersion && onVersionClick && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onVersionClick} 
            className="font-medium select-none"
            title={t('viewVersionNews', currentLanguage, { version: appVersion })}
          >
            {t('appVersion', currentLanguage, { version: appVersion })}
            <Info className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        )}
        <ThemeToggle />
      </div>
    </header>
  )
}
