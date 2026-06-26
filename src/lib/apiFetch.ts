import { emitTokenExpired } from "./authEvents";

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401) {
    emitTokenExpired();
  }
  return res;
}
