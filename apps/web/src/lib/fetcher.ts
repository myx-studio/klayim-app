export class FetchError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: unknown
  ) {
    super(`Fetch Error: ${status} ${statusText}`);
    this.name = "FetchError";
  }
}

type FetchOptions = RequestInit & {
  params?: Record<string, string>;
};

export async function fetcher<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { params, ...fetchOptions } = options;

  let url = `/api/v1${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
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
    throw new FetchError(res.status, res.statusText, data);
  }

  return data;
}
