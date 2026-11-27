import type { Snap } from './sync';
const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

// 식약처 e약은요 공식 설명 (서버가 찾지 못하면 없음). demo=true면 키가 없어서 쓴 시연용 예시.
export type Official = { name: string; company: string; efcy: string; use: string; warn: string; atpn: string; intrc: string; se: string; deposit: string; demo: boolean };
// by: 설명을 누가 썼는지 — ai(AI가 정리, 기본) / user(직접 적음) / mix(직접 적은 것에 AI가 보탬)
export type Drug = { name: string; dose?: string; effect: string; how: string; caution: string; avoid: string; official?: Official | null; by?: 'ai' | 'user' | 'mix' };
// condition: 무슨 병·증상 때문에 처방받았는지 (없으면 빈 글). guess: 봉투에 없어서 AI가 약을 보고 짐작한 것
export type ScanResult = { drugs: Drug[]; schedule: { slots: string[]; days: number }; source: string; condition?: string; guess?: boolean; hospital?: string; pharmacy?: string; date?: string };
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

// ── 계정·보호자 연동·커뮤니티 (서버 accounts.py) ──
export type Role = 'patient' | 'guardian' | 'doctor';
export type User = { id: number; login_id: string; name: string; role: Role; code: string };
export type Post = { id: number; title: string; body: string; created: string; name: string; role: Role; comments: number };
export type Comment = { id: number; body: string; created: string; name: string; role: Role };
export type Linked = { id: number; name: string };
export type Pending = { id: number; name: string; role: Role };
export type Links = { patients: Linked[]; guardians: Linked[]; incoming: Pending[]; outgoing: Pending[] };
export type SyncReply = { ok?: boolean; rev: number; updated?: string | null; name?: string; data: Snap };

// 서버가 돌려주는 한국어 오류 문구(detail)를 그대로 던진다 (화면에서 보여 줌)
export class ApiError extends Error {}
async function call<T>(method: string, path: string, body?: unknown, token?: string | null): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const r = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new ApiError(typeof data.detail === 'string' ? data.detail : '잠시 뒤에 다시 해 주세요');
    return data as T;
  } catch (e) {
    throw e instanceof ApiError ? e : new ApiError('서버에 연결하지 못했어요');
  } finally {
    clearTimeout(timer);
  }
}

export const apiSignup = (b: { login_id: string; name: string; role: Role; password: string; invite?: string }) =>
  call<{ token: string; user: User }>('POST', '/auth/signup', b);
export const apiLogin = (login_id: string, password: string) => call<{ token: string; user: User }>('POST', '/auth/login', { login_id, password });
export const apiMe = (t: string) => call<User>('GET', '/me', undefined, t);
export const apiLinks = (t: string) => call<Links>('GET', '/links', undefined, t);
export const apiAddLink = (t: string, code: string) => call<Pending & { status: 'pending' | 'active' }>('POST', '/links', { code }, t);
export const apiAcceptLink = (t: string, id: number) => call<{ ok: boolean }>('POST', `/links/${id}/accept`, undefined, t);
export const apiRemoveLink = (t: string, id: number) => call<{ ok: boolean }>('DELETE', `/links/${id}`, undefined, t);
export const apiNewCode = (t: string) => call<{ code: string }>('POST', '/me/code', undefined, t);
export const apiGetSync = (t: string) => call<SyncReply>('GET', '/sync', undefined, t);
export const apiPutSync = (t: string, snap: Snap, base: number) => call<SyncReply>('PUT', '/sync', { ...snap, base }, t);
export const apiGetPatient = (t: string, id: number) => call<SyncReply>('GET', `/patients/${id}/data`, undefined, t);
export const apiPutPatient = (t: string, id: number, snap: Snap, base: number) => call<SyncReply>('PUT', `/patients/${id}/data`, { ...snap, base }, t);
export const apiPosts = () => call<Post[]>('GET', '/posts');
export const apiPost = (id: number) => call<Omit<Post, 'comments'> & { comments: Comment[] }>('GET', `/posts/${id}`);
export const apiAddPost = (t: string, title: string, body: string) => call<{ id: number }>('POST', '/posts', { title, body }, t);
export const apiAddComment = (t: string, id: number, body: string) => call<{ ok: boolean }>('POST', `/posts/${id}/comments`, { body }, t);

// 커뮤니티의 의사 답변 아래에 항상 보여 주는 안내
export const DISCLAIMER = '일반적인 건강 정보이며 진료를 대신하지 않아요.';
