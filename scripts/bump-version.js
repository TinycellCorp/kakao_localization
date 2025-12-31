#!/usr/bin/env node
/**
 * 프로젝트 버전 업데이트 스크립트
 *
 * 사용법:
 *   node bump-version.js --id <ProjectId> [--type <patch|minor|major>]
 *
 * 예시:
 *   node bump-version.js --id 48TangTang --type patch
 *   node bump-version.js --id 48TangTang  # 기본값: patch
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 설정
const CONFIG = {
    repoRoot: path.resolve(__dirname, '..'),
    versionFile: path.resolve(__dirname, '..', 'version.json')
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
        type: 'patch', // 기본값
        push: true
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--id':
                result.id = args[++i];
                break;
            case '--type':
                result.type = args[++i];
                break;
            case '--no-push':
                result.push = false;
                break;
            case '--help':
            case '-h':
                printHelp();
                process.exit(0);
            case '--list':
                listProjects();
                process.exit(0);
        }
    }

    return result;
}

function printHelp() {
    console.log(`
프로젝트 버전 업데이트 스크립트

사용법:
  node bump-version.js --id <ProjectId> [--type <patch|minor|major>] [--no-push]

필수 옵션:
  --id <ProjectId>              프로젝트 ID (예: 48TangTang)

선택 옵션:
  --type <patch|minor|major>    버전 증가 타입 (기본: patch)
  --no-push                     git push 생략
  --list                        등록된 프로젝트 목록 출력
  --help, -h                    도움말 출력

버전 증가 규칙:
  patch: 1.0.0 → 1.0.1 (버그 수정, 소규모 변경)
  minor: 1.0.0 → 1.1.0 (새 기능 추가)
  major: 1.0.0 → 2.0.0 (큰 변경, 호환성 변경)

예시:
  node bump-version.js --id 48TangTang                  # 1.0.0 → 1.0.1
  node bump-version.js --id 48TangTang --type minor     # 1.0.0 → 1.1.0
  node bump-version.js --id 48TangTang --type major     # 1.0.0 → 2.0.0
`);
}

function listProjects() {
    if (!fs.existsSync(CONFIG.versionFile)) {
        log('version.json 파일이 없습니다.', 'red');
        return;
    }

    const content = fs.readFileSync(CONFIG.versionFile, 'utf8');
    const versionData = JSON.parse(content);

    console.log('\n등록된 프로젝트 목록:\n');
    console.log('  프로젝트 ID              버전');
    console.log('  ─────────────────────────────');

    for (const [id, version] of Object.entries(versionData)) {
        console.log(`  ${id.padEnd(22)} ${version}`);
    }

    console.log('');
}

function validateArgs(args) {
    const errors = [];

    if (!args.id) {
        errors.push('--id 옵션이 필요합니다');
    }

    if (!['patch', 'minor', 'major'].includes(args.type)) {
        errors.push('--type은 patch, minor, major 중 하나여야 합니다');
    }

    return errors;
}

function bumpVersion(currentVersion, type) {
    const parts = currentVersion.split('.').map(Number);

    switch (type) {
        case 'major':
            parts[0]++;
            parts[1] = 0;
            parts[2] = 0;
            break;
        case 'minor':
            parts[1]++;
            parts[2] = 0;
            break;
        case 'patch':
        default:
            parts[2]++;
            break;
    }

    return parts.join('.');
}

// 메인 함수
async function main() {
    console.log('\n========================================');
    console.log('  프로젝트 버전 업데이트');
    console.log('========================================\n');

    // 인자 파싱
    const args = parseArgs();

    // 인자 검증
    const errors = validateArgs(args);
    if (errors.length > 0) {
        log('오류:', 'red');
        errors.forEach(e => console.log(`  - ${e}`));
        console.log('\n도움말: node bump-version.js --help');
        console.log('프로젝트 목록: node bump-version.js --list\n');
        process.exit(1);
    }

    // version.json 읽기
    if (!fs.existsSync(CONFIG.versionFile)) {
        logError('version.json 파일을 찾을 수 없습니다.');
        process.exit(1);
    }

    const content = fs.readFileSync(CONFIG.versionFile, 'utf8');
    const versionData = JSON.parse(content);

    // 프로젝트 확인
    if (!versionData[args.id]) {
        logError(`프로젝트를 찾을 수 없습니다: ${args.id}`);
        console.log('\n등록된 프로젝트:');
        Object.keys(versionData).forEach(id => console.log(`  - ${id}`));
        console.log('');
        process.exit(1);
    }

    const oldVersion = versionData[args.id];
    const newVersion = bumpVersion(oldVersion, args.type);

    console.log(`프로젝트: ${args.id}`);
    console.log(`버전 변경: ${oldVersion} → ${newVersion} (${args.type})\n`);

    // 버전 업데이트
    versionData[args.id] = newVersion;

    // 파일 쓰기
    fs.writeFileSync(CONFIG.versionFile, JSON.stringify(versionData, null, 2), 'utf8');
    logSuccess('version.json 업데이트 완료');

    // Git 커밋 및 푸시
    const cwd = CONFIG.repoRoot;

    try {
        execSync('git add version.json', { cwd, stdio: 'pipe' });
        logSuccess('git add 완료');

        const commitMessage = `Bump ${args.id} version: ${oldVersion} → ${newVersion}`;
        execSync(`git commit -m "${commitMessage}"`, { cwd, stdio: 'pipe' });
        logSuccess(`git commit 완료: "${commitMessage}"`);

        if (args.push) {
            execSync('git push', { cwd, stdio: 'pipe' });
            logSuccess('git push 완료');
        } else {
            log('git push 생략 (--no-push 옵션)', 'yellow');
        }

    } catch (error) {
        if (error.message.includes('nothing to commit')) {
            log('커밋할 변경사항이 없습니다', 'yellow');
        } else {
            throw error;
        }
    }

    console.log('\n========================================');
    log('버전 업데이트 완료!', 'green');
    console.log('========================================\n');

    console.log('CDN 캐시 갱신까지 최대 24시간 소요될 수 있습니다.');
    console.log('긴급 업데이트 시 캐시 퍼지:');
    console.log(`  curl -X POST "https://purge.jsdelivr.net/gh/TinycellCorp/kakao_localization@main/version.json"\n`);
}

main();
