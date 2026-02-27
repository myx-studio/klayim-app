/**
 * Employment status for employee records
 */
export type EmploymentStatus =
  | "fullTime"
  | "partTime"
  | "contractor"
  | "inactive";

/**
 * Source type indicating how employee data was imported
 */
export type EmployeeSourceType = "bamboohr" | "finch" | "manual" | "csv";

/**
 * Employee record for meeting cost calculation
 * Each employee belongs to one organization (multi-tenant)
 */
export interface Employee {
  id: string;
  organizationId: string; // Multi-tenant isolation key

  // Required fields for meeting cost calculation
  name: string; // Full name
  email: string; // For matching meeting attendees
  role: string; // Job title/role (free-form)
  department: string; // Department name (free-form, single)
  hourlyRateCents: number; // Hourly rate stored as integer cents (not float)

  // Status tracking
  employmentStatus: EmploymentStatus;

  // Import source tracking
  sourceType: EmployeeSourceType; // How this employee was added
  sourceId?: string; // External ID from HRIS provider

  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string; // Last HRIS sync time (for imported employees)
}

/**
 * CSV import row type (salary conversion handled in service layer)
 */
export interface CsvEmployeeRow {
  name: string;
  email: string;
  role?: string;
  department?: string;
  hourlyRate?: number; // Will be converted to cents
  annualSalary?: number; // Alternative to hourlyRate
}
