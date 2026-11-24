const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export type Drug = { name: string; effect: string; how: string; caution: string; avoid: string };
export type ScanResult = { drugs: Drug[]; source: string };

export async function getHealth(): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/health`);
    return r.ok;
  } catch {
    return false;
  }
}

async function upload<T>(path: string, uri: string): Promise<T> {
  const form = new FormData();
  form.append('file', await (await fetch(uri)).blob(), 'photo.jpg');
  const r = await fetch(`${BASE}${path}`, { method: 'POST', body: form });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

export type VisitSummary = { hospital: string; reason: string; summary: string };

export const scanImage = (uri: string) => upload<ScanResult>('/scan', uri);
export const scanVisit = (uri: string) => upload<VisitSummary>('/visit', uri);
