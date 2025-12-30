# 🌐 Locales

프로젝트별 다국어 번역 파일 저장소입니다.

## 📁 구조

```
locales/
├── 47FriendsDefense/
│   ├── ko.json
│   └── en.json
├── 48TangTang/
│   ├── ko.json
│   └── en.json
├── 49FriendsRunner/
│   ├── ko.json
│   └── en.json
├── 50FriendsBongBong/
│   ├── ko.json
│   └── en.json
└── 51FriendsTileMatch/
    ├── ko.json
    └── en.json
```

## 🔗 사용 URL

### jsDelivr CDN (추천)
```
https://cdn.jsdelivr.net/gh/{사용자명}/locales@main/{프로젝트명}/{언어}.json
```

### Raw GitHub
```
https://raw.githubusercontent.com/{사용자명}/locales/main/{프로젝트명}/{언어}.json
```

## ✏️ 번역 수정 방법 (비개발자용)

### 1. 웹 에디터 열기
- 이 저장소 URL에서 `github.com`을 `github.dev`로 바꾸세요
- 또는 저장소 페이지에서 키보드 `.` 키를 누르세요

### 2. 파일 찾기
- 왼쪽 탐색기에서 프로젝트 폴더 → `ko.json` 또는 `en.json` 클릭

### 3. 수정하기
- 큰따옴표(`"`) 안의 텍스트만 수정하세요
- 쉼표(`,`)와 중괄호(`{}`)는 건드리지 마세요

### 4. 저장하기
1. 왼쪽 사이드바에서 **Source Control** 아이콘 클릭 (Y자 브랜치 모양)
2. 변경사항 메시지 입력 (예: "한국어 번역 수정")
3. **✓ Commit & Push** 클릭

## ⚠️ 주의사항

```json
{
  "key": "값",     ← 쉼표 필수
  "key2": "값2"    ← 마지막은 쉼표 없음
}
```

- 모든 키와 값은 큰따옴표(`"`)로 감싸야 합니다
- 마지막 항목에는 쉼표가 없어야 합니다
- 중괄호 `{}`가 짝이 맞아야 합니다
