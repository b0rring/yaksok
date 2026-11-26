const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

// 식약처 e약은요 공식 설명 (서버가 찾지 못하면 없음). demo=true면 키가 없어서 쓴 시연용 예시.
export type Official = { name: string; company: string; efcy: string; use: string; warn: string; atpn: string; intrc: string; se: string; deposit: string; demo: boolean };
// by: 설명을 누가 썼는지 — ai(AI가 정리, 기본) / user(직접 적음) / mix(직접 적은 것에 AI가 보탬)
export type Drug = { name: string; effect: string; how: string; caution: string; avoid: string; official?: Official | null; by?: 'ai' | 'user' | 'mix' };
// condition: 무슨 병·증상 때문에 처방받았는지 (없으면 빈 글). guess: 봉투에 없어서 AI가 약을 보고 짐작한 것
export type ScanResult = { drugs: Drug[]; schedule: { slots: string[]; days: number }; source: string; condition?: string; guess?: boolean };
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

// sources가 있으면 식약처 공식 정보로 한 답, ai=true면 공식 정보 없이 AI가 일반 지식으로 한 답
export type ChatAnswer = { answer: string; sources: string[]; demo: boolean; ai?: boolean };

// 약 질문: 서버가 식약처 공식 정보를 찾아 그 내용으로 쉬운 말로 답한다 (없으면 AI 답변이라고 밝힌다). drugs = 지금 등록된 약 이름
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

// 사용자가 적은 약 정보의 빈 칸을 AI가 쉬운 말로 채운다 (이미 적은 칸은 그대로). 식약처 공식 정보도 함께 찾는다.
export async function organizeDrugs(condition: string, drugs: Pick<Drug, 'name' | 'effect' | 'how' | 'caution' | 'avoid'>[]): Promise<{ drugs: Drug[] }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 75_000);
  try {
    const r = await fetch(`${BASE}/organize`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ condition, drugs }),
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

// 카카오 지도 JS 키 (서버 .env의 KAKAO_JS_KEY). 없으면 빈 글.
export async function getKakaoKey(): Promise<string> {
  try {
    const r = await fetch(`${BASE}/config`);
    return r.ok ? ((await r.json()).kakaoKey as string) : '';
  } catch {
    return '';
  }
}
