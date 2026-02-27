/*
 ** path: ~/dev-app/myx/klayim/apps/web/src/components/pages/onboarding/upload-csv/index.tsx
 ** author: MYXSTUDIO
 ** createdBy: Ardiansyah Iqbal
 ** createdDate: 2026-02-27
 ** github: @aiqbalsyah
 */

"use client";

import { InfoAccordion } from "@/components/onboarding/info-accordion";
import { OrgOnboardingLayout } from "@/components/onboarding/org-onboarding-layout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileText, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

const UploadCsvPage = () => {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  const handleSkip = () => {
    router.push("/onboarding/connect-calendar");
  };

  const handleNext = async () => {
    if (!selectedFile) return;
    // Read file content and store for next page
    const content = await selectedFile.text();
    sessionStorage.setItem(
      "csvUpload",
      JSON.stringify({
        name: selectedFile.name,
        content,
      })
    );
    router.push("/onboarding/upload-csv/validate");
  };

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
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith(".csv")) {
      setSelectedFile(file);
    }
  };

  const handleZoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Required columns info
  const requiredColumns = [
    { text: "Full Name" },
    { text: "Email (company domain)" },
    { text: "Hourly Rate or Annual Salary" },
    { text: "Department" },
    { text: "Role" },
  ];

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <OrgOnboardingLayout
      title="Upload Employee CSV"
      description="Upload a CSV file with your employee data to import into Klayim."
      onSkip={handleSkip}
      onNext={handleNext}
      nextLabel="Continue"
      nextDisabled={!selectedFile}
    >
      {/* Drag & Drop Zone or Selected File */}
      {selectedFile ? (
        <div className="flex items-center gap-4 rounded-lg border p-4">
          <div className="bg-primary/10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg">
            <FileText className="text-primary h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{selectedFile.name}</p>
            <p className="text-muted-foreground text-sm">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRemoveFile}
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          onClick={handleZoneClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
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
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />

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
    </OrgOnboardingLayout>
  );
};

export default UploadCsvPage;
