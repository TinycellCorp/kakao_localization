# PRD: 신규 프로젝트 로컬라이징 시스템 셋업

## 1. 개요

### 1.1 목적
신규 Cocos Creator 프로젝트에 CDN 기반 로컬라이징 시스템을 자동으로 셋업하는 프로세스 정의

### 1.2 범위
- Cocos Creator 2.x (JavaScript/TypeScript)
- Cocos Creator 3.x (TypeScript)

---

## 2. 시스템 구성

### 2.1 아키텍처
```
┌─────────────────┐     ┌─────────────────────────────────────┐
│  Game Client    │───▶│  jsdelivr CDN                       │
│                 │     │  cdn.jsdelivr.net/gh/TinycellCorp/  │
│  - version.json │     │  kakao_localization@main/           │
│  - {lang}.json  │     │                                     │
└─────────────────┘     └─────────────────────────────────────┘
                                        │
                                        ▼
                        ┌─────────────────────────────────────┐
                        │  GitHub Repository                  │
                        │  TinycellCorp/kakao_localization    │
                        │                                     │
                        │  ├── version.json                   │
                        │  ├── {ProjectId}/                   │
                        │  │   ├── ko.json                    │
                        │  │   ├── en.json                    │
                        │  │   └── cn.json                    │
                        │  └── ...                            │
                        └─────────────────────────────────────┘
```

### 2.2 프로젝트 ID 규칙
- 형식: `{번호}{프로젝트명}` (예: `52NewProject`)
- 번호는 순차적으로 증가
- 프로젝트명은 CamelCase

---

## 3. 셋업 프로세스

### 3.1 자동화 명령어
```bash
# 기본 사용법
node scripts/setup-localization.js --id <ProjectId> --path <ProjectPath> --engine <2|3>

# 예시
node scripts/setup-localization.js --id 52NewProject --path "C:\Projects\NewGame" --engine 3
```

### 3.2 수행 작업

#### Step 1: 프로젝트에 LocalizationManager 추가
- 엔진 버전에 맞는 LocalizationManager 템플릿 복사
- `cdnProjectId` 값 자동 설정

#### Step 2: CDN 레포지토리에 프로젝트 폴더 생성
- `kakao_localization/{ProjectId}/` 폴더 생성
- 빈 언어 파일 생성 (ko.json, en.json, cn.json)

#### Step 3: version.json 업데이트
- 새 프로젝트 ID와 초기 버전(1.0.0) 추가

#### Step 4: Git 커밋 및 푸시
- 변경사항 자동 커밋
- main 브랜치에 푸시

---

## 4. 파일 구조

### 4.1 kakao_localization 레포지토리
```
kakao_localization/
├── version.json              # 버전 관리 파일
├── scripts/
│   └── setup-localization.js # 셋업 스크립트
├── templates/
│   ├── LocalizationManager_2x.js   # Cocos 2.x JS 템플릿
│   ├── LocalizationManager_2x.ts   # Cocos 2.x TS 템플릿
│   └── LocalizationManager_3x.ts   # Cocos 3.x TS 템플릿
├── docs/
│   └── PRD_LocalizationSetup.md    # 이 문서
├── 47FriendsDefense/
│   ├── ko.json
│   ├── en.json
│   └── cn.json
├── 48TangTang/
│   └── ...
└── ...
```

### 4.2 프로젝트 내 구조
```
{ProjectPath}/
└── assets/
    └── localization/           # 또는 _script/ (2.x JS)
        └── LocalizationManager.ts  # 또는 .js
```

---

## 5. LocalizationManager 설정

### 5.1 필수 속성
| 속성 | 설명 | 기본값 |
|------|------|--------|
| `useCDN` | CDN 사용 여부 | `true` |
| `cdnProjectId` | 프로젝트 ID | 자동 설정 |
| `cdnBaseUrl` | CDN 베이스 URL | `https://cdn.jsdelivr.net/gh/TinycellCorp/kakao_localization@main` |
| `cdnVersionUrl` | 버전 파일 URL | `{cdnBaseUrl}/version.json` |
| `useCache` | 캐시 사용 여부 | `true` |
| `useFallback` | CDN 실패 시 로컬 폴백 | `true` |

### 5.2 비활성화된 속성 (CDN 전용 모드)
| 속성 | 값 | 비고 |
|------|-----|------|
| `loadFromSpreadsheet` | `false` | CDN 사용으로 비활성화 |
| `autoLoadTsvFolder` | `false` | CDN 사용으로 비활성화 |

---

## 6. 버전 관리

### 6.1 version.json 형식
```json
{
  "47FriendsDefense": "1.0.0",
  "48TangTang": "1.0.0",
  "52NewProject": "1.0.0"
}
```

### 6.2 버전 업데이트 시점
- 로컬라이징 데이터 변경 후 Git push 전
- 버전 증가: `1.0.0` → `1.0.1` (패치) 또는 `1.1.0` (마이너)

### 6.3 버전 업데이트 명령어
```bash
node scripts/bump-version.js --id <ProjectId> --type <patch|minor|major>
```

---

## 7. 운영 가이드

### 7.1 신규 프로젝트 추가 체크리스트
- [ ] 프로젝트 ID 결정 (다음 번호 확인)
- [ ] 셋업 스크립트 실행
- [ ] Cocos Creator에서 LocalizationManager 컴포넌트 추가
- [ ] 테스트 빌드 및 CDN 연결 확인

### 7.2 로컬라이징 데이터 업데이트 프로세스
1. `kakao_localization/{ProjectId}/` 폴더의 JSON 파일 수정
2. `version.json`에서 해당 프로젝트 버전 증가
3. Git commit & push
4. jsdelivr CDN 캐시 갱신 대기 (최대 24시간, 보통 10분 이내)

### 7.3 긴급 업데이트 (캐시 퍼지)
```bash
# jsdelivr 캐시 퍼지 (프로젝트별)
curl -X POST "https://purge.jsdelivr.net/gh/TinycellCorp/kakao_localization@main/{ProjectId}/ko.json"
curl -X POST "https://purge.jsdelivr.net/gh/TinycellCorp/kakao_localization@main/version.json"
```

---

## 8. 트러블슈팅

### 8.1 CDN 로드 실패
- **원인**: 네트워크 오류, CDN 장애
- **해결**: 자동으로 로컬 캐시 사용 (useFallback=true)

### 8.2 버전이 업데이트되지 않음
- **원인**: jsdelivr CDN 캐시
- **해결**: 캐시 퍼지 요청 또는 대기

### 8.3 빈 로컬라이징 데이터
- **원인**: 초기 셋업 후 데이터 미입력
- **해결**: JSON 파일에 키-값 추가

---

## 9. 부록

### 9.1 지원 언어
| 코드 | 언어 |
|------|------|
| `ko` | 한국어 |
| `en` | 영어 |
| `cn` | 중국어 (간체) |

### 9.2 관련 링크
- GitHub: https://github.com/TinycellCorp/kakao_localization
- CDN: https://cdn.jsdelivr.net/gh/TinycellCorp/kakao_localization@main/
