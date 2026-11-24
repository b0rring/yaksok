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

export async function scanImage(uri: string): Promise<ScanResult> {
  const form = new FormData();
  form.append('file', await (await fetch(uri)).blob(), 'photo.jpg');
  const r = await fetch(`${BASE}/scan`, { method: 'POST', body: form });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}
