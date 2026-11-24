# 약속(藥束)

어려운 처방 약을 쉬운 말로 풀어주고, 복약을 챙겨주는 노약자용 AI 복약 도우미 앱 (프로토타입).

## 주요 기능
- 메인: 약 사진 인식 → 쉬운 말 복약 정보 / 가족 녹음 복약 알림 / 캘린더 + 진료 기록
- 사이드: 맞춤 의료기관 안내, 환자·의사 커뮤니티

## 기술 스택
Expo(React Native, TypeScript, Expo Router) · FastAPI · iPhone + Expo Go

## 실행 방법
- 서버: `cd server && pip install -r requirements.txt && uvicorn main:app --host 0.0.0.0 --port 8000 --reload`
- 앱: `cd app && npm install && npx expo start` → 아이폰 Expo Go로 QR 스캔
- `app/.env`에 `EXPO_PUBLIC_API_URL=http://<PC 내부 IP>:8000` (아이폰에서 접속 시)
- 와이파이가 막혀 있으면 `npx expo start --tunnel`
- 키는 `server/.env`에 (`server/.env.example` 참고). 없으면 mock 응답 사용

## 폴더 구조
`app/` Expo 앱 · `server/` FastAPI 서버

## 진행 상황
- [x] 1단계 뼈대 (홈 큰 버튼 3개, BigButton, `/health`, 앱→서버 호출)
- [x] 2단계 약 사진 인식 (mock 응답. OCR·e약은요·LLM 키 연결은 대기)
- [x] 3단계 복약 알림 (시간대 선택, 알림 탭 → 오늘 약, 먹었어요 기록, 중복 경고. 가족 녹음은 보류 — 커밋 9768482에 있음)
- [x] 4단계 캘린더 + 진료 기록 (의견서 사진 + mock 요약, 의사에게 보여주기. 의사 소견 녹음은 보류)
- [ ] 5단계 맞춤 의료기관 안내
- [ ] 6단계 커뮤니티
