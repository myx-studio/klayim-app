/**
 * OAuth state passed through the BambooHR authorization flow
 */
export interface BambooHROAuthState {
  organizationId: string;
  redirectUrl: string;
  companyDomain: string; // User's BambooHR subdomain (e.g., "acme" for acme.bamboohr.com)
}

/**
 * Result from exchanging authorization code for tokens
 */
export interface BambooHRExchangeResult {
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
  };
  companyDomain: string; // Preserved from state for API calls
}

/**
 * Result from refreshing a token
 */
export interface BambooHRRefreshResult {
  accessToken: string;
  expiresInMs: number;
  refreshToken?: string;
}

/**
 * BambooHR employee from the directory API
 * Internal interface mapping BambooHR API response
 */
export interface BambooHREmployee {
  id: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  jobTitle: string;
  department: string;
  payRate: string; // Numeric string like "75000" or "35.50"
  payType: "Hourly" | "Salary";
}

/**
 * BambooHR API response for employee directory
 */
interface BambooHRDirectoryResponse {
  employees: Array<{
    id: string;
    firstName?: string;
    lastName?: string;
    workEmail?: string;
    jobTitle?: string;
    department?: string;
    payRate?: string;
    payType?: string;
  }>;
}

/**
 * BambooHR OAuth token response
 */
interface BambooHRTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // Seconds
  token_type: string;
}

/**
 * BambooHR Service
 *
 * Handles OAuth flow and API interactions with BambooHR.
 * BambooHR uses direct OAuth 2.0 and grants all permissions without scopes.
 */
class BambooHRService {
  private readonly authorizationUrl = "https://api.bamboohr.com/oauth/authorize";
  private readonly tokenUrl = "https://api.bamboohr.com/oauth/token";

  /**
   * Generate authorization URL for OAuth consent
   *
   * @param state - JSON stringified state object with organizationId, redirectUrl, and companyDomain
   * @returns Authorization URL to redirect user to
   */
  getAuthUrl(state: string): string {
    const clientId = process.env.BAMBOOHR_CLIENT_ID;
    const apiUrl = process.env.API_URL || "http://localhost:5001";

    if (!clientId) {
      throw new Error("Missing BAMBOOHR_CLIENT_ID environment variable");
    }

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: `${apiUrl}/oauth/bamboohr/callback`,
      state,
    });

    return `${this.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   *
   * @param code - Authorization code from OAuth callback
   * @param companyDomain - Company subdomain from state
   * @returns Tokens and company domain
   */
  async exchangeCode(code: string, companyDomain: string): Promise<BambooHRExchangeResult> {
    const clientId = process.env.BAMBOOHR_CLIENT_ID;
    const clientSecret = process.env.BAMBOOHR_CLIENT_SECRET;
    const apiUrl = process.env.API_URL || "http://localhost:5001";

    if (!clientId || !clientSecret) {
      throw new Error("Missing BAMBOOHR_CLIENT_ID or BAMBOOHR_CLIENT_SECRET environment variables");
    }

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${apiUrl}/oauth/bamboohr/callback`,
    });

    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`BambooHR token exchange failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as BambooHRTokenResponse;

    if (!data.access_token) {
      throw new Error("No access token received from BambooHR");
    }

    if (!data.refresh_token) {
      throw new Error("No refresh token received from BambooHR");
    }

    // Calculate expiry
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    return {
      tokens: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt,
      },
      companyDomain,
    };
  }

  /**
   * Refresh an access token using a refresh token
   *
   * @param refreshToken - The refresh token to use
   * @returns New access token and expiry information
   */
  async refreshToken(refreshToken: string): Promise<BambooHRRefreshResult> {
    const clientId = process.env.BAMBOOHR_CLIENT_ID;
    const clientSecret = process.env.BAMBOOHR_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Missing BAMBOOHR_CLIENT_ID or BAMBOOHR_CLIENT_SECRET environment variables");
    }

    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`BambooHR token refresh failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as BambooHRTokenResponse;

    if (!data.access_token) {
      throw new Error("Failed to refresh BambooHR access token");
    }

    const expiresInMs = data.expires_in * 1000;

    return {
      accessToken: data.access_token,
      expiresInMs,
      refreshToken: data.refresh_token || undefined,
    };
  }

  /**
   * Fetch employee directory from BambooHR
   *
   * @param companyDomain - Company subdomain (e.g., "acme" for acme.bamboohr.com)
   * @param accessToken - Current access token
   * @returns Array of BambooHR employees
   */
  async fetchEmployees(companyDomain: string, accessToken: string): Promise<BambooHREmployee[]> {
    const url = `https://api.bamboohr.com/api/gateway.php/${companyDomain}/v1/employees/directory`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`BambooHR employee fetch failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as BambooHRDirectoryResponse;

    // Map API response to typed BambooHREmployee array
    return (data.employees || []).map((emp) => ({
      id: emp.id || "",
      firstName: emp.firstName || "",
      lastName: emp.lastName || "",
      workEmail: emp.workEmail || "",
      jobTitle: emp.jobTitle || "",
      department: emp.department || "",
      payRate: emp.payRate || "0",
      payType: (emp.payType === "Hourly" ? "Hourly" : "Salary") as "Hourly" | "Salary",
    }));
  }
}

export const bambooHRService = new BambooHRService();
