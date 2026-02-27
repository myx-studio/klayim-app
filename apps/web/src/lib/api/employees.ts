import { fetcher } from "@/lib/fetcher";
import type { ApiResponse, Employee, CsvEmployeeRow } from "@klayim/shared";

/**
 * Import employees from CSV data
 */
export async function importEmployees(
  organizationId: string,
  employees: CsvEmployeeRow[]
): Promise<{ imported: number; updated: number }> {
  const response = await fetcher<ApiResponse<{ imported: number; updated: number }>>(
    "/employees/import",
    {
      method: "POST",
      body: JSON.stringify({ organizationId, employees }),
    }
  );
  if (!response.success || !response.data) {
    throw new Error(response.error || "Failed to import employees");
  }
  return response.data;
}

/**
 * Get all employees for an organization
 */
export async function getEmployees(organizationId: string): Promise<Employee[]> {
  const response = await fetcher<ApiResponse<Employee[]>>(
    "/employees",
    {
      params: { organizationId },
    }
  );
  if (!response.success) {
    throw new Error(response.error || "Failed to get employees");
  }
  return response.data || [];
}
