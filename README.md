# 🎓 학생 포트폴리오 시스템 v3

멀티유저 + 디자인 커스터마이저가 포함된 학생 포트폴리오 웹 서비스

## 📁 파일 구조

```
portfolio-system/
├── server/
│   ├── index.js              ← 메인 서버
│   ├── db.js                 ← JSON 파일 DB
│   ├── passport.js           ← GitHub OAuth
│   └── routes/
│       ├── auth.js           ← 로그인/로그아웃
│       ├── api.js            ← 포트폴리오 CRUD API
│       └── pages.js          ← 페이지 라우트
├── public/
│   ├── index.html            ← 홈 (전체 학생 목록)
│   ├── portfolio.html        ← 개인 포트폴리오 페이지
│   ├── 404.html
│   ├── css/
│   │   ├── common.css        ← 공통 스타일
│   │   ├── portfolio.css     ← 포트폴리오 페이지 스타일
│   │   └── designer.css      ← 디자인 커스터마이저 스타일
│   └── js/
│       ├── portfolio.js      ← 포트폴리오 로직 (서버 연동)
│       └── designer.js       ← 디자인 커스터마이저 (오너 전용)
├── data/                     ← 자동 생성 (유저 데이터)
├── .env.example
├── .gitignore
├── Procfile
└── package.json
```

## 🚀 실행 방법

```bash
# 1. 패키지 설치
npm install

# 2. 환경변수 설정
cp .env.example .env
# .env 파일에 GitHub OAuth 키 입력

# 3. 서버 실행
npm start          # 일반 실행
npm run dev        # 개발 모드 (자동 재시작)
```

## ☁️ Railway 배포

1. GitHub에 코드 올리기
2. railway.app에서 저장소 연결
3. Variables 탭에서 환경변수 5개 입력
4. GitHub OAuth 콜백 URL을 Railway 주소로 업데이트

## 🎨 디자인 커스터마이저 기능

내 포트폴리오 접속 시 오른쪽 하단 🎨 버튼으로 실행

| 탭 | 기능 |
|----|------|
| 테마 | 6종 프리셋 (다크/사이버/라이트/레트로/네이처/미니멀) |
| 색상 | 포인트 컬러 + 12 프리셋 + 배경 패턴 6종 |
| 폰트 | 5종 한국어 폰트 |
| 레이아웃 | 그리드 6종 + 섹션 순서 드래그 + 슬라이더 |
| 효과 | 애니메이션/그림자/테두리/파티클 토글 |
