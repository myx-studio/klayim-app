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
import { cn } from "@/lib/utils";
import { Check, ChevronRight, Upload } from "lucide-react";
import * as React from "react";

export interface UploadCsvDialogProps {
  /** Dialog open state */
  open: boolean;
  /** Callback to change open state */
  onOpenChange: (open: boolean) => void;
}

// Simple inline step indicator component for the dialog
function CsvUploadStepper({ currentStep }: { currentStep: number }) {
  const steps = ["Upload", "Validate", "Confirm"];

  return (
    <div className="flex items-center justify-center gap-1">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;

        return (
          <React.Fragment key={step}>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  isCompleted && "bg-emerald-100 text-emerald-600",
                  isActive && "bg-primary/10 text-primary",
                  !isCompleted && !isActive && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="h-3 w-3" /> : index + 1}
              </div>
              <span
                className={cn(
                  "text-sm",
                  isActive && "font-medium",
                  !isActive && "text-muted-foreground"
                )}
              >
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <ChevronRight className="text-muted-foreground h-4 w-4" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

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

        {/* Step indicator (visual only) */}
        <div className="py-2">
          <CsvUploadStepper currentStep={0} />
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
        <InfoAccordion
          title="Required Columns"
          items={requiredColumns}
          defaultOpen
          columns={3}
          footer={
            <Button variant="default" className="w-auto" asChild>
              <a href="/templates/employee-import-template.csv" download>
                Download Template
              </a>
            </Button>
          }
        />

        {/* Skip Button */}
        <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full">
          Skip for Now
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export { UploadCsvDialog };
