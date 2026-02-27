import Finch from "@tryfinch/finch-api";

/**
 * Finch Connect session for embedded authorization
 */
export interface FinchConnectSession {
  sessionId: string;
  connectUrl: string;
}

/**
 * Result from exchanging authorization code for tokens
 */
export interface FinchExchangeResult {
  accessToken: string;
  providerId: string; // e.g., 'gusto', 'rippling'
  companyId: string;
  companyName: string;
}

/**
 * Normalized employee data from Finch directory
 */
export interface FinchEmployee {
  id: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  jobTitle: string;
  department: string;
  income: { amount: number; currency: string; unit: "yearly" | "hourly" } | null;
  isActive: boolean;
}

/**
 * Finch Service
 *
 * Handles Finch unified API integration for HRIS providers (Rippling, Gusto, etc.).
 * Uses Finch Connect for embedded authorization flow.
 *
 * Finch tokens are long-lived and don't expire until disconnected,
 * so there's no token refresh flow needed.
 */
class FinchService {
  /**
   * Get Finch client ID from environment
   */
  private getClientId(): string {
    const clientId = process.env.FINCH_CLIENT_ID;
    if (!clientId) {
      throw new Error("Missing FINCH_CLIENT_ID environment variable");
    }
    return clientId;
  }

  /**
   * Get Finch client secret from environment
   */
  private getClientSecret(): string {
    const clientSecret = process.env.FINCH_CLIENT_SECRET;
    if (!clientSecret) {
      throw new Error("Missing FINCH_CLIENT_SECRET environment variable");
    }
    return clientSecret;
  }

  /**
   * Check if sandbox mode is enabled
   */
  private isSandbox(): boolean {
    return process.env.FINCH_SANDBOX === "true";
  }

  /**
   * Create a Finch Connect session for embedded authorization
   *
   * Frontend uses this session ID with @tryfinch/react-connect to show
   * the embedded auth modal.
   *
   * @param organizationId - Organization connecting the HRIS
   * @param organizationName - Display name for consent screen
   * @returns Connect session with sessionId and connectUrl
   */
  async createConnectSession(
    organizationId: string,
    organizationName: string
  ): Promise<FinchConnectSession> {
    const finch = new Finch({
      clientID: this.getClientId(),
      clientSecret: this.getClientSecret(),
    });

    const session = await finch.connect.sessions.new({
      customer_id: organizationId,
      customer_name: organizationName,
      products: ["company", "directory", "individual", "employment"],
      sandbox: this.isSandbox() ? "finch" : undefined,
    });

    return {
      sessionId: session.session_id,
      connectUrl: session.connect_url,
    };
  }

  /**
   * Exchange authorization code for access token
   *
   * Called after Finch Connect modal completes successfully.
   * Fetches company info to get provider ID and company details.
   *
   * @param code - Authorization code from Finch Connect callback
   * @returns Access token and company information
   */
  async exchangeCode(code: string): Promise<FinchExchangeResult> {
    // Exchange code for access token via Finch token endpoint
    const tokenResponse = await fetch("https://api.tryfinch.com/auth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.getClientId(),
        client_secret: this.getClientSecret(),
        code,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Finch token exchange failed: ${error}`);
    }

    const tokenData = (await tokenResponse.json()) as { access_token?: string };
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error("No access token received from Finch");
    }

    // Create authenticated client to fetch company info
    const finch = new Finch({
      accessToken,
    });

    // Fetch company info to get provider ID and company details
    const company = await finch.hris.company.retrieve();

    return {
      accessToken,
      providerId: company.id || "unknown",
      companyId: company.id || "",
      companyName: company.legal_name || company.id || "Unknown Company",
    };
  }

  /**
   * Type guard to check if response body is valid (not an error)
   */
  private isValidBody<T>(body: T | { code?: number; message?: string } | undefined): body is T {
    if (!body) return false;
    if (typeof body === "object" && "code" in body && typeof body.code === "number") {
      return false; // This is a BatchError
    }
    return true;
  }

  /**
   * Fetch all employees from Finch directory
   *
   * Uses Finch's unified data model to get employee details including:
   * - Name and work email
   * - Job title and department
   * - Income/salary information
   *
   * @param accessToken - Valid Finch access token
   * @returns Array of normalized employee data
   */
  async fetchEmployees(accessToken: string): Promise<FinchEmployee[]> {
    const finch = new Finch({
      accessToken,
    });

    const employees: FinchEmployee[] = [];

    // Use directory list with auto-pagination
    for await (const individual of finch.hris.directory.list()) {
      // Fetch detailed employment info
      const employmentResp = await finch.hris.employments.retrieveMany({
        requests: [{ individual_id: individual.id }],
      });
      const employmentBody = employmentResp.responses?.[0]?.body;

      // Fetch individual details
      const individualResp = await finch.hris.individuals.retrieveMany({
        requests: [{ individual_id: individual.id }],
      });
      const detailsBody = individualResp.responses?.[0]?.body;

      // Extract data with type guards
      let workEmail = "";
      let firstName = individual.first_name || "";
      let lastName = individual.last_name || "";
      let jobTitle = "";
      let department = "";
      let income: FinchEmployee["income"] = null;

      // Handle individual details (may be error or valid data)
      if (this.isValidBody(detailsBody)) {
        const details = detailsBody as {
          first_name?: string | null;
          last_name?: string | null;
          emails?: Array<{ type?: string | null; data?: string | null } | null> | null;
        };
        firstName = details.first_name || firstName;
        lastName = details.last_name || lastName;
        workEmail = details.emails?.find((e) => e?.type === "work")?.data || "";
      }

      // Handle employment data (may be error or valid data)
      if (this.isValidBody(employmentBody)) {
        const employment = employmentBody as {
          title?: string | null;
          department?: { name?: string | null } | null;
          income?: { amount?: number | null; currency?: string | null; unit?: string | null } | null;
        };
        jobTitle = employment.title || "";
        department = employment.department?.name || "";

        if (employment.income?.amount) {
          const unit = employment.income.unit === "hourly" ? "hourly" : "yearly";
          income = {
            amount: employment.income.amount,
            currency: employment.income.currency || "USD",
            unit,
          };
        }
      }

      employees.push({
        id: individual.id || "",
        firstName,
        lastName,
        workEmail,
        jobTitle,
        department,
        income,
        isActive: individual.is_active ?? true,
      });
    }

    return employees;
  }
}

export const finchService = new FinchService();
