export type ApiError = Error & { code: string; field?: string; status: number };
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080";
export const API_MODE = process.env.NEXT_PUBLIC_DATA_MODE === "api";

async function request<T>(method: string, path: string, role: string, body?: unknown, base = API_URL): Promise<T> {
  const response = await fetch(`${base}/api/v1${path}`, {
    method,
    headers: { "X-Demo-Role": role, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store",
  });
  const value = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = value?.error;
    const error = new Error(detail?.message || `HTTP ${response.status}`) as ApiError;
    error.code = detail?.code || "HTTP_ERROR";
    error.field = detail?.field;
    error.status = response.status;
    throw error;
  }
  return value as T;
}
export const apiGet = <T>(path: string, role: string, base?: string) => request<T>("GET", path, role, undefined, base);
export const apiSend = <T>(method: "POST" | "PUT", path: string, body: unknown, role: string, base?: string) => request<T>(method, path, role, body, base);
