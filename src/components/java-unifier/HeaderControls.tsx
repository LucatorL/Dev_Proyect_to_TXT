
// components/java-unifier/HeaderControls.tsx
"use client"

import { ThemeToggle } from "./ThemeToggle"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Info, Combine } from "lucide-react"

interface HeaderControlsProps {
  previewEnabled: boolean;
  onPreviewToggle: (enabled: boolean) => void;
  multiProjectModeEnabled: boolean;
  onMultiProjectModeToggle: (enabled: boolean) => void;
  appVersion?: string;
  onVersionClick?: () => void;
}

export function HeaderControls({
  previewEnabled,
  onPreviewToggle,
  multiProjectModeEnabled,
  onMultiProjectModeToggle,
  appVersion,
  onVersionClick,
}: HeaderControlsProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="preview-enabled"
            checked={previewEnabled}
            onCheckedChange={(checked) => {
              if (typeof checked === 'boolean') onPreviewToggle(checked);
            }}
          />
          <Label htmlFor="preview-enabled" className="text-sm font-medium">
            Activar Vista Previa
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
            Unificar Múltiples Proyectos
          </Label>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        {appVersion && onVersionClick && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onVersionClick} 
            className="font-medium select-none"
            title={`Ver novedades de la versión ${appVersion}`}
          >
            v{appVersion}
            <Info className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        )}
        {appVersion && !onVersionClick && (
           <span className="text-sm font-medium px-2.5 py-1.5 rounded-md border border-border bg-secondary text-secondary-foreground select-none">
            v{appVersion}
          </span>
        )}
        <ThemeToggle />
      </div>
    </div>
  )
}
