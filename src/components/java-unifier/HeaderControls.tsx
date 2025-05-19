// components/java-unifier/HeaderControls.tsx
"use client"

import { ThemeToggle } from "./ThemeToggle"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface HeaderControlsProps {
  previewEnabled: boolean;
  onPreviewToggle: (enabled: boolean) => void;
}

export function HeaderControls({
  previewEnabled,
  onPreviewToggle,
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
      <ThemeToggle />
    </div>
  )
}
