# AI Agent 대화 웹앱

여러 AI Agent들이 주제에 대해 대화하는 웹 애플리케이션입니다.

## 🚀 시작하기

### 1. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
# OpenAI API Key
VITE_OPENAI_API_KEY=your_actual_openai_key_here

# Google Gemini API Key  
VITE_GEMINI_API_KEY=your_actual_gemini_key_here
```

**중요:** `your_actual_openai_key_here`와 `your_actual_gemini_key_here`를 실제 API 키로 교체하세요.

### 2. API 키 발급

- **OpenAI API 키**: https://platform.openai.com/account/api-keys
- **Gemini API 키**: https://makersuite.google.com/app/apikey

### 3. 개발 서버 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173`으로 접속하세요.

## 🎯 주요 기능

- **환경 변수 기반 API 키 관리**: 보안성 향상
- **다중 AI Agent**: GPT와 Gemini 모델 혼합 사용
- **자동 대화 진행**: 진행 Agent가 다음 발언자 선택
- **사용자 개입**: 실시간 대화 참여 가능
- **명령어 지원**: `/중단`, `/재개` 명령
- **반응형 디자인**: 모바일 지원

## 🔧 사용 방법

1. **API 키 설정**: 환경 변수에서 API 키 상태 확인
2. **대화 설정**: 주제와 AI Agent 개수 선택
3. **Agent 설정**: 각 Agent의 이름과 페르소나 설정
4. **대화 시작**: 자동으로 AI Agent들이 대화를 시작합니다

## 📁 프로젝트 구조

```
src/
├── components/          # UI 컴포넌트
│   ├── SetupScreen.jsx # 초기 설정 화면
│   └── ChatScreen.jsx  # 대화 화면
├── services/           # API 서비스
│   └── aiService.js    # OpenAI & Gemini API
├── hooks/              # 커스텀 훅
│   └── useConversation.js # 대화 로직
└── types/              # 타입 정의
    └── index.js        # 공통 타입
```

## 🛠️ 기술 스택

- **React** + **Vite**
- **OpenAI API** (GPT-3.5-turbo)
- **Google Gemini API** (gemini-2.5-flash)
- **순수 CSS** (반응형 디자인)

## 🔒 보안

- API 키는 환경 변수로 관리
- `.env` 파일은 `.gitignore`에 포함
- 브라우저에서 API 키가 노출되지 않음

## 📝 라이선스

MIT License