# 🎓 세명컴퓨터고등학교 학생 포트폴리오 시스템

> GitHub OAuth 로그인 · MongoDB Atlas · Cloudinary · Render 배포  
> 멀티유저 포트폴리오 웹 서비스 — 코딩 없이 버튼만으로 편집 가능

---

## ✨ 주요 기능

| 기능 | 설명 |
|------|------|
| GitHub 로그인 | GitHub 계정 하나로 즉시 가입 + 포트폴리오 자동 생성 |
| 프로필 편집 | 이름, 소개, 태그, 학교, 학년, 목표 등 |
| 배너 사진 변경 | 히어로 섹션 배경 이미지 업로드 |
| 프로필 사진 | 업로드 시 홈 화면 카드에도 자동 반영 |
| 작품 업로드 | 이미지 / 유튜브(Shorts 포함) / PDF |
| 서류 추가 | 자기소개서, 증명서 (PDF/PPT/이미지) |
| 프로젝트 추가 | ZIP/ALZ/RAR 파일 업로드 또는 GitHub 링크 |
| 연락처 | 이메일, 전화번호, GitHub, YouTube, Instagram, Notion |
| 학년 필터 | 홈 화면에서 1학년/2학년/3학년 필터링 |
| 디자인 커스터마이저 | 테마/색상/폰트/레이아웃/효과 실시간 변경 |
| 커스텀 폰트 | Google Fonts URL 입력으로 직접 추가 |
| HTML 다운로드 | 포트폴리오를 HTML 파일로 저장 후 공유 |
| 관리자 기능 | 학생 계정 삭제 (ADMIN_USERS 환경변수로 설정) |

---

## 📁 파일 구조

```
Portfolio-System/
├── server/
│   ├── index.js          ← 서버 시작점 + 보안 헤더 + Rate Limiting
│   ├── db.js             ← MongoDB/JSON 하이브리드 DB
│   ├── mongoose.js       ← MongoDB 스키마 (전체 필드 포함)
│   ├── passport.js       ← GitHub OAuth 로그인
│   ├── cloudinary.js     ← Cloudinary 파일 업로드
│   ├── sanitize.js       ← XSS 방어 입력값 정화
│   └── routes/
│       ├── auth.js       ← 로그인/로그아웃
│       ├── api.js        ← 데이터 CRUD + 파일 업로드
│       └── pages.js      ← URL → HTML 연결
├── public/
│   ├── index.html        ← 홈 화면 (학년 필터 포함)
│   ├── portfolio.html    ← 개인 포트폴리오 페이지
│   ├── 404.html
│   ├── css/
│   │   ├── common.css    ← 공통 디자인
│   │   ├── portfolio.css ← 포트폴리오 전용 디자인
│   │   └── designer.css  ← 커스터마이저 패널 디자인
│   └── js/
│       ├── portfolio.js  ← 포트폴리오 동작 코드
│       └── designer.js   ← 디자인 변경 코드
├── data/                 ← 자동 생성 (MongoDB 미연결 시 JSON 저장)
├── .env.example
├── .gitignore
├── Procfile
└── package.json
```

---

## 🔧 환경변수 (.env)

```env
PORT=3000
SESSION_SECRET=길고_랜덤한_문자열

# GitHub OAuth
GITHUB_CLIENT_ID=복사한_Client_ID
GITHUB_CLIENT_SECRET=복사한_Client_Secret
APP_URL=https://포트폴리오주소.onrender.com

# MongoDB Atlas
MONGODB_URI=mongodb+srv://유저명:비밀번호@cluster0.xxx.mongodb.net/portfolio?retryWrites=true&w=majority

# 관리자 GitHub 아이디
ADMIN_USERS=깃허브아이디

# Cloudinary
CLOUDINARY_CLOUD_NAME=클라우드이름
CLOUDINARY_API_KEY=API키
CLOUDINARY_API_SECRET=API시크릿
```

> ⚠️ `.env` 파일은 절대 GitHub에 올리면 안 됩니다!

---

## 🚀 로컬 실행

```bash
# 1. 패키지 설치
npm install

# 2. 환경변수 설정
cp .env.example .env
# .env 파일에 값 입력

# 3. 서버 실행
npm start        # 일반 실행
npm run dev      # 개발 모드 (자동 재시작)
```

---

## ☁️ Render 배포

1. GitHub에 코드 올리기
2. render.com → New + → Web Service → 저장소 연결
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Instance Type: **Free** 선택
6. Environment 탭에서 위 환경변수 전부 입력
7. Save Changes → 자동 배포 (2~3분)

> 💡 Render 무료 플랜은 30분 비활성 시 슬립됩니다.  
> **UptimeRobot**으로 10분 간격 ping 설정 시 24시간 유지 가능

---

## 🔒 보안 구현 목록

- **XSS 방어** — sanitize.js로 모든 입력값 HTML 엔티티 변환
- **쿠키 보안** — httpOnly, sameSite:lax, trust proxy 1
- **CSRF 방어** — sameSite:lax 쿠키 설정
- **클릭재킹** — X-Frame-Options: SAMEORIGIN
- **Rate Limiting** — 분당 200회 초과 시 자동 차단
- **소유자 검증** — verifyWorkOwner/DocOwner/ProjectOwner 미들웨어
- **파일 위장** — 파일 내용에 script/php 포함 시 차단
- **입력 길이 제한** — 모든 필드 MAX_LEN 적용
- **관리자 보호** — 자기 자신 삭제 방지

---

## 🎨 디자인 커스터마이저

오른쪽 하단 🎨 버튼 → 5가지 탭에서 설정 → 💾 저장

| 탭 | 기능 |
|----|------|
| 🎭 테마 | 다크/사이버/라이트/레트로/네이처/미니멀 6종 |
| 🎨 색상 | 포인트 컬러 피커 + 12 프리셋 + 배경 패턴 6종 |
| ✍️ 폰트 | 5종 한국어 폰트 + 커스텀 Google Fonts |
| ▦ 레이아웃 | 그리드 6종 + 섹션 순서 드래그 + 슬라이더 |
| ✨ 효과 | 애니메이션/그림자/테두리/파티클 + 글자 크기/색상 |

---

## 📦 파일 업로드 제한 (Cloudinary 무료 플랜)

| 파일 종류 | 최대 크기 | 방법 |
|-----------|-----------|------|
| 이미지 (JPG, PNG, WEBP) | 10MB | 직접 업로드 |
| PDF | 10MB | 직접 업로드 |
| ZIP / ALZ / RAR / 7Z | 10MB | 직접 업로드 또는 Google Drive 링크 |
| 영상 파일 | 불가 | 유튜브 링크 사용 |
| 10MB 초과 파일 | 불가 | Google Drive 링크 사용 |

> Cloudinary → Settings → Security → Restricted media types → **Raw 체크 해제** 필요 (PDF 공개 접근)

---

## 🛠️ 기술 스택

- **Backend**: Node.js, Express
- **Database**: MongoDB Atlas (fallback: JSON 파일)
- **Auth**: Passport.js + GitHub OAuth 2.0
- **File Storage**: Cloudinary
- **Hosting**: Render (Free Plan)
- **Frontend**: Vanilla JS, CSS3
