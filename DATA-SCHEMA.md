# 스무고개 시험준비 — 학생 학습 기록 JSON 스키마

**버전**: v1.0 · **작성일**: 2026-04-16 · **용도**: 학생 앱 → 선생님 → 연플래너 → 본부 서버 연동

이 문서는 학생 앱(`student.html`)이 쌓는 학습 기록의 표준 데이터 포맷입니다.
현재는 수동(복붙/링크/코드) 전달, 2차는 JSON 파싱, 3차는 API 자동 연동으로 확장됩니다.

## 1. 저장 위치

### 클라이언트(학생 기기)
- `localStorage`
- 키: `smg_student_records_v1`
- 값: 아래 루트 객체(JSON 문자열)

### 전달(선생님·서버)
- JSON 복사 — 카톡/문자 본문
- 공유 링크 — `teacher-view.html#d=<base64(url-safe json)>`
- 6자리 코드(A-Z, 2-9, 제외 I/O/0/1) — 구두 전달용 식별자

## 2. 루트 객체

```json
{
  "version": "1.0",
  "code": "A7BX3K",
  "student": {
    "n": "홍길동",
    "s": "OO중학교",
    "g": "중3"
  },
  "records": [ /* 과목별·회차별 기록 배열 */ ],
  "exportedAt": "2026-04-16T10:00:00.000Z"
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `version` | string | Y | 스키마 버전 (현재 "1.0") |
| `code` | string(6) | Y | 학생 고유 식별 코드. 선생님이 구두로 받아 연플래너에 입력 |
| `student` | object | Y | 학생 정보(아래) |
| `records` | array | Y | 누적 학습 기록 |
| `exportedAt` | string(ISO8601) | N | 내보낸 시각 |

### 2.1 `student` 객체 (짧은 키 사용)

| 필드 | 타입 | 설명 |
|---|---|---|
| `n` | string | 학생 이름 |
| `s` | string | 학교 이름 |
| `g` | string | 학년(예: "중3", "고1") |

> 짧은 키를 쓰는 이유: URL 공유 인코딩 길이 최소화.

## 3. 학습 기록 항목 (`records[]`)

```json
{
  "id": "lt8n9a-4k2x7",
  "t": "2026-04-16T09:32:11.000Z",
  "sub": "수학/과학",
  "pub": "비상교육",
  "mth": "upload",
  "ai": "gemini",
  "eng": "own",
  "rpt": {
    "diff": 3,
    "conf": 4,
    "weak": "원의 방정식이 헷갈려요"
  }
}
```

| 필드 | 타입 | 필수 | 허용값 / 설명 |
|---|---|---|---|
| `id` | string | Y | 세션 고유 ID |
| `t` | string(ISO8601) | Y | 학습 완료 시각 |
| `sub` | string | Y | 과목. 복수 선택 시 `/` 구분(예: `"수학/과학"`) |
| `pub` | string | N | 교과서 출판사(예: "비상교육", "미래엔") |
| `mth` | string | Y | `public` / `upload` / `both` — 자료 준비 방법 |
| `ai` | string | Y | 스무고개 카드 생성에 쓴 AI: `gemini` / `chatgpt` / `teacher` |
| `eng` | string | Y | 시험 문제 생성 엔진: `own`(본인 AI) / `yeon`(연서버) |
| `rpt` | object | Y | 학생 자가평가(아래) |

### 3.1 `rpt` 자가평가

| 필드 | 타입 | 의미 |
|---|---|---|
| `diff` | number(1-5) | 체감 난이도 (1=쉬움, 5=매우 어려움) |
| `conf` | number(1-5) | 이해도 (1=헷갈림, 5=완벽) |
| `weak` | string | 부족하다고 느낀 부분(자유 입력) |

## 4. 공유 링크 인코딩

```
https://<도메인>/teacher-view.html#d=<base64-utf8(json)>
```

- `json`: 위 루트 객체를 `JSON.stringify` 한 문자열
- base64-utf8: 유니코드 안전 변환 — `btoa(unescape(encodeURIComponent(json)))`
- 디코드: `decodeURIComponent(escape(atob(b64)))` → `JSON.parse`

> 해시(#) 사용 이유: 서버 로그에 남지 않음(프라이버시).

## 5. 값 라벨 대응표(선생님/연플래너 UI 표시용)

```
mth: public→공개자료 / upload→내 교과서 / both→둘 다
ai:  gemini→Google Gemini / chatgpt→ChatGPT / teacher→선생님
eng: own→본인 AI / yeon→연서버
```

## 6. 버전 호환성 / 마이그레이션

- 향후 필드 추가는 non-breaking로만(기본값 누락 허용). 
- breaking change 필요 시 `version`을 `"2.0"` 등으로 올리고, `teacher-view.html` 이 두 버전 모두 파싱 가능하도록 유지.

## 7. 장래 본부 서버 연동(3차)

```
POST https://<본부>/api/v1/student-records
Content-Type: application/json
Authorization: Bearer <학생/선생님 토큰>

{ 위 루트 객체 그대로 }
```

- 서버는 `code`로 학생을 식별/생성
- `records`는 멱등 upsert (`id`를 unique key로)
- 응답: `{ok:true, stored:<n>, studentId:"..."}` 형태 권장

## 8. 데이터 보관 정책

| 위치 | 보관 기간 | 용도 |
|---|---|---|
| 학생 기기 localStorage | 영구(브라우저 캐시 삭제 시 소실) | 학습 이력 누적 |
| Google Drive | 영구 보관 | 백업용 JSON 저장 |
| 본부 서버 | 학년 종료 후 1년 | 통계/분석 |

---

**문의**: 연소사(이진우) · 연프로젝트
