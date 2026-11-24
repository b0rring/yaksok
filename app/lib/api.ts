const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export async function getHealth(): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/health`);
    return r.ok;
  } catch {
    return false;
  }
}
