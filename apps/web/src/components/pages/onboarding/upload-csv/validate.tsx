"use client";

import { OrgOnboardingLayout } from "@/components/onboarding/org-onboarding-layout";
import { cn } from "@/lib/utils";
import { csvEmployeeRowSchema, csvColumnAliases } from "@klayim/shared";
import type { CsvEmployeeRow } from "@klayim/shared";
import { Check, Circle, Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import * as React from "react";
import { toast } from "sonner";

// Validation step status
type ValidationStatus = "pending" | "loading" | "completed" | "error";

interface ValidationStep {
  id: string;
  label: string;
  status: ValidationStatus;
  errorMessage?: string;
}

interface ValidationError {
  row: number;
  issues: Array<{ path: string[]; message: string }>;
}

const ValidateCsvPage = () => {
  const router = useRouter();
  const [validationSteps, setValidationSteps] = React.useState<ValidationStep[]>([
    { id: "format", label: "Checking Formatting", status: "pending" },
    { id: "emails", label: "Validating employee data", status: "pending" },
    { id: "rates", label: "Calculating hourly rates", status: "pending" },
  ]);
  const [validationErrors, setValidationErrors] = React.useState<ValidationError[]>([]);
  const hasStarted = React.useRef(false);

  // Normalize column names from CSV to our expected field names
  const normalizeRow = React.useCallback(
    (row: Record<string, string>): Record<string, unknown> => {
      const normalized: Record<string, unknown> = {};
      Object.entries(row).forEach(([key, value]) => {
        // Skip empty values
        if (!value || value.trim() === "") return;

        // Normalize key: lowercase, trim, replace spaces with underscores
        const lowerKey = key.toLowerCase().trim().replace(/\s+/g, "_");
        // Check if this column has an alias
        const mappedKey = csvColumnAliases[lowerKey] || lowerKey;

        // Parse numeric fields
        if (["hourlyRate", "annualSalary"].includes(mappedKey)) {
          const numValue = parseFloat(value.replace(/[$,]/g, ""));
          if (!isNaN(numValue)) {
            normalized[mappedKey] = numValue;
          }
        } else {
          normalized[mappedKey] = value.trim();
        }
      });
      return normalized;
    },
    []
  );

  // Validate rows against schema
  const validateRows = React.useCallback(
    (
      rows: Record<string, unknown>[]
    ): { valid: CsvEmployeeRow[]; errors: ValidationError[] } => {
      const valid: CsvEmployeeRow[] = [];
      const errors: ValidationError[] = [];

      rows.forEach((row, index) => {
        const result = csvEmployeeRowSchema.safeParse(row);
        if (result.success) {
          valid.push(result.data);
        } else {
          errors.push({
            row: index + 2, // +2 because of 0-indexing and header row
            issues: result.error.issues.map((issue) => ({
              path: issue.path.map(String),
              message: issue.message,
            })),
          });
        }
      });

      return { valid, errors };
    },
    []
  );

  // Parse and validate CSV
  React.useEffect(() => {
    // Prevent double execution
    if (hasStarted.current) return;
    hasStarted.current = true;

    const stored = sessionStorage.getItem("csvUpload");
    if (!stored) {
      router.push("/onboarding/upload-csv");
      return;
    }

    const { content } = JSON.parse(stored);

    // Step 1: Parse CSV format
    setValidationSteps((prev) =>
      prev.map((step) => (step.id === "format" ? { ...step, status: "loading" } : step))
    );

    // Small delay for UI feedback
    setTimeout(() => {
      Papa.parse<Record<string, string>>(content, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            // CSV parsing errors
            setValidationSteps((prev) =>
              prev.map((step) =>
                step.id === "format"
                  ? { ...step, status: "error", errorMessage: "Invalid CSV format" }
                  : step
              )
            );
            toast.error("CSV file has formatting errors");
            return;
          }

          // Format check passed
          setValidationSteps((prev) =>
            prev.map((step) =>
              step.id === "format"
                ? { ...step, status: "completed" }
                : step.id === "emails"
                  ? { ...step, status: "loading" }
                  : step
            )
          );

          // Step 2: Validate data
          setTimeout(() => {
            const normalized = results.data.map(normalizeRow);
            const validationResults = validateRows(normalized);

            if (validationResults.errors.length > 0) {
              setValidationErrors(validationResults.errors);
              // Still continue if we have some valid rows
              if (validationResults.valid.length === 0) {
                setValidationSteps((prev) =>
                  prev.map((step) =>
                    step.id === "emails"
                      ? { ...step, status: "error", errorMessage: "No valid employee records found" }
                      : step
                  )
                );
                toast.error("No valid employee records found in CSV");
                return;
              }
            }

            setValidationSteps((prev) =>
              prev.map((step) =>
                step.id === "emails"
                  ? { ...step, status: "completed" }
                  : step.id === "rates"
                    ? { ...step, status: "loading" }
                    : step
              )
            );

            // Step 3: Rate calculation (happens on import, just mark complete)
            setTimeout(() => {
              setValidationSteps((prev) =>
                prev.map((step) => (step.id === "rates" ? { ...step, status: "completed" } : step))
              );

              // Store validated data for confirm page
              sessionStorage.setItem("csvValidated", JSON.stringify(validationResults.valid));
              sessionStorage.setItem(
                "csvValidationErrors",
                JSON.stringify(validationResults.errors)
              );

              // Navigate to confirm page
              setTimeout(() => {
                router.push("/onboarding/upload-csv/confirm");
              }, 500);
            }, 500);
          }, 500);
        },
        error: (error) => {
          setValidationSteps((prev) =>
            prev.map((step) =>
              step.id === "format"
                ? { ...step, status: "error", errorMessage: error.message }
                : step
            )
          );
          toast.error(`CSV parsing failed: ${error.message}`);
        },
      });
    }, 300);
  }, [router, normalizeRow, validateRows]);

  const handleSkip = () => {
    router.push("/onboarding/connect-calendar");
  };

  const handleNext = () => {
    router.push("/onboarding/upload-csv/confirm");
  };

  // Check if all validation is complete
  const isComplete = validationSteps.every(
    (step) => step.status === "completed" || step.status === "error"
  );
  const hasErrors = validationSteps.some((step) => step.status === "error");

  return (
    <OrgOnboardingLayout
      title="Validating CSV"
      description="We're checking your file for any issues before import."
      onSkip={handleSkip}
      onNext={handleNext}
      nextLabel="Continue"
      showSkip={false}
    >
      {/* Validation Progress */}
      <div className="flex flex-col gap-4 rounded-lg border p-6">
        {validationSteps.map((step) => (
          <div key={step.id} className="flex items-center gap-4">
            {/* Status icon */}
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                step.status === "completed" && "bg-emerald-100",
                step.status === "loading" && "bg-primary/10",
                step.status === "pending" && "bg-muted",
                step.status === "error" && "bg-destructive/10"
              )}
            >
              {step.status === "completed" && <Check className="h-4 w-4 text-emerald-600" />}
              {step.status === "loading" && (
                <Loader2 className="text-primary h-4 w-4 animate-spin" />
              )}
              {step.status === "pending" && <Circle className="text-muted-foreground h-4 w-4" />}
              {step.status === "error" && <AlertCircle className="text-destructive h-4 w-4" />}
            </div>

            {/* Label */}
            <div className="flex flex-col">
              <span
                className={cn(
                  "text-sm",
                  step.status === "completed" && "text-emerald-600",
                  step.status === "loading" && "text-foreground font-medium",
                  step.status === "pending" && "text-muted-foreground",
                  step.status === "error" && "text-destructive"
                )}
              >
                {step.label}
              </span>
              {step.errorMessage && (
                <span className="text-destructive text-xs">{step.errorMessage}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Validation errors list */}
      {validationErrors.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="mb-2 text-sm font-medium text-yellow-800">
            {validationErrors.length} row(s) with issues (will be skipped):
          </p>
          <ul className="list-inside list-disc space-y-1">
            {validationErrors.slice(0, 5).map((error) => (
              <li key={error.row} className="text-xs text-yellow-700">
                Row {error.row}: {error.issues.map((i) => i.message).join(", ")}
              </li>
            ))}
            {validationErrors.length > 5 && (
              <li className="text-xs text-yellow-700">
                ... and {validationErrors.length - 5} more
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Progress message */}
      <p className="text-muted-foreground text-center text-sm">
        {hasErrors
          ? "Please fix the errors and try again."
          : isComplete
            ? "Validation complete! Redirecting..."
            : "Please wait while we validate your file..."}
      </p>
    </OrgOnboardingLayout>
  );
};

export default ValidateCsvPage;
