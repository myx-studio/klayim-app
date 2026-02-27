"use client";

import { OrgOnboardingLayout } from "@/components/onboarding/org-onboarding-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { importEmployees } from "@/lib/api/employees";
import { useOrganization } from "@/hooks/use-organization";
import type { CsvEmployeeRow } from "@klayim/shared";
import { Check, ChevronLeft, ChevronRight, Search, Upload, AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

const ConfirmCsvPage = () => {
  const router = useRouter();
  const { organization } = useOrganization();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [employees, setEmployees] = React.useState<CsvEmployeeRow[]>([]);
  const [errorCount, setErrorCount] = React.useState(0);
  const [isImporting, setIsImporting] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 10;

  // Load validated data from session storage
  React.useEffect(() => {
    const stored = sessionStorage.getItem("csvValidated");
    const errorsStored = sessionStorage.getItem("csvValidationErrors");

    if (!stored) {
      router.push("/onboarding/upload-csv");
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      setEmployees(parsed);

      if (errorsStored) {
        const errors = JSON.parse(errorsStored);
        setErrorCount(errors.length);
      }
    } catch {
      router.push("/onboarding/upload-csv");
    }
  }, [router]);

  // Filter employees based on search
  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.role?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (emp.department?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / pageSize);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset to page 1 when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Calculate hourly rate for display (same formula as backend)
  const getHourlyRate = (emp: CsvEmployeeRow): number => {
    if (emp.hourlyRate) return emp.hourlyRate;
    if (emp.annualSalary) return Math.round((emp.annualSalary / 2080) * 100) / 100;
    return 0;
  };

  const handleUploadDifferent = () => {
    // Clear session storage
    sessionStorage.removeItem("csvUpload");
    sessionStorage.removeItem("csvValidated");
    sessionStorage.removeItem("csvValidationErrors");
    router.push("/onboarding/upload-csv");
  };

  const handleSkip = () => {
    // Clear session storage
    sessionStorage.removeItem("csvUpload");
    sessionStorage.removeItem("csvValidated");
    sessionStorage.removeItem("csvValidationErrors");
    router.push("/onboarding/connect-calendar");
  };

  const handleImport = async () => {
    if (!organization?.id) {
      toast.error("Please complete organization setup first");
      return;
    }

    if (employees.length === 0) {
      toast.error("No employees to import");
      return;
    }

    setIsImporting(true);

    try {
      const result = await importEmployees(organization.id, employees);
      toast.success(
        `Successfully imported ${result.imported} employees${result.updated > 0 ? `, updated ${result.updated}` : ""}`
      );

      // Clear session storage
      sessionStorage.removeItem("csvUpload");
      sessionStorage.removeItem("csvValidated");
      sessionStorage.removeItem("csvValidationErrors");

      router.push("/onboarding/connect-calendar");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import employees");
    } finally {
      setIsImporting(false);
    }
  };

  // Validation summary
  const totalEmployees = employees.length;

  return (
    <OrgOnboardingLayout
      title="Confirm Import"
      description="Review the employee data before importing."
      onSkip={handleSkip}
      onNext={handleImport}
      nextDisabled={isImporting || totalEmployees === 0}
      nextLabel={
        isImporting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Importing...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Import {totalEmployees} Employee{totalEmployees !== 1 ? "s" : ""}
          </>
        )
      }
    >
      {/* Validation Summary */}
      <Card className="flex items-center gap-4 p-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${errorCount > 0 ? "bg-yellow-100" : "bg-emerald-100"}`}
        >
          {errorCount > 0 ? (
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
          ) : (
            <Check className="h-5 w-5 text-emerald-600" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium">
            {totalEmployees} employee{totalEmployees !== 1 ? "s" : ""} ready to import
          </p>
          <p className="text-muted-foreground text-sm">
            {errorCount > 0
              ? `${errorCount} row${errorCount !== 1 ? "s" : ""} skipped due to validation errors`
              : "All records passed validation"}
          </p>
        </div>
      </Card>

      {/* Search and Table */}
      <div className="flex flex-col gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Data Table */}
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Hourly Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedEmployees.length > 0 ? (
                paginatedEmployees.map((employee, index) => (
                  <TableRow key={`${employee.email}-${index}`}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>{employee.role || "-"}</TableCell>
                    <TableCell>{employee.department || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{employee.email}</TableCell>
                    <TableCell className="text-right">
                      {getHourlyRate(employee) > 0
                        ? `$${getHourlyRate(employee).toFixed(2)}/hr`
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                    {searchQuery
                      ? "No employees found matching your search."
                      : "No employees to display."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Showing {paginatedEmployees.length} of {filteredEmployees.length} employee
            {filteredEmployees.length !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Upload Different File */}
      <Button variant="ghost" onClick={handleUploadDifferent} className="w-full">
        Upload Different File
      </Button>
    </OrgOnboardingLayout>
  );
};

export default ConfirmCsvPage;
