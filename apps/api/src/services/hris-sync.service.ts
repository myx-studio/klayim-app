import { bambooHRService, type BambooHREmployee } from "./bamboohr.service.js";
import { finchService, type FinchEmployee } from "./finch.service.js";
import { employeeRepository } from "@/repositories/employee.repository.js";
import { integrationRepository } from "@/repositories/integration.repository.js";
import { tokenRefreshService } from "./token-refresh.service.js";

/**
 * Result from employee sync operation
 */
export interface HRISSyncResult {
  imported: number; // New employees created
  updated: number; // Existing employees updated
}

/**
 * Calculate hourly rate in cents from pay information
 *
 * @param payRate - Numeric pay rate (as number)
 * @param payType - Payment type: Hourly, Salary, yearly, or hourly
 * @returns Hourly rate in cents (integer)
 */
function calculateHourlyRateCents(
  payRate: number,
  payType: "Hourly" | "Salary" | "yearly" | "hourly"
): number {
  const isHourly = payType === "Hourly" || payType === "hourly";
  if (isHourly) {
    // Pay rate is already hourly, convert to cents
    return Math.round(payRate * 100);
  }
  // Annual salary to hourly: 2080 hours/year (40 hrs/week * 52 weeks)
  return Math.round((payRate * 100) / 2080);
}

/**
 * HRIS Sync Service
 *
 * Orchestrates employee import from HRIS providers (BambooHR, Finch).
 * Handles data transformation and upsert to Firestore.
 */
class HRISSyncService {
  /**
   * Sync employees from BambooHR to Firestore
   *
   * @param organizationId - Organization to sync employees for
   * @param companyDomain - BambooHR company subdomain
   * @param accessToken - Valid BambooHR access token
   * @returns Sync result with imported/updated counts
   */
  async syncFromBambooHR(
    organizationId: string,
    companyDomain: string,
    accessToken: string
  ): Promise<HRISSyncResult> {
    // Fetch employees from BambooHR
    const bambooEmployees = await bambooHRService.fetchEmployees(companyDomain, accessToken);

    let imported = 0;
    let updated = 0;

    // Process each employee
    for (const employee of bambooEmployees) {
      const result = await this.upsertBambooHREmployee(organizationId, employee);
      if (result === "created") {
        imported++;
      } else {
        updated++;
      }
    }

    return { imported, updated };
  }

  /**
   * Sync employees from Finch to Firestore
   *
   * @param organizationId - Organization to sync employees for
   * @param accessToken - Valid Finch access token
   * @returns Sync result with imported/updated counts
   */
  async syncFromFinch(
    organizationId: string,
    accessToken: string
  ): Promise<HRISSyncResult> {
    // Fetch employees from Finch
    const finchEmployees = await finchService.fetchEmployees(accessToken);

    let imported = 0;
    let updated = 0;

    // Process each employee
    for (const employee of finchEmployees) {
      // Skip inactive employees
      if (!employee.isActive) {
        continue;
      }

      const result = await this.upsertFinchEmployee(organizationId, employee);
      if (result === "created") {
        imported++;
      } else {
        updated++;
      }
    }

    return { imported, updated };
  }

  /**
   * Transform and upsert a Finch employee to Firestore
   *
   * @param organizationId - Organization ID
   * @param employee - Finch employee data
   * @returns "created" or "updated" depending on operation
   */
  private async upsertFinchEmployee(
    organizationId: string,
    employee: FinchEmployee
  ): Promise<"created" | "updated"> {
    // Skip employees without email (can't match to meeting attendees)
    if (!employee.workEmail) {
      console.log(`[HRISSync] Skipping Finch employee ${employee.id} - no email`);
      return "updated"; // Count as processed but not imported
    }

    // Calculate hourly rate from income
    let hourlyRateCents = 0;
    if (employee.income) {
      if (employee.income.unit === "hourly") {
        hourlyRateCents = Math.round(employee.income.amount * 100);
      } else {
        // Annual salary to hourly: 2080 hours/year (40 hrs/week * 52 weeks)
        hourlyRateCents = Math.round((employee.income.amount * 100) / 2080);
      }
    }

    // Check if employee already exists by source ID
    const existing = await employeeRepository.findBySourceId(
      organizationId,
      "finch",
      employee.id
    );

    // Prepare employee data
    const employeeData = {
      email: employee.workEmail.toLowerCase(),
      name: `${employee.firstName} ${employee.lastName}`.trim() || "Unknown",
      role: employee.jobTitle || "",
      department: employee.department || "",
      hourlyRateCents,
      employmentStatus: "fullTime" as const,
    };

    // Upsert employee
    await employeeRepository.upsertBySourceId(
      organizationId,
      "finch",
      employee.id,
      employeeData
    );

    return existing ? "updated" : "created";
  }

  /**
   * Transform and upsert a BambooHR employee to Firestore
   *
   * @param organizationId - Organization ID
   * @param employee - BambooHR employee data
   * @returns "created" or "updated" depending on operation
   */
  private async upsertBambooHREmployee(
    organizationId: string,
    employee: BambooHREmployee
  ): Promise<"created" | "updated"> {
    // Skip employees without email (can't match to meeting attendees)
    if (!employee.workEmail) {
      console.log(`[HRISSync] Skipping employee ${employee.id} - no email`);
      return "updated"; // Count as processed but not imported
    }

    // Parse pay rate safely
    let hourlyRateCents = 0;
    const payRateNum = parseFloat(employee.payRate);
    if (!isNaN(payRateNum) && payRateNum > 0) {
      hourlyRateCents = calculateHourlyRateCents(payRateNum, employee.payType);
    }

    // Check if employee already exists by source ID
    const existing = await employeeRepository.findBySourceId(
      organizationId,
      "bamboohr",
      employee.id
    );

    // Prepare employee data
    const employeeData = {
      email: employee.workEmail.toLowerCase(),
      name: `${employee.firstName} ${employee.lastName}`.trim() || "Unknown",
      role: employee.jobTitle || "",
      department: employee.department || "",
      hourlyRateCents,
      employmentStatus: "fullTime" as const, // BambooHR directory only returns active employees
    };

    // Upsert employee
    await employeeRepository.upsertBySourceId(
      organizationId,
      "bamboohr",
      employee.id,
      employeeData
    );

    return existing ? "updated" : "created";
  }

  /**
   * Trigger initial sync after OAuth connection
   * Runs asynchronously to avoid blocking OAuth redirect
   *
   * @param integrationId - ID of the newly connected integration
   */
  async triggerInitialSync(integrationId: string): Promise<void> {
    try {
      // Fetch integration
      const integration = await integrationRepository.findById(integrationId);
      if (!integration) {
        console.error(`[HRISSync] Integration ${integrationId} not found`);
        return;
      }

      // Get valid access token (will refresh if needed, except for Finch which doesn't expire)
      const accessToken = await tokenRefreshService.getValidToken(integrationId);

      let result: HRISSyncResult;

      switch (integration.provider) {
        case "bamboohr": {
          // Get company domain from accountId (stored during OAuth)
          const companyDomain = integration.accountId;
          if (!companyDomain) {
            console.error(`[HRISSync] No company domain for integration ${integrationId}`);
            return;
          }
          result = await this.syncFromBambooHR(
            integration.organizationId,
            companyDomain,
            accessToken
          );
          console.log(
            `[HRISSync] BambooHR sync complete for org ${integration.organizationId}: ` +
              `${result.imported} imported, ${result.updated} updated`
          );
          break;
        }

        case "finch": {
          result = await this.syncFromFinch(integration.organizationId, accessToken);
          console.log(
            `[HRISSync] Finch sync complete for org ${integration.organizationId}: ` +
              `${result.imported} imported, ${result.updated} updated`
          );
          break;
        }

        default:
          console.error(`[HRISSync] Unsupported provider: ${integration.provider}`);
          return;
      }
    } catch (error) {
      console.error(`[HRISSync] Initial sync failed for integration ${integrationId}:`, error);
      // Don't throw - this runs async and shouldn't block the OAuth flow
    }
  }

  /**
   * Manual sync trigger for an integration
   * Can be called from API endpoints or scheduled jobs
   *
   * @param integrationId - ID of the integration to sync
   * @returns Sync result
   */
  async syncIntegration(integrationId: string): Promise<HRISSyncResult> {
    const integration = await integrationRepository.findById(integrationId);
    if (!integration) {
      throw new Error("Integration not found");
    }

    if (integration.status !== "connected") {
      throw new Error("Integration is not connected");
    }

    // Get valid access token
    const accessToken = await tokenRefreshService.getValidToken(integrationId);

    switch (integration.provider) {
      case "bamboohr": {
        const companyDomain = integration.accountId;
        if (!companyDomain) {
          throw new Error("No company domain for BambooHR integration");
        }
        return this.syncFromBambooHR(
          integration.organizationId,
          companyDomain,
          accessToken
        );
      }

      case "finch": {
        return this.syncFromFinch(integration.organizationId, accessToken);
      }

      default:
        throw new Error(`Unsupported HRIS provider: ${integration.provider}`);
    }
  }
}

export const hrisSyncService = new HRISSyncService();
