#!/usr/bin/env node
/**
 * 신규 프로젝트 로컬라이징 셋업 스크립트
 *
 * 사용법:
 *   node setup-localization.js --id <ProjectId> --path <ProjectPath> --engine <2|3> [--lang <js|ts>]
 *
 * 예시:
 *   node setup-localization.js --id 52NewProject --path "C:\Projects\NewGame" --engine 3
 *   node setup-localization.js --id 52NewProject --path "C:\Projects\NewGame" --engine 2 --lang js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 설정
const CONFIG = {
    cdnBaseUrl: 'https://cdn.jsdelivr.net/gh/TinycellCorp/kakao_localization@main',
    repoRoot: path.resolve(__dirname, '..'),
    templatesDir: path.resolve(__dirname, '..', 'templates'),
    versionFile: path.resolve(__dirname, '..', 'version.json'),
    supportedLanguages: ['ko', 'en', 'cn']
};

// 색상 출력
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
    console.log(`${colors.cyan}[Step ${step}]${colors.reset} ${message}`);
}

function logSuccess(message) {
    console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function logError(message) {
    console.log(`${colors.red}✗${colors.reset} ${message}`);
}

// 인자 파싱
function parseArgs() {
    const args = process.argv.slice(2);
    const result = {
        id: null,
        path: null,
        engine: null,
        lang: 'ts' // 기본값
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--id':
                result.id = args[++i];
                break;
            case '--path':
                result.path = args[++i];
                break;
            case '--engine':
                result.engine = args[++i];
                break;
            case '--lang':
                result.lang = args[++i];
                break;
            case '--help':
            case '-h':
                printHelp();
                process.exit(0);
        }
    }

    return result;
}

function printHelp() {
    console.log(`
신규 프로젝트 로컬라이징 셋업 스크립트

사용법:
  node setup-localization.js --id <ProjectId> --path <ProjectPath> --engine <2|3> [--lang <js|ts>]

필수 옵션:
  --id <ProjectId>      프로젝트 ID (예: 52NewProject)
  --path <ProjectPath>  프로젝트 경로 (예: "C:\\Projects\\NewGame")
  --engine <2|3>        Cocos Creator 엔진 버전 (2 또는 3)

선택 옵션:
  --lang <js|ts>        스크립트 언어 (기본: ts, engine 2에서만 js 선택 가능)
  --help, -h            도움말 출력

예시:
  node setup-localization.js --id 52NewProject --path "C:\\Projects\\NewGame" --engine 3
  node setup-localization.js --id 52NewProject --path "C:\\Projects\\NewGame" --engine 2 --lang js
`);
}

function validateArgs(args) {
    const errors = [];

    if (!args.id) {
        errors.push('--id 옵션이 필요합니다 (예: --id 52NewProject)');
    } else if (!/^\d+[A-Z][a-zA-Z]+$/.test(args.id)) {
        errors.push('프로젝트 ID는 "숫자+CamelCase" 형식이어야 합니다 (예: 52NewProject)');
    }

    if (!args.path) {
        errors.push('--path 옵션이 필요합니다 (예: --path "C:\\Projects\\NewGame")');
    } else if (!fs.existsSync(args.path)) {
        errors.push(`프로젝트 경로가 존재하지 않습니다: ${args.path}`);
    }

    if (!args.engine) {
        errors.push('--engine 옵션이 필요합니다 (2 또는 3)');
    } else if (!['2', '3'].includes(args.engine)) {
        errors.push('--engine은 2 또는 3이어야 합니다');
    }

    if (args.lang && !['js', 'ts'].includes(args.lang)) {
        errors.push('--lang은 js 또는 ts여야 합니다');
    }

    if (args.engine === '3' && args.lang === 'js') {
        errors.push('Cocos Creator 3.x는 TypeScript만 지원합니다');
    }

    return errors;
}

// Step 1: LocalizationManager 복사
function copyLocalizationManager(args) {
    logStep(1, '프로젝트에 LocalizationManager 추가');

    const engine = args.engine;
    const lang = args.lang;

    // 템플릿 파일 결정
    let templateFile;
    let targetDir;
    let targetFile;

    if (engine === '2') {
        if (lang === 'js') {
            templateFile = path.join(CONFIG.templatesDir, 'LocalizationManager_2x.js');
            targetDir = path.join(args.path, 'assets', '_script');
            targetFile = path.join(targetDir, 'LocalizationManager.js');
        } else {
            templateFile = path.join(CONFIG.templatesDir, 'LocalizationManager_2x.ts');
            targetDir = path.join(args.path, 'assets', 'localization');
            targetFile = path.join(targetDir, 'LocalizationManager.ts');
        }
    } else {
        templateFile = path.join(CONFIG.templatesDir, 'LocalizationManager_3x.ts');
        targetDir = path.join(args.path, 'assets', 'localization');
        targetFile = path.join(targetDir, 'LocalizationManager.ts');
    }

    // 템플릿 파일 확인
    if (!fs.existsSync(templateFile)) {
        throw new Error(`템플릿 파일을 찾을 수 없습니다: ${templateFile}`);
    }

    // 대상 디렉토리 생성
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
        logSuccess(`디렉토리 생성: ${targetDir}`);
    }

    // 템플릿 읽기 및 프로젝트 ID 치환
    let content = fs.readFileSync(templateFile, 'utf8');
    content = content.replace(/NEW_PROJECT_ID/g, args.id);

    // 파일 쓰기
    fs.writeFileSync(targetFile, content, 'utf8');
    logSuccess(`LocalizationManager 생성: ${targetFile}`);

    return targetFile;
}

// Step 2: CDN 레포에 프로젝트 폴더 생성
function createProjectFolder(args) {
    logStep(2, 'CDN 레포지토리에 프로젝트 폴더 생성');

    const projectDir = path.join(CONFIG.repoRoot, args.id);

    // 이미 존재하는지 확인
    if (fs.existsSync(projectDir)) {
        log(`프로젝트 폴더가 이미 존재합니다: ${projectDir}`, 'yellow');
        return projectDir;
    }

    // 폴더 생성
    fs.mkdirSync(projectDir, { recursive: true });
    logSuccess(`프로젝트 폴더 생성: ${projectDir}`);

    // 빈 언어 파일 생성
    for (const lang of CONFIG.supportedLanguages) {
        const langFile = path.join(projectDir, `${lang}.json`);
        fs.writeFileSync(langFile, '{}', 'utf8');
        logSuccess(`언어 파일 생성: ${langFile}`);
    }

    return projectDir;
}

// Step 3: version.json 업데이트
function updateVersionFile(args) {
    logStep(3, 'version.json 업데이트');

    let versionData = {};

    // 기존 파일 읽기
    if (fs.existsSync(CONFIG.versionFile)) {
        const content = fs.readFileSync(CONFIG.versionFile, 'utf8');
        versionData = JSON.parse(content);
    }

    // 이미 존재하는지 확인
    if (versionData[args.id]) {
        log(`프로젝트가 이미 version.json에 존재합니다: ${args.id} = ${versionData[args.id]}`, 'yellow');
        return;
    }

    // 새 프로젝트 추가
    versionData[args.id] = '1.0.0';

    // 정렬 (숫자 기준)
    const sorted = {};
    Object.keys(versionData)
        .sort((a, b) => {
            const numA = parseInt(a.match(/^\d+/)?.[0] || '0');
            const numB = parseInt(b.match(/^\d+/)?.[0] || '0');
            return numA - numB;
        })
        .forEach(key => {
            sorted[key] = versionData[key];
        });

    // 파일 쓰기
    fs.writeFileSync(CONFIG.versionFile, JSON.stringify(sorted, null, 2), 'utf8');
    logSuccess(`version.json 업데이트: ${args.id} = 1.0.0`);
}

// Step 4: Git 커밋 및 푸시
function gitCommitAndPush(args) {
    logStep(4, 'Git 커밋 및 푸시');

    const cwd = CONFIG.repoRoot;

    try {
        // git add
        execSync(`git add "${args.id}" version.json`, { cwd, stdio: 'pipe' });
        logSuccess('git add 완료');

        // git commit
        const commitMessage = `Add new project: ${args.id}`;
        execSync(`git commit -m "${commitMessage}"`, { cwd, stdio: 'pipe' });
        logSuccess(`git commit 완료: "${commitMessage}"`);

        // git push
        execSync('git push', { cwd, stdio: 'pipe' });
        logSuccess('git push 완료');

    } catch (error) {
        if (error.message.includes('nothing to commit')) {
            log('커밋할 변경사항이 없습니다', 'yellow');
        } else {
            throw error;
        }
    }
}

// 다음 프로젝트 번호 찾기
function getNextProjectNumber() {
    if (!fs.existsSync(CONFIG.versionFile)) {
        return 47; // 시작 번호
    }

    const content = fs.readFileSync(CONFIG.versionFile, 'utf8');
    const versionData = JSON.parse(content);

    let maxNum = 0;
    for (const key of Object.keys(versionData)) {
        const match = key.match(/^(\d+)/);
        if (match) {
            const num = parseInt(match[1]);
            if (num > maxNum) maxNum = num;
        }
    }

    return maxNum + 1;
}

// 메인 함수
async function main() {
    console.log('\n========================================');
    console.log('  신규 프로젝트 로컬라이징 셋업');
    console.log('========================================\n');

    // 인자 파싱
    const args = parseArgs();

    // 인자 검증
    const errors = validateArgs(args);
    if (errors.length > 0) {
        log('오류:', 'red');
        errors.forEach(e => console.log(`  - ${e}`));
        console.log('\n도움말: node setup-localization.js --help\n');

        // 다음 프로젝트 번호 힌트
        const nextNum = getNextProjectNumber();
        log(`힌트: 다음 프로젝트 번호는 ${nextNum}입니다 (예: ${nextNum}NewProject)`, 'cyan');

        process.exit(1);
    }

    console.log('설정:');
    console.log(`  - 프로젝트 ID: ${args.id}`);
    console.log(`  - 프로젝트 경로: ${args.path}`);
    console.log(`  - 엔진 버전: Cocos Creator ${args.engine}.x`);
    console.log(`  - 스크립트 언어: ${args.lang.toUpperCase()}`);
    console.log('');

    try {
        // Step 1: LocalizationManager 복사
        copyLocalizationManager(args);

        // Step 2: CDN 레포에 프로젝트 폴더 생성
        createProjectFolder(args);

        // Step 3: version.json 업데이트
        updateVersionFile(args);

        // Step 4: Git 커밋 및 푸시
        gitCommitAndPush(args);

        console.log('\n========================================');
        log('셋업 완료!', 'green');
        console.log('========================================\n');

        console.log('다음 단계:');
        console.log('  1. Cocos Creator에서 프로젝트 열기');
        console.log('  2. LocalizationManager를 씬에 추가');
        console.log('  3. 필요한 경우 속성 조정');
        console.log(`  4. ${args.id} 폴더의 JSON 파일에 로컬라이징 데이터 추가\n`);

        console.log('CDN URL:');
        console.log(`  ${CONFIG.cdnBaseUrl}/${args.id}/ko.json\n`);

    } catch (error) {
        logError(`셋업 실패: ${error.message}`);
        process.exit(1);
    }
}

main();
