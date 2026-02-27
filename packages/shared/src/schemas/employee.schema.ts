import { z } from "zod";

/**
 * Employment status validation enum
 */
export const employmentStatusSchema = z.enum([
  "fullTime",
  "partTime",
  "contractor",
  "inactive",
]);

/**
 * Employee source type validation enum
 */
export const employeeSourceTypeSchema = z.enum([
  "bamboohr",
  "finch",
  "manual",
  "csv",
]);

/**
 * Base employee schema (for API responses, includes id and timestamps)
 */
export const employeeSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  role: z.string().min(1, "Role is required"),
  department: z.string().min(1, "Department is required"),
  hourlyRateCents: z.number().int().min(0, "Hourly rate must be non-negative"),
  employmentStatus: employmentStatusSchema,
  sourceType: employeeSourceTypeSchema,
  sourceId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastSyncedAt: z.string().optional(),
});

/**
 * Create employee schema (for manual add, without id/timestamps)
 */
export const createEmployeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  role: z.string().min(1, "Role is required"),
  department: z.string().min(1, "Department is required"),
  hourlyRateCents: z.number().int().min(0, "Hourly rate must be non-negative"),
  employmentStatus: employmentStatusSchema.default("fullTime"),
});

/**
 * Update employee schema (partial, for editing)
 */
export const updateEmployeeSchema = createEmployeeSchema.partial();

/**
 * CSV import row schema (salary conversion handled in service layer)
 */
export const csvEmployeeRowSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.string().optional().default(""),
  department: z.string().optional().default(""),
  hourlyRate: z.number().optional(), // Will be converted to cents
  annualSalary: z.number().optional(), // Alternative to hourlyRate
});

/**
 * Inferred TypeScript types from schemas
 */
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type CsvEmployeeRow = z.infer<typeof csvEmployeeRowSchema>;
