/*
 ** path: ~/dev-app/myx/klayim/apps/web/src/components/onboarding/upload-csv-dialog.tsx
 ** author: MYXSTUDIO
 ** createdBy: Ardiansyah Iqbal
 ** createdDate: 2026-02-27
 ** github: @aiqbalsyah
 */

"use client";

import { InfoAccordion } from "@/components/onboarding/info-accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SubStepper } from "@/components/ui/sub-stepper";
import { cn } from "@/lib/utils";
import { Download, Upload } from "lucide-react";
import * as React from "react";

export interface UploadCsvDialogProps {
  /** Dialog open state */
  open: boolean;
  /** Callback to change open state */
  onOpenChange: (open: boolean) => void;
}

// CSV upload sub-steps (visual only - no functionality yet)
const csvUploadSteps = [
  { id: "upload", label: "Upload" },
  { id: "validate", label: "Validate" },
  { id: "confirm", label: "Confirm" },
];

/**
 * UploadCsvDialog component for uploading employee data via CSV.
 * Shows drag-drop zone, required columns info, and template download.
 * Note: Actual upload functionality will be implemented in Phase 6.
 */
function UploadCsvDialog({ open, onOpenChange }: UploadCsvDialogProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Note: Actual file handling will be implemented in Phase 6
  };

  const handleZoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = () => {
    // Note: Actual file handling will be implemented in Phase 6
  };

  // Required columns info
  const requiredColumns = [
    { text: "Full Name" },
    { text: "Email (company domain)" },
    { text: "Hourly Rate or Annual Salary" },
    { text: "Department" },
    { text: "Role" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Employee CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with your employee data to import into Klayim.
          </DialogDescription>
        </DialogHeader>

        {/* Sub-stepper (visual only) */}
        <div className="py-2">
          <SubStepper steps={csvUploadSteps} currentStep={0} />
        </div>

        {/* Drag & Drop Zone */}
        <div
          onClick={handleZoneClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors",
            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
          )}
        >
          <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
            <Upload className="text-muted-foreground h-6 w-6" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">Drag and drop your CSV here</p>
            <p className="text-muted-foreground text-sm">or browse files</p>
          </div>
          <p className="text-muted-foreground text-xs">Supported: .csv - Max 5MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Required Columns Info */}
        <InfoAccordion title="Required Columns" items={requiredColumns} defaultOpen />

        {/* Download Template Button */}
        <Button variant="outline" className="w-full" asChild>
          <a href="/templates/employee-import-template.csv" download>
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </a>
        </Button>

        {/* Skip Button */}
        <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full">
          Skip for Now
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export { UploadCsvDialog };
