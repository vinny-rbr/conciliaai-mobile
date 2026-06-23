const BASE_URL = "https://conciliaai-api.onrender.com";

export function apiUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

export async function apiFetch(path: string, options?: RequestInit, timeoutMs = 15_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(apiUrl(path), {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers ?? {}),
      },
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}
