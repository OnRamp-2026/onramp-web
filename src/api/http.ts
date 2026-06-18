const BASE = import.meta.env.VITE_API_BASE_URL ?? "";
const DEV_AUTH_TOKEN = import.meta.env.VITE_DEV_AUTH_TOKEN ?? "";

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (DEV_AUTH_TOKEN && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${DEV_AUTH_TOKEN}`);
  }
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { detail?: string | { message?: string }; message?: string };
      detail = typeof body.detail === "string" ? body.detail : (body.detail?.message ?? body.message ?? detail);
    } catch {
      // Non-JSON upstream errors retain the HTTP status text.
    }
    throw new HttpError(detail, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function jsonInit(method: string, body?: unknown, headers?: HeadersInit): RequestInit {
  const merged = new Headers(headers);
  merged.set("Content-Type", "application/json");
  return {
    method,
    headers: merged,
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

export function get<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function post<T>(path: string, body?: unknown, headers?: HeadersInit): Promise<T> {
  return request<T>(path, jsonInit("POST", body, headers));
}

export function patch<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, jsonInit("PATCH", body));
}

export function del(path: string): Promise<void> {
  return request<void>(path, { method: "DELETE" });
}
