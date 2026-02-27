import { Hono } from "hono";
import { z } from "zod";
import { createHash } from "crypto";
import { authMiddleware } from "@/middleware/index.js";
import { employeeRepository } from "@/repositories/index.js";
import { organizationRepository } from "@/repositories/index.js";
import type { ApiResponse, Employee, CsvEmployeeRow, EmployeeSourceType } from "@klayim/shared/types";
import { csvEmployeeRowSchema } from "@klayim/shared";

const employees = new Hono();

// Apply auth middleware to all routes
employees.use("*", authMiddleware);

/**
 * Import employees from CSV data
 * POST /employees/import
 */
employees.post("/import", async (c) => {
  const body = await c.req.json();

  // Validate request body
  const importSchema = z.object({
    organizationId: z.string().min(1),
    employees: z.array(csvEmployeeRowSchema),
  });

  const result = importSchema.safeParse(body);
  if (!result.success) {
    const response: ApiResponse = {
      success: false,
      error: result.error.issues[0].message,
    };
    return c.json(response, 400);
  }

  const { organizationId, employees: employeeRows } = result.data;

  // Verify organization exists
  const org = await organizationRepository.findById(organizationId);
  if (!org) {
    const response: ApiResponse = {
      success: false,
      error: "Organization not found",
    };
    return c.json(response, 404);
  }

  let imported = 0;
  let updated = 0;

  for (const row of employeeRows) {
    // Calculate hourly rate in cents
    const hourlyRateCents = row.hourlyRate
      ? Math.round(row.hourlyRate * 100)
      : row.annualSalary
        ? Math.round((row.annualSalary * 100) / 2080)
        : 0;

    // Generate deterministic sourceId from email
    const emailHash = createHash("md5").update(row.email.toLowerCase()).digest("hex").slice(0, 12);
    const sourceId = `csv_${emailHash}`;

    // Check if employee exists by sourceId
    const existing = await employeeRepository.findBySourceId(
      organizationId,
      "csv" as EmployeeSourceType,
      sourceId
    );

    // Upsert employee
    await employeeRepository.upsertBySourceId(
      organizationId,
      "csv" as EmployeeSourceType,
      sourceId,
      {
        name: row.name,
        email: row.email.toLowerCase(),
        role: row.role || "",
        department: row.department || "",
        hourlyRateCents,
        employmentStatus: "fullTime",
      }
    );

    if (existing) {
      updated++;
    } else {
      imported++;
    }
  }

  const response: ApiResponse<{ imported: number; updated: number }> = {
    success: true,
    data: { imported, updated },
  };

  return c.json(response);
});

/**
 * Get all employees for an organization
 * GET /employees?organizationId=xxx
 */
employees.get("/", async (c) => {
  const organizationId = c.req.query("organizationId");

  if (!organizationId) {
    const response: ApiResponse = {
      success: false,
      error: "organizationId is required",
    };
    return c.json(response, 400);
  }

  const employeeList = await employeeRepository.findByOrganization(organizationId);

  const response: ApiResponse<Employee[]> = {
    success: true,
    data: employeeList,
  };

  return c.json(response);
});

export const employeeRoutes = employees;
