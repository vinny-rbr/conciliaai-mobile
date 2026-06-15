const BASE_URL = "https://conciliaai-api.onrender.com";

export function apiUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

export async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(apiUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  return res;
}
