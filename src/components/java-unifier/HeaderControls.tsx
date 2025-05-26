// components/java-unifier/HeaderControls.tsx
"use client"

import { ThemeToggle } from "./ThemeToggle"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface HeaderControlsProps {
  previewEnabled: boolean;
  onPreviewToggle: (enabled: boolean) => void;
  appVersion?: string;
}

export function HeaderControls({
  previewEnabled,
  onPreviewToggle,
  appVersion,
}: HeaderControlsProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="preview-enabled"
            checked={previewEnabled}
            onCheckedChange={onPreviewToggle}
          />
          <Label htmlFor="preview-enabled" className="text-sm font-medium">
            Activar Vista Previa
          </Label>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        {appVersion && (
          <span className="text-sm font-medium px-2.5 py-1 rounded-md border border-border bg-secondary text-secondary-foreground select-none">
            v{appVersion}
          </span>
        )}
        <ThemeToggle />
      </div>
    </div>
  )
}
