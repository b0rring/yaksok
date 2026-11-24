const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export type Drug = { name: string; effect: string; how: string; caution: string; avoid: string };
export type ScanResult = { drugs: Drug[]; schedule: { slots: string[]; days: number }; source: string };
export type VisitSummary = { hospital: string; reason: string; summary: string; transcript?: string };

export async function getHealth(): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/health`);
    return r.ok;
  } catch {
    return false;
  }
}

async function upload<T>(path: string, uri: string, name: string): Promise<T> {
  const form = new FormData();
  form.append('file', await (await fetch(uri)).blob(), name);
  const r = await fetch(`${BASE}${path}`, { method: 'POST', body: form });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

export const scanImage = (uri: string) => upload<ScanResult>('/scan', uri, 'photo.jpg');
export const scanVisit = (uri: string) => upload<VisitSummary>('/visit', uri, 'photo.jpg');
export const sendVoice = (uri: string) => upload<VisitSummary>('/visit', uri, 'voice.m4a');
