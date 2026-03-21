# ai-relacipe

AI 연애 시뮬레이션 프로젝트

## 환경 설정

### 1. 필수 설치
```bash
# Python 패키지
pip install -r requirements.txt

# 프론트엔드
cd frontend
npm install
```

### 2. MySQL 설정

#### Mac (Homebrew)
```bash
brew install mysql
brew services start mysql

# MySQL 접속 후 DB 생성
mysql -u root
```
```sql
CREATE DATABASE IF NOT EXISTS relacipe CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

#### Windows
1. https://dev.mysql.com/downloads/installer/ 에서 MySQL 설치
2. 설치 시 root 비밀번호 설정 (기억해둘 것)
3. MySQL Workbench 또는 터미널에서:
```sql
CREATE DATABASE IF NOT EXISTS relacipe CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### Docker (Mac/Windows 공통)
```bash
docker run -d --name mysql-relacipe \
  -e MYSQL_ROOT_PASSWORD=root1234 \
  -e MYSQL_DATABASE=relacipe \
  -p 3306:3306 \
  mysql:8 --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
```

### 3. Redis 설정
```bash
# Docker
docker run -d --name redis -p 6379:6379 redis:7-alpine

# 또는 Mac
brew install redis
brew services start redis
```

### 4. 환경변수 (.env)

프로젝트 루트에 `.env` 파일 생성:
```
ANTHROPIC_API_KEY=sk-ant-...여기에_API_키
CORS_ORIGINS=*
DATABASE_URL=mysql+pymysql://root@localhost:3306/relacipe
JWT_SECRET=relacipe-secret-key-2026
```

> **비밀번호가 있는 경우:**
> `DATABASE_URL=mysql+pymysql://root:비밀번호@localhost:3306/relacipe`

프론트엔드 `frontend/.env` 파일 생성:
```
VITE_API_URL=http://localhost:8000
```

### 5. 실행

```bash
# 터미널 1 - 백엔드
cd ai-relacipe
uvicorn api:app --reload --port 8000

# 터미널 2 - 프론트엔드
cd ai-relacipe/frontend
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

## 기술 스택
- **Backend**: Python FastAPI, Anthropic Claude (Haiku), Redis, MySQL
- **Frontend**: React (JSX), face-api.js, Vite
- **AI**: claude-haiku-4-5-20251001 (채팅/감지/패널), face-api.js (표정인식)
- **DB**: Redis (대화 히스토리, 요약, fact), MySQL (회원정보, 세션 목록)

## 주요 패키지 (requirements.txt에 추가 필요)
```
sqlalchemy
pymysql
bcrypt
pyjwt
```
