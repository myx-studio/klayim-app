const API_URL = process.env.API_URL;

type FetchOptions = RequestInit & {
  params?: Record<string, string>;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: unknown
  ) {
    super("API Error: " + status + " " + statusText);
    this.name = "ApiError";
  }
}

export async function api<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  if (!API_URL) {
    throw new Error("API_URL environment variable is not set");
  }

  const { params, ...fetchOptions } = options;

  let url = API_URL + endpoint;

  if (params) {
    const searchParams = new URLSearchParams(params);
    url += "?" + searchParams.toString();
  }

  const res = await fetch(url, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...fetchOptions.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(res.status, res.statusText, data);
  }

  return data;
}
