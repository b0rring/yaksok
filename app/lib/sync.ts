import { Log, Plan, Visit } from './store';

// 약 기록 동기화 엔진. 환자 본인 기기와, 환자 화면으로 전환한 보호자가 같은 서버 사본을 읽고 고친다.
// 서버는 저장할 때마다 번호(rev)를 올린다. 내가 본 번호와 다르면(그새 남이 고쳤으면) 저장하지 않고 최신본을 돌려주고,
// 여기서 두 쪽을 합쳐(merge) 다시 저장한다.
export type Snap = { plans: Plan[]; logs: Log[]; visits: Visit[] };
export type Reply = { ok?: boolean; rev: number; data: Snap };

const byId = <T extends { id: string }>(mine: T[], theirs: T[]) => {
  const m = new Map(mine.map((x) => [x.id, x]));
  for (const x of theirs) m.set(x.id, x); // 같은 것을 둘 다 고쳤으면 서버(상대)쪽이 이긴다
  return [...m.values()];
};
// ponytail: 합칠 때 한쪽에서 지운 것이 되살아날 수 있다. 같은 시각에 양쪽이 고치는 일은 드물어서 감수한다.
export function merge(mine: Snap, theirs: Snap): Snap {
  const key = (l: Log) => `${l.date}|${l.slot}|${l.plan ?? ''}`;
  const logs = new Map([...mine.logs, ...theirs.logs].map((l) => [key(l), l]));
  return { plans: byId(mine.plans, theirs.plans), visits: byId(mine.visits, theirs.visits), logs: [...logs.values()] };
}
export const isEmpty = (s: Snap) => !s.plans.length && !s.logs.length && !s.visits.length;

type Opts = {
  get: () => Promise<Reply>;
  put: (snap: Snap, base: number) => Promise<Reply>;
  read: () => Promise<Snap>; // 이 쪽(기기 또는 메모리)에 있는 값
  write: (s: Snap) => Promise<void>;
  changed: () => void; // 남이 고친 내용이 들어와 화면을 다시 읽어야 할 때
  meta?: { load: () => Promise<{ rev: number | null; dirty: boolean }>; save: (m: { rev: number | null; dirty: boolean }) => Promise<void> };
};

export function createSync(o: Opts) {
  let rev: number | null = null;
  let dirty = false;
  let busy = false;
  let gen = 0; // 고친 횟수: 보내는 사이에 또 고쳤으면 "다 보냈다"고 하지 않는다
  let timer: ReturnType<typeof setTimeout> | undefined;
  const persist = () => o.meta?.save({ rev, dirty }).catch(() => {});

  const adopt = async (r: Reply, merged?: Snap) => {
    await o.write(merged ?? r.data);
    rev = r.rev;
    o.changed();
  };

  // 보낼 것이 있으면 보내고, 없으면 서버에 새 것이 있는지 본다
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      if (rev === null) {
        // 처음: 저장해 둔 번호가 없거나 못 보낸 변경이 있으면 서버 것과 합치고, 아니면 서버 것을 그대로 따른다
        const saved = (await o.meta?.load()) ?? { rev: null, dirty: false };
        const r = await o.get();
        if (saved.rev === null || saved.dirty) {
          const mine = await o.read();
          dirty = !isEmpty(mine);
          await adopt(r, merge(mine, r.data));
        } else if (saved.rev !== r.rev) await adopt(r);
        else rev = r.rev;
        persist();
      }
      if (dirty) {
        const sent = gen;
        let mine = await o.read();
        let r = await o.put(mine, rev!);
        if (!r.ok) {
          mine = merge(mine, r.data);
          await adopt(r, mine);
          r = await o.put(mine, r.rev);
        }
        if (r.ok) {
          rev = r.rev;
          if (sent === gen) dirty = false;
        }
        persist();
      } else {
        const r = await o.get();
        if (r.rev !== rev) {
          await adopt(r);
          persist();
        }
      }
    } catch {} // 서버에 못 닿아도 앱은 그대로 쓴다. 다음 기회에 다시 한다.
    busy = false;
  };

  return {
    tick,
    // 이 쪽에서 고쳤다: 잠깐 모아서 보낸다
    touch() {
      dirty = true;
      gen++;
      persist();
      clearTimeout(timer);
      timer = setTimeout(tick, 1500);
    },
    stop() {
      clearTimeout(timer);
    },
    // 방금 서버에서 받은 번호로 시작한다 (보호자가 환자 화면으로 전환할 때)
    pending: () => dirty,
    seed(r: number) {
      rev = r;
      dirty = false;
    },
    // 지금 바로 보낸다 (화면을 바꾸기 전에)
    async flush() {
      clearTimeout(timer);
      if (dirty) await tick();
    },
  };
}
