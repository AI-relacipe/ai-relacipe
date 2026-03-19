export const theme = {
  // 1. 배경 (Backgrounds) - 차갑지 않은 '따뜻한 어둠'
  bgBase: '#1a0d1f',        // 전체 최외곽 배경 (다크 플럼 - 안정감과 비밀스러운 무드)
  bgPanel: '#240d28',       // 대화창, 사이드바 등 패널 표면 (리치 플럼 - 배경과 입체감 구분)
  bgInput: '#150818',       // 입력창 내부 배경 (더 깊은 어둠으로 텍스트 입력 집중도 향상)
  bgBubbleLLM: '#36143c',   // [추가] LLM 말풍선: bgPanel에서 명도를 올려 층위 분리
  bgBubbleUser: '#fbbf24',  // [추가] 사용자 말풍선: 익숙한 노란색 (현재 테마의 highlight 활용)

  // 2. 포인트 컬러 (Primary & Accent) - 심리적 텐션, 설렘, 도발
  primary: '#c026d3',       // 메인 포인트 (전송 버튼, 주요 활성화 상태 - 마젠타 퍼플)
  accent: '#db2777',        // 서브 포인트 (아바타 배경, 알림 아이콘 - 딥 핑크)
  neonGlow: '#e879f9',      // 네온 발광 효과 (버튼 호버 시 그림자나 빛 번짐에 사용)

  // 3. 텍스트 (Typography) - 눈 피로도를 낮추는 가독성
  textMain: '#f9fafb',      // 기본 텍스트 (순백색의 눈부심을 줄인 웜 아이보리 톤 화이트)
  textMuted: '#9d8fba',     // 부가 정보 (플레이스홀더, 시간 표시, 흐린 텍스트 - 뮤티드 퍼플 그레이)

  // 4. 테두리 및 구분선 (Borders) - 시선 분산 방지
  border: '#3b1e42',        // 패널 간의 기본 테두리 (튀지 않게 공간만 분리하는 어두운 자줏빛)
  borderFocus: '#c026d3',   // 입력창 활성화 시 테두리 (메인 포인트 컬러와 동일하게 매칭)
}

export const themeMidnight = {
  // 1. 배경 (Backgrounds) - 칠흑에 가까운 깊은 어둠
  bgBase: '#120514',        // 전체 최외곽 배경 (매우 어두운 블랙 플럼)
  bgPanel: '#1b081e',       // 대화창, 사이드바 등 패널 표면 (어두운 플럼)
  bgInput: '#0d030f',       // 입력창 내부 배경 (완전한 어둠에 가까운 색)
  bgBubbleLLM: '#2d0d32',   // [추가] LLM 말풍선
  bgBubbleUser: '#fcd34d',  // [추가] 사용자 말풍선 (골드 옐로우)

  // 2. 포인트 컬러 (Primary & Accent) - 강렬한 대비와 도발
  primary: '#d946ef',       // 메인 포인트 (명도와 채도가 높은 푸크시아 핑크)
  accent: '#f43f5e',        // 서브 포인트 (로즈 레드 - 감정의 고조를 표현)
  neonGlow: '#f0abfc',      // 네온 발광 효과 (밝고 화려한 핑크 빛 번짐)

  // 3. 텍스트 (Typography) - 강한 대비로 가독성 확보
  textMain: '#ffffff',      // 기본 텍스트 (어두운 배경에 맞춘 순백색)
  textMuted: '#a295ab',     // 부가 정보 (그레이쉬 퍼플)

  // 4. 테두리 및 구분선 (Borders)
  border: '#321638',        // 패널 간의 기본 테두리 (어두운 배경에 묻히는 딥 바이올렛)
  borderFocus: '#d946ef',   // 입력창 활성화 시 테두리 (메인 포인트와 동일)
}

export const themeDusty = {
  // 1. 배경 (Backgrounds) - 채도를 낮춘 부드러운 어둠
  bgBase: '#1c1520',        // 전체 최외곽 배경 (회색빛이 감도는 뮤티드 다크 퍼플)
  bgPanel: '#251c2a',       // 대화창, 사이드바 등 패널 표면 (부드러운 다크 그레이 퍼플)
  bgInput: '#16111a',       // 입력창 내부 배경 (차분한 어둠)
  bgBubbleLLM: '#392b40',   // [추가] LLM 말풍선
  bgBubbleUser: '#d4a373',  // [추가] 사용자 말풍선 (샌드 골드)

  // 2. 포인트 컬러 (Primary & Accent) - 우아하고 성숙한 무드
  primary: '#a24b89',       // 메인 포인트 (채도를 낮춘 모브/로즈 핑크)
  accent: '#b55a75',        // 서브 포인트 (더스티 핑크)
  neonGlow: '#c48cb1',      // 네온 발광 효과 (눈부심이 적은 차분한 핑크 글로우)

  // 3. 텍스트 (Typography) - 대비를 낮춰 눈을 편안하게
  textMain: '#f3f0f5',      // 기본 텍스트 (약간의 핑크빛이 도는 오프화이트)
  textMuted: '#968e9e',     // 부가 정보 (차분한 웜 그레이)

  // 4. 테두리 및 구분선 (Borders)
  border: '#3b2f42',        // 패널 간의 기본 테두리 (튀지 않는 뮤티드 보더)
  borderFocus: '#a24b89',   // 입력창 활성화 시 테두리
}

export const themePop = {
  // 1. 배경 (Backgrounds) - 방송 세트장 같은 딥 바이올렛
  bgBase: '#16092b',        // 전체 최외곽 배경 (푸른기가 살짝 섞인 딥 바이올렛)
  bgPanel: '#21103d',       // 대화창, 사이드바 등 패널 표면 (리치 바이올렛)
  bgInput: '#110624',       // 입력창 내부 배경 (가장 짙은 남보라)
  bgBubbleLLM: '#33195c',   // [추가] LLM 말풍선
  bgBubbleUser: '#fee440',  // [추가] 사용자 말풍선 (네온 옐로우)

  // 2. 포인트 컬러 (Primary & Accent) - 화려하고 자극적인 형광
  primary: '#b5179e',       // 메인 포인트 (강렬한 네온 마젠타)
  accent: '#f72585',        // 서브 포인트 (비비드 핫핑크)
  neonGlow: '#f1a6e6',      // 네온 발광 효과 (밝고 화려한 발광 효과)

  // 3. 텍스트 (Typography)
  textMain: '#f8f9fa',      // 기본 텍스트 (쿨톤의 화이트)
  textMuted: '#8a7eb3',     // 부가 정보 (퍼플 틴트 그레이)

  // 4. 테두리 및 구분선 (Borders)
  border: '#381c63',        // 패널 간의 기본 테두리 (가시성 있는 보라색 테두리)
  borderFocus: '#b5179e',   // 입력창 활성화 시 테두리
}

export const themeWine = {
  // 1. 배경 (Backgrounds) - 묵직하고 고급스러운 와인빛 어둠
  bgBase: '#1a0910',        // 전체 최외곽 배경 (매우 어두운 버건디)
  bgPanel: '#260e18',       // 대화창, 사이드바 등 패널 표면 (다크 마룬)
  bgInput: '#14060b',       // 입력창 내부 배경 (칠흑 같은 블랙 레드)
  bgBubbleLLM: '#3d1626',   // [추가] LLM 말풍선
  bgBubbleUser: '#f59e0b',  // [추가] 사용자 말풍선 (앰버 골드)

  // 2. 포인트 컬러 (Primary & Accent) - 관능적인 붉은빛
  primary: '#e11d48',       // 메인 포인트 (강렬한 크림슨 레드)
  accent: '#be123c',        // 서브 포인트 (깊이감 있는 딥 로즈)
  neonGlow: '#fda4af',      // 네온 발광 효과 (부드러운 레드 핑크 글로우)

  // 3. 텍스트 (Typography)
  textMain: '#fff1f2',      // 기본 텍스트 (붉은 기운이 아주 살짝 감도는 웜 화이트)
  textMuted: '#a8939a',     // 부가 정보 (더스티 로즈 그레이)

  // 4. 테두리 및 구분선 (Borders)
  border: '#451a2d',        // 패널 간의 기본 테두리 (어두운 와인색 테두리)
  borderFocus: '#e11d48',   // 입력창 활성화 시 테두리
}

export const themeDeepRedWine = {
  // 1. 배경 (Backgrounds) - 스크린샷 기반의 묵직한 마룬빛 어둠
  bgBase: '#14060c',        // 전체 최외곽 배경 (매우 어두운 벨벳 마룬)
  bgPanel: '#1d0a14',       // 대화창, 사이드바 등 패널 표면 (딥 마룬)
  bgInput: '#0d0408',       // 입력창 내부 배경 (가장 짙은 마룬)
  bgBubbleLLM: '#301121',   // [추가] LLM 말풍선
  bgBubbleUser: '#fbbf24',  // [추가] 사용자 말풍선 (골드 옐로우)

  // 2. 포인트 컬러 (Primary & Accent) - 스크린샷 기반의 강렬한 마젠타 핑크
  primary: '#c026d3',       // 메인 포인트 (전송 버튼, 배지, 활성화 상태 - 마젠타 퍼플)
  accent: '#db2777',        // 서브 포인트 (아바타 배경 - 딥 핑크)
  neonGlow: '#e879f9',      // 네온 발광 효과 (밝고 화려한 발광 효과)

  // 3. 텍스트 (Typography) - 스크린샷 기반의 아이보리 및 뮤티드 퍼플 그레이
  textMain: '#f9fafb',      // 기본 텍스트 (웜 아이보리 톤 화이트)
  textMuted: '#9d8fba',     // 부가 정보 (뮤티드 퍼플 그레이)

  // 4. 테두리 및 구분선 (Borders)
  border: '#311425',        // 패널 간의 기본 테두리 (튀지 않는 어두운 자줏빛)
  borderFocus: '#c026d3',   // 입력창 활성화 시 테두리
}

export const themeVelvetMature = {
  // 1. 배경 (Backgrounds) - 뮤티드 다크 벨벳
  bgBase: '#1f161a',        // 전체 최외곽 배경 (뮤티드 다크 핑크 그레이)
  bgPanel: '#281d22',       // 대화창, 사이드바 등 패널 표면 (부드러운 마룬 그레이)
  bgInput: '#181115',       // 입력창 내부 배경 (차분한 어둠)
  bgBubbleLLM: '#3d2c33',   // [추가] LLM 말풍선
  bgBubbleUser: '#d4a373',  // [추가] 사용자 말풍선 (샌드 골드)

  // 2. 포인트 컬러 (Primary & Accent) - 모브 로즈 톤
  primary: '#a24b89',       // 메인 포인트 (채도를 낮춘 모브 로즈 핑크)
  accent: '#b55a75',        // 서브 포인트 (더스티 핑크)
  neonGlow: '#c48cb1',      // 네온 발광 효과 (눈부심이 적은 차분한 핑크 글로우)

  // 3. 텍스트 (Typography) - 대비를 낮춰 눈을 편안하게
  textMain: '#f3f0f5',      // 기본 텍스트 (약간의 핑크빛이 도는 오프화이트)
  textMuted: '#a8939a',     // 부가 정보 (더스티 로즈 그레이)

  // 4. 테두리 및 구분선 (Borders)
  border: '#3f2e37',        // 패널 간의 기본 테두리 (튀지 않는 뮤티드 보더)
  borderFocus: '#a24b89',   // 입력창 활성화 시 테두리
}

export const themePopWine = {
  // 1. 배경 (Backgrounds) - 딥 와인 바이올렛
  bgBase: '#1d0c1e',        // 전체 최외곽 배경 (푸른기가 살짝 섞인 딥 바이올렛 마룬)
  bgPanel: '#29142e',       // 대화창, 사이드바 등 패널 표면 (리치 바이올렛 마룬)
  bgInput: '#140816',       // 입력창 내부 배경 (가장 짙은 바이올렛 마룬)
  bgBubbleLLM: '#42204a',   // [추가] LLM 말풍선
  bgBubbleUser: '#fee440',  // [추가] 사용자 말풍선 (네온 옐로우)

  // 2. 포인트 컬러 (Primary & Accent) - 비비드 마젠타 핑크
  primary: '#b5179e',       // 메인 포인트 (강렬한 네온 마젠타)
  accent: '#f72585',        // 서브 포인트 (비비드 핫핑크)
  neonGlow: '#f1a6e6',      // 네온 발광 효과 (밝고 화려한 발광 효과)

  // 3. 텍스트 (Typography)
  textMain: '#f8f9fa',      // 기본 텍스트 (쿨톤의 화이트)
  textMuted: '#9d8fba',     // 부가 정보 (뮤티드 퍼플 그레이)

  // 4. 테두리 및 구분선 (Borders)
  border: '#4a2559',        // 패널 간의 기본 테두리 (가시성 있는 보라색 테두리)
  borderFocus: '#b5179e',   // 입력창 활성화 시 테두리
}

export const themeBurgundyMature = {
  // 1. 배경 (Backgrounds) - 매우 어두운 버건디
  bgBase: '#1a090b',        // 전체 최외곽 배경 (어두운 블랙 버건디)
  bgPanel: '#240e11',       // 대화창, 사이드바 등 패널 표면 (딥 마룬 버건디)
  bgInput: '#110406',       // 입력창 내부 배경 (가장 짙은 벨벳 버건디)
  bgBubbleLLM: '#38161b',   // [추가] LLM 말풍선
  bgBubbleUser: '#f59e0b',  // [추가] 사용자 말풍선 (앰버 골드)

  // 2. 포인트 컬러 (Primary & Accent) - 깊이감 있는 붉은빛
  primary: '#d1113e',       // 메인 포인트 (강렬한 루비 레드)
  accent: '#be123c',        // 서브 포인트 (깊이감 있는 딥 로즈)
  neonGlow: '#fda4af',      // 네온 발광 효과 (부드러운 레드 핑크 글로우)

  // 3. 텍스트 (Typography)
  textMain: '#fff1f2',      // 기본 텍스트 (붉은 기운이 아주 살짝 감도는 웜 화이트)
  textMuted: '#a8939a',     // 부가 정보 (더스티 로즈 그레이)

  // 4. 테두리 및 구분선 (Borders)
  border: '#451a2d',        // 패널 간의 기본 테두리 (어두운 와인색 테두리)
  borderFocus: '#d1113e',   // 입력창 활성화 시 테두리
}

export const THEMES = {
  '로맨스': theme,
  '미드나잇': themeMidnight,
  '더스티': themeDusty,
  '팝': themePop,
  '와인': themeWine,
  '딥 레드 와인': themeDeepRedWine,
  '벨벳 매트': themeVelvetMature,
  '팝 와인': themePopWine,
  '버건디 매트': themeBurgundyMature,
}