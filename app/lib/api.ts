const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

// 식약처 e약은요 공식 설명 (서버가 찾지 못하면 없음). demo=true면 키가 없어서 쓴 시연용 예시.
export type Official = { name: string; company: string; efcy: string; use: string; warn: string; atpn: string; intrc: string; se: string; deposit: string; demo: boolean };
export type Drug = { name: string; effect: string; how: string; caution: string; avoid: string; official?: Official | null };
export type ScanResult = { drugs: Drug[]; schedule: { slots: string[]; days: number }; source: string };
export type VisitSummary = { hospital: string; reason: string; summary: string; transcript?: string };

export async function getHealth(): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5_000); // 서버가 응답이 없을 때 오래 기다리지 않는다
  try {
    const r = await fetch(`${BASE}/health`, { signal: ctrl.signal });
    return r.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function upload<T>(path: string, uri: string, name: string): Promise<T> {
  const form = new FormData();
  form.append('file', await (await fetch(uri)).blob(), name);
  // 서버(AI)가 멈춰도 화면이 영원히 "읽고 있어요"에 갇히지 않도록 시간 제한 (서버 쪽 제한 30초 x 2회 + 여유)
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 75_000);
  try {
    const r = await fetch(`${BASE}${path}`, { method: 'POST', body: form, signal: ctrl.signal });
    if (!r.ok) throw new Error(String(r.status));
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

export type ChatAnswer = { answer: string; sources: string[]; demo: boolean };

// 약 질문: 서버가 식약처 공식 정보를 찾아 그 내용만으로 쉬운 말로 답한다. drugs = 지금 등록된 약 이름
export async function askChat(question: string, drugs: string[]): Promise<ChatAnswer> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 75_000);
  try {
    const r = await fetch(`${BASE}/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question, drugs }),
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(String(r.status));
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

export const scanImage = (uri: string) => upload<ScanResult>('/scan', uri, 'photo.jpg');
export const scanVisit = (uri: string) => upload<VisitSummary>('/visit', uri, 'photo.jpg');
export const sendVoice = (uri: string) => upload<VisitSummary>('/visit', uri, 'voice.m4a');
