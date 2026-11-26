import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { ScanResult, scanImage, scanVisit, sendVoice } from './api';
import { addVisit } from './store';

// 백그라운드 작업: AI가 사진·녹음을 정리하는 동안 화면을 붙잡지 않는다.
// 작업을 시작하면 바로 다른 화면으로 가고, 위쪽 알림 카드(JobBanner)가 "정리 중 → 끝남"을 알려 준다.
export type Job = {
  id: string;
  kind: 'scan' | 'visit'; // 약 사진 / 진료 기록(녹음 또는 의견서 사진)
  uri: string;
  voice?: boolean;
  status: 'running' | 'done' | 'error';
  scan?: ScanResult;
  visitId?: string;
  code?: string; // 실패 이유 (422 = 약/말씀을 못 알아봄)
};

type Ctx = {
  jobs: Job[];
  version: number; // 진료 기록이 새로 저장될 때마다 올라가는 번호 (목록 화면이 다시 불러오는 신호)
  startScan: (uri: string) => void;
  startVisit: (uri: string, voice: boolean) => void;
  retry: (id: string) => void;
  dismiss: (id: string) => void;
};

const JobsContext = createContext<Ctx | null>(null);
export const useJobs = () => useContext(JobsContext)!;

export function JobsProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [version, setVersion] = useState(0);
  const ref = useRef<Job[]>([]);
  ref.current = jobs;

  const patch = useCallback((id: string, p: Partial<Job>) => setJobs((all) => all.map((j) => (j.id === id ? { ...j, ...p } : j))), []);

  const run = useCallback(
    (j: Job) => {
      patch(j.id, { status: 'running', code: undefined });
      const work =
        j.kind === 'scan'
          ? scanImage(j.uri).then((scan) => ({ scan }))
          : (j.voice ? sendVoice(j.uri) : scanVisit(j.uri)).then(async (v) => ({ visitId: (await addVisit(v)).id }));
      work
        .then((r) => {
          patch(j.id, { status: 'done', ...r });
          if (j.kind === 'visit') setVersion((n) => n + 1);
        })
        .catch((e) => patch(j.id, { status: 'error', code: e instanceof Error ? e.message : '' }));
    },
    [patch],
  );

  const add = useCallback(
    (job: Omit<Job, 'id' | 'status'>) => {
      const j: Job = { ...job, id: `${Date.now()}${Math.random().toString(36).slice(2, 6)}`, status: 'running' };
      setJobs((all) => [...all, j]);
      run(j);
    },
    [run],
  );

  const value: Ctx = {
    jobs,
    version,
    startScan: (uri) => add({ kind: 'scan', uri }),
    startVisit: (uri, voice) => add({ kind: 'visit', uri, voice }),
    retry: (id) => {
      const j = ref.current.find((x) => x.id === id);
      if (j) run(j);
    },
    dismiss: (id) => setJobs((all) => all.filter((j) => j.id !== id)),
  };
  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}
