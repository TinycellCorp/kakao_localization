// LocalizationManager.ts (Cocos Creator 3.x with CDN Support)
import { _decorator, Component, JsonAsset, TextAsset, Label, Node, find, instantiate, sys, director, Director, game, Prefab, resources, Sprite, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 로컬라이제이션 데이터 타입
 */
interface LocalizationData {
    [language: string]: {
        [key: string]: string;
    };
}

/**
 * 이미지 로컬라이징 데이터 타입
 */
interface ImageLocalizationData {
    [language: string]: {
        [key: string]: string;
    };
}

/**
 * CDN 로드 결과 타입
 */
interface CDNLoadResult {
    success: boolean;
    source: 'cdn' | 'cache' | 'local';
    language: string;
    keyCount: number;
    version?: string;
}

/**
 * 다국어 지원을 위한 LocalizationManager
 * Cocos Creator 3.x 버전 (CDN 지원)
 */
@ccclass('LocalizationManager')
export class LocalizationManager extends Component {

    // ========== Properties ==========

    @property({ type: [JsonAsset], tooltip: "다국어 JSON 파일 배열 (여러 파일 가능)" })
    localizationJsonFiles: JsonAsset[] = [];

    @property({ type: [TextAsset], tooltip: "다국어 TSV 파일 배열" })
    localizationTsvFiles: TextAsset[] = [];

    // [CDN 사용으로 비활성화]
    @property({ tooltip: "[비활성화됨 - CDN 사용] 스프레드시트에서 로드할지 여부" })
    loadFromSpreadsheet: boolean = false;

    @property({ tooltip: "스프레드시트 URL" })
    spreadsheetUrl: string = "";

    @property({ tooltip: "TSV 파일 폴더 경로" })
    tsvFolderPath: string = "localization";

    // [CDN 사용으로 비활성화]
    @property({ tooltip: "[비활성화됨 - CDN 사용] TSV 폴더 자동 로드 사용 여부" })
    autoLoadTsvFolder: boolean = false;

    @property({ tooltip: "기본 언어 (ko, en, cn)" })
    defaultLanguage: string = "ko";

    @property({ tooltip: "시작 시 자동 로컬라이징" })
    autoLocalizeOnStart: boolean = true;

    @property({ tooltip: "씬 로드 시 자동 로컬라이징" })
    autoLocalizeOnSceneLoaded: boolean = true;

    @property({ tooltip: "로컬라이징 키 접두사" })
    keyPrefix: string = "@";

    @property({ tooltip: "디버그 모드" })
    debugMode: boolean = false;

    @property({ tooltip: "중복 키 경고" })
    warnOnDuplicate: boolean = true;

    @property({ tooltip: "이미지 로컬라이징 데이터" })
    imageLocalizationData: ImageLocalizationData = { ko: {}, en: {}, cn: {} };

    @property({ tooltip: "이미지 기본 경로" })
    imageBasePath: string = "localization/images";

    // ========== CDN Properties ==========

    @property({ tooltip: "CDN에서 로컬라이징 로드 사용" })
    useCDN: boolean = true;

    @property({ tooltip: "CDN 프로젝트 ID (예: 47FriendsDefense)" })
    cdnProjectId: string = "NEW_PROJECT_ID";

    @property({ tooltip: "CDN 베이스 URL" })
    cdnBaseUrl: string = "https://cdn.jsdelivr.net/gh/TinycellCorp/kakao_localization@main";

    @property({ tooltip: "CDN 실패 시 로컬 폴백 사용" })
    useFallback: boolean = true;

    @property({ tooltip: "CDN 캐시 사용 (LocalStorage)" })
    useCache: boolean = true;

    @property({ tooltip: "CDN 캐시 만료 시간 (초, 0=무제한)" })
    cacheExpireSeconds: number = 3600;

    @property({ tooltip: "CDN 버전 파일 URL" })
    cdnVersionUrl: string = "https://cdn.jsdelivr.net/gh/TinycellCorp/kakao_localization@main/version.json";

    // ========== Static Properties ==========

    private static instance: LocalizationManager | null = null;
    private static _currentLanguage: string = "ko";
    private static _data: LocalizationData | null = null;
    private static _isInitialized: boolean = false;
    private static _imageData: ImageLocalizationData | null = null;
    private static _imageBasePath: string = "";

    // ========== Static Methods - 초기화 체크 ==========

    public static ensureInitialized(): boolean {
        if (!this._isInitialized || !this._data) {
            console.warn('[LocalizationManager] 아직 초기화되지 않았습니다.');
            return false;
        }
        return true;
    }

    // ========== Static Methods - 텍스트 가져오기 ==========

    public static getText(key: string): string {
        if (!this.ensureInitialized()) return key;

        if (key.includes('@')) {
            key = key.replace('@', '');
        }

        let text = this._data![this._currentLanguage]?.[key];

        if (!text) {
            if (this.instance && this.instance.debugMode) {
                console.warn('[LocalizationManager] 키를 찾을 수 없습니다:', key);
            }
            return key;
        }

        text = text.replace(/\\n/g, '\n');
        text = text.replace(/\\s/g, ' ');
        return text;
    }

    public static getTextWithArgs(key: string, ...args: any[]): string {
        if (key.includes('@')) {
            key = key.replace('@', '');
        }

        let text = this.getText(key);
        let tmp = [...args];

        for (let i = 0; i < tmp.length; i++) {
            const regex = new RegExp(`\\{${i}\\}`, 'g');
            text = text.replace(regex, String(tmp[i]));
        }

        return text;
    }

    // ========== Static Methods - Label 로컬라이징 ==========

    public static localizeLabel(label: Label, prefix?: string): boolean;
    public static localizeLabel(label: Label, key: string, isKey: boolean): boolean;
    public static localizeLabel(label: Label, prefixOrKey?: string, isKey?: boolean): boolean {
        if (!label) return false;
        if (!this.ensureInitialized()) return false;

        let key: string | null = null;

        if (isKey === true && prefixOrKey) {
            key = prefixOrKey;
        } else if (label.string) {
            const text = label.string.trim();
            const keyPrefix = prefixOrKey || (this.instance ? this.instance.keyPrefix : "@");

            if (text.indexOf(keyPrefix) === 0) {
                key = text.substring(keyPrefix.length);
            }
        }

        if (key) {
            const localizedText = this.getText(key);
            label.string = localizedText;
            (label as any)._localizationKey = key;
            return true;
        }

        return false;
    }

    public static localizeNode(node: Node, prefix?: string): number {
        if (!node || !node.isValid) return 0;
        if (!this.ensureInitialized()) return 0;

        let count = 0;
        const keyPrefix = prefix || (this.instance ? this.instance.keyPrefix : "@");

        const label = node.getComponent(Label);
        if (label) {
            if (this.localizeLabel(label, keyPrefix)) {
                count++;
            }
        }

        for (let i = 0; i < node.children.length; i++) {
            count += this.localizeNode(node.children[i], keyPrefix);
        }

        return count;
    }

    public static localizeScene(): number {
        if (!this.ensureInitialized()) return 0;

        const canvas = find("Canvas");
        if (!canvas) {
            if (this.instance && this.instance.debugMode) {
                console.warn('[LocalizationManager] Canvas를 찾을 수 없습니다.');
            }
            return 0;
        }

        const startTime = Date.now();
        const count = this.localizeNode(canvas);
        const elapsed = Date.now() - startTime;

        if (this.instance && this.instance.debugMode) {
            console.log(`[LocalizationManager] ${count}개 Label 로컬라이징 (${elapsed}ms)`);
        }

        return count;
    }

    // ========== Static Methods - 프리펩 인스턴스화 헬퍼 ==========

    public static instantiatePrefab(prefab: Prefab): Node | null {
        if (!prefab) {
            console.error('[LocalizationManager] prefab이 null입니다.');
            return null;
        }

        const node = instantiate(prefab);
        this.localizeNode(node);
        return node;
    }

    public static addChildWithLocalization(node: Node, parent: Node): void {
        if (!node || !parent) return;
        parent.addChild(node);
        this.localizeNode(node);
    }

    // ========== Static Methods - 언어 변경 ==========

    public static setLanguage(language: string): void {
        if (!this.ensureInitialized()) return;

        if (this._currentLanguage === language) return;

        if (!this._data || !this._data[language]) {
            console.error(`[LocalizationManager] ${language} 데이터가 없습니다.`);
            return;
        }

        this._currentLanguage = language;
        this.updateAllLocalizedLabels();
        this.updateAllLocalizedSprites();

        sys.localStorage.setItem('game_language', language);
        console.log('[LocalizationManager] 언어 변경:', language);
    }

    private static updateAllLocalizedLabels(): void {
        const canvas = find("Canvas");
        if (!canvas) return;

        const startTime = Date.now();
        const count = this.updateNodeLabels(canvas);
        const elapsed = Date.now() - startTime;

        if (this.instance && this.instance.debugMode) {
            console.log(`[LocalizationManager] ${count}개 Label 업데이트 (${elapsed}ms)`);
        }
    }

    private static updateNodeLabels(node: Node): number {
        if (!node || !node.isValid) return 0;

        let count = 0;

        const label = node.getComponent(Label);
        if (label) {
            const savedKey = (label as any)._localizationKey;
            if (savedKey) {
                label.string = this.getText(savedKey);
                count++;
            } else {
                const keyPrefix = this.instance ? this.instance.keyPrefix : "@";
                if (this.localizeLabel(label, keyPrefix)) {
                    count++;
                }
            }
        }

        for (let i = 0; i < node.children.length; i++) {
            count += this.updateNodeLabels(node.children[i]);
        }

        return count;
    }

    public static getLanguage(): string {
        return this._currentLanguage;
    }

    public static getSupportedLanguages(): string[] {
        if (!this._data) return [];
        return Object.keys(this._data);
    }

    // ========== Static Methods - 동적 JSON 추가 ==========

    public static addJsonData(jsonData: LocalizationData, overwrite: boolean = false): void {
        if (!jsonData) return;

        if (!this._data) {
            this._data = { ko: {}, en: {}, cn: {} };
        }

        for (const lang in jsonData) {
            if (!this._data[lang]) {
                this._data[lang] = {};
            }

            const langData = jsonData[lang];
            for (const key in langData) {
                if (!overwrite && this._data[lang][key]) {
                    if (this.instance && this.instance.debugMode) {
                        console.warn('[LocalizationManager] 키가 이미 존재합니다:', key);
                    }
                    continue;
                }
                this._data[lang][key] = langData[key];
            }
        }

        if (this.instance && this.instance.debugMode) {
            console.log('[LocalizationManager] JSON 데이터 추가 완료');
        }
    }

    public static mergeJsonAsset(jsonAsset: JsonAsset, overwrite: boolean = false): void {
        if (!jsonAsset || !jsonAsset.json) {
            console.error('[LocalizationManager] 유효하지 않은 JsonAsset');
            return;
        }
        this.addJsonData(jsonAsset.json as LocalizationData, overwrite);
    }

    // ========== Static Methods - CDN 로딩 ==========

    public static async loadFromCDN(language: string): Promise<CDNLoadResult> {
        if (!this.instance) {
            console.error('[LocalizationManager] 인스턴스가 없습니다.');
            return { success: false, source: 'local', language, keyCount: 0 };
        }

        const { cdnProjectId, cdnBaseUrl, useCache, useFallback, cacheExpireSeconds, debugMode } = this.instance;

        if (!cdnProjectId) {
            console.error('[LocalizationManager] cdnProjectId가 설정되지 않았습니다.');
            return { success: false, source: 'local', language, keyCount: 0 };
        }

        // 캐시 먼저 확인
        if (useCache) {
            const cached = this.loadFromCache(cdnProjectId, language);
            if (cached) {
                if (debugMode) {
                    console.log(`[LocalizationManager] 캐시에서 로드: ${language}`);
                }

                if (!this._data) {
                    this._data = { ko: {}, en: {}, cn: {} };
                }
                this._data[language] = cached.data;

                return {
                    success: true,
                    source: 'cache',
                    language,
                    keyCount: Object.keys(cached.data).length
                };
            }
        }

        // CDN에서 가져오기
        const url = `${cdnBaseUrl}/${cdnProjectId}/${language}.json`;

        try {
            if (debugMode) {
                console.log(`[LocalizationManager] CDN 로드 시도: ${url}`);
            }

            const response = await this.fetchWithTimeout(url, 10000);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const keyCount = Object.keys(data).length;

            if (!this._data) {
                this._data = { ko: {}, en: {}, cn: {} };
            }
            this._data[language] = data;

            if (useCache) {
                this.saveToCache(cdnProjectId, language, data, cacheExpireSeconds);
            }

            if (debugMode) {
                console.log(`[LocalizationManager] CDN 로드 성공: ${language} (${keyCount}개 키)`);
            }

            return { success: true, source: 'cdn', language, keyCount };

        } catch (error: any) {
            console.warn(`[LocalizationManager] CDN 로드 실패: ${error.message}`);

            // 폴백: 캐시 (만료되었더라도)
            if (useCache) {
                const expiredCache = this.loadFromCache(cdnProjectId, language, true);
                if (expiredCache) {
                    console.log(`[LocalizationManager] 만료된 캐시 사용: ${language}`);

                    if (!this._data) {
                        this._data = { ko: {}, en: {}, cn: {} };
                    }
                    this._data[language] = expiredCache.data;

                    return {
                        success: true,
                        source: 'cache',
                        language,
                        keyCount: Object.keys(expiredCache.data).length
                    };
                }
            }

            // 폴백: 로컬 파일 사용
            if (useFallback && this._data && this._data[language]) {
                const keyCount = Object.keys(this._data[language]).length;
                console.log(`[LocalizationManager] 로컬 폴백 사용: ${language} (${keyCount}개 키)`);
                return { success: true, source: 'local', language, keyCount };
            }

            return { success: false, source: 'local', language, keyCount: 0 };
        }
    }

    public static async loadAllFromCDN(): Promise<CDNLoadResult[]> {
        const languages = ['ko', 'en', 'cn'];
        const results: CDNLoadResult[] = [];

        for (const lang of languages) {
            const result = await this.loadFromCDN(lang);
            results.push(result);
        }

        return results;
    }

    private static async fetchWithTimeout(url: string, timeout: number): Promise<Response> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    // ========== Static Methods - 캐시 관리 ==========

    private static getCacheKey(projectId: string, language: string): string {
        return `loc_${projectId}_${language}`;
    }

    private static saveToCache(
        projectId: string,
        language: string,
        data: { [key: string]: string },
        expireSeconds: number
    ): void {
        try {
            const cacheKey = this.getCacheKey(projectId, language);
            const cacheData = {
                data,
                timestamp: Date.now(),
                expireSeconds
            };

            sys.localStorage.setItem(cacheKey, JSON.stringify(cacheData));

            if (this.instance && this.instance.debugMode) {
                console.log(`[LocalizationManager] 캐시 저장: ${cacheKey}`);
            }
        } catch (error: any) {
            console.warn('[LocalizationManager] 캐시 저장 실패:', error.message);
        }
    }

    private static loadFromCache(
        projectId: string,
        language: string,
        ignoreExpiry: boolean = false
    ): { data: { [key: string]: string }, timestamp: number } | null {
        try {
            const cacheKey = this.getCacheKey(projectId, language);
            const cached = sys.localStorage.getItem(cacheKey);

            if (!cached) return null;

            const cacheData = JSON.parse(cached);

            if (!ignoreExpiry && cacheData.expireSeconds > 0) {
                const elapsed = (Date.now() - cacheData.timestamp) / 1000;
                if (elapsed > cacheData.expireSeconds) {
                    if (this.instance && this.instance.debugMode) {
                        console.log(`[LocalizationManager] 캐시 만료: ${cacheKey} (${Math.floor(elapsed)}s)`);
                    }
                    return null;
                }
            }

            return { data: cacheData.data, timestamp: cacheData.timestamp };
        } catch (error: any) {
            console.warn('[LocalizationManager] 캐시 로드 실패:', error.message);
            return null;
        }
    }

    public static clearCache(projectId?: string, language?: string): void {
        try {
            if (projectId && language) {
                const cacheKey = this.getCacheKey(projectId, language);
                sys.localStorage.removeItem(cacheKey);
            } else if (projectId) {
                ['ko', 'en', 'cn'].forEach(lang => {
                    const cacheKey = this.getCacheKey(projectId, lang);
                    sys.localStorage.removeItem(cacheKey);
                });
            }

            if (this.instance && this.instance.debugMode) {
                console.log('[LocalizationManager] 캐시 삭제 완료');
            }
        } catch (error: any) {
            console.warn('[LocalizationManager] 캐시 삭제 실패:', error.message);
        }
    }

    public static async refreshFromCDN(language?: string): Promise<CDNLoadResult[]> {
        if (!this.instance) {
            return [];
        }

        const { cdnProjectId } = this.instance;

        if (language) {
            this.clearCache(cdnProjectId, language);
        } else {
            this.clearCache(cdnProjectId);
        }

        if (language) {
            const result = await this.loadFromCDN(language);
            return [result];
        } else {
            return await this.loadAllFromCDN();
        }
    }

    // ========== Static Methods - 버전 관리 ==========

    /**
     * CDN에서 버전 정보 가져오기
     */
    public static async fetchVersion(): Promise<string | null> {
        if (!this.instance) {
            return null;
        }

        const { cdnVersionUrl, cdnProjectId, debugMode } = this.instance;

        if (debugMode) {
            console.log(`[LocalizationManager] 버전 체크: ${cdnVersionUrl}`);
        }

        try {
            const response = await this.fetchWithTimeout(`${cdnVersionUrl}?t=${Date.now()}`, 5000);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const versionData = await response.json();
            const version = versionData[cdnProjectId] || null;

            if (debugMode) {
                console.log(`[LocalizationManager] 서버 버전: ${version}`);
            }

            return version;
        } catch (error: any) {
            console.warn(`[LocalizationManager] 버전 fetch 실패: ${error.message}`);
            return null;
        }
    }

    /**
     * 캐시된 버전 가져오기
     */
    public static getCachedVersion(projectId: string): string | null {
        try {
            const key = `loc_version_${projectId}`;
            return sys.localStorage.getItem(key);
        } catch (error: any) {
            console.warn('[LocalizationManager] 캐시 버전 로드 실패:', error.message);
            return null;
        }
    }

    /**
     * 버전을 캐시에 저장
     */
    public static saveCachedVersion(projectId: string, version: string): void {
        try {
            const key = `loc_version_${projectId}`;
            sys.localStorage.setItem(key, version);

            if (this.instance && this.instance.debugMode) {
                console.log(`[LocalizationManager] 버전 저장: ${version}`);
            }
        } catch (error: any) {
            console.warn('[LocalizationManager] 버전 저장 실패:', error.message);
        }
    }

    /**
     * 버전 체크 후 필요시 로드
     */
    public static async checkVersionAndLoad(language: string): Promise<CDNLoadResult> {
        if (!this.instance) {
            return { success: false, source: 'local', language, keyCount: 0 };
        }

        const { cdnProjectId, debugMode } = this.instance;

        // 1. 서버 버전 가져오기
        const serverVersion = await this.fetchVersion();

        if (!serverVersion) {
            if (debugMode) {
                console.log('[LocalizationManager] 버전 체크 실패 - 캐시 사용');
            }
            return this.loadFromCacheOrFallback(language);
        }

        // 2. 로컬 캐시 버전과 비교
        const cachedVersion = this.getCachedVersion(cdnProjectId);

        if (debugMode) {
            console.log(`[LocalizationManager] 버전 비교 - 서버: ${serverVersion}, 캐시: ${cachedVersion}`);
        }

        // 3. 버전이 같으면 캐시 사용
        if (cachedVersion === serverVersion) {
            const cached = this.loadFromCache(cdnProjectId, language, true);
            if (cached) {
                if (debugMode) {
                    console.log('[LocalizationManager] 버전 동일 - 캐시 사용');
                }

                if (!this._data) {
                    this._data = { ko: {}, en: {}, cn: {} };
                }
                this._data[language] = cached.data;

                return {
                    success: true,
                    source: 'cache',
                    language,
                    keyCount: Object.keys(cached.data).length,
                    version: cachedVersion
                };
            }
        }

        // 4. 버전이 다르면 CDN에서 새로 fetch
        if (debugMode) {
            console.log('[LocalizationManager] 버전 변경 - CDN에서 새로 로드');
        }
        return this.fetchFromCDNWithVersion(language, serverVersion);
    }

    /**
     * 캐시에서 로드하거나 폴백
     */
    private static loadFromCacheOrFallback(language: string): CDNLoadResult {
        if (!this.instance) {
            return { success: false, source: 'local', language, keyCount: 0 };
        }

        const { cdnProjectId, useFallback } = this.instance;

        const cached = this.loadFromCache(cdnProjectId, language, true);
        if (cached) {
            if (!this._data) {
                this._data = { ko: {}, en: {}, cn: {} };
            }
            this._data[language] = cached.data;

            return {
                success: true,
                source: 'cache',
                language,
                keyCount: Object.keys(cached.data).length
            };
        }

        if (useFallback && this._data && this._data[language]) {
            const keyCount = Object.keys(this._data[language]).length;
            return { success: true, source: 'local', language, keyCount };
        }

        return { success: false, source: 'local', language, keyCount: 0 };
    }

    /**
     * CDN에서 직접 fetch (버전 저장 포함)
     */
    private static async fetchFromCDNWithVersion(language: string, serverVersion: string): Promise<CDNLoadResult> {
        if (!this.instance) {
            return { success: false, source: 'local', language, keyCount: 0 };
        }

        const { cdnProjectId, cdnBaseUrl, cacheExpireSeconds, debugMode } = this.instance;

        const url = `${cdnBaseUrl}/${cdnProjectId}/${language}.json`;

        try {
            if (debugMode) {
                console.log(`[LocalizationManager] CDN fetch: ${url}`);
            }

            const response = await this.fetchWithTimeout(url, 10000);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const keyCount = Object.keys(data).length;

            if (!this._data) {
                this._data = { ko: {}, en: {}, cn: {} };
            }
            this._data[language] = data;

            this.saveToCacheWithVersion(cdnProjectId, language, data, serverVersion, cacheExpireSeconds);

            if (debugMode) {
                console.log(`[LocalizationManager] CDN 로드 성공: ${language} (${keyCount}개 키, v${serverVersion})`);
            }

            return {
                success: true,
                source: 'cdn',
                language,
                keyCount,
                version: serverVersion
            };
        } catch (error: any) {
            console.warn(`[LocalizationManager] CDN 로드 실패: ${error.message}`);
            return this.loadFromCacheOrFallback(language);
        }
    }

    /**
     * 캐시에 저장 (버전 포함)
     */
    private static saveToCacheWithVersion(
        projectId: string,
        language: string,
        data: { [key: string]: string },
        version: string,
        expireSeconds: number
    ): void {
        try {
            const cacheKey = this.getCacheKey(projectId, language);
            const cacheData = {
                data,
                version,
                timestamp: Date.now(),
                expireSeconds
            };

            sys.localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            this.saveCachedVersion(projectId, version);

            if (this.instance && this.instance.debugMode) {
                console.log(`[LocalizationManager] 캐시 저장 (v${version}): ${cacheKey}`);
            }
        } catch (error: any) {
            console.warn('[LocalizationManager] 캐시 저장 실패:', error.message);
        }
    }

    // ========== Instance Methods - 라이프사이클 ==========

    onLoad(): void {
        if (LocalizationManager.instance) {
            if (this.debugMode) {
                console.warn('[LocalizationManager] 이미 인스턴스가 존재합니다.');
            }
            this.node.destroy();
            return;
        }

        LocalizationManager.instance = this;

        // 데이터 초기화
        LocalizationManager._data = { ko: {}, en: {}, cn: {} };
        LocalizationManager._imageData = this.imageLocalizationData;
        LocalizationManager._imageBasePath = this.imageBasePath;

        // ========== [CDN 사용으로 비활성화] 로컬 데이터 로드 ==========
        /*
        if (this.loadFromSpreadsheet && this.spreadsheetUrl) {
            this.loadTsvFromSpreadsheet(() => {
                this.afterLocalDataLoaded();
            });
        } else if (this.autoLoadTsvFolder && this.tsvFolderPath) {
            this.loadTsvFromFolder(() => {
                this.afterLocalDataLoaded();
            });
        } else {
            this.afterLocalDataLoaded();
        }
        */
        // CDN만 사용 - 바로 afterLocalDataLoaded 호출
        this.afterLocalDataLoaded();

        game.addPersistRootNode(this.node);

        if (this.autoLocalizeOnSceneLoaded) {
            director.on(Director.EVENT_AFTER_SCENE_LAUNCH, this.onSceneLoaded, this);
        }
    }

    private afterLocalDataLoaded(): void {
        // ========== [CDN 사용으로 비활성화] 로컬 TSV/JSON 파싱 ==========
        /*
        // TSV 파일 파싱
        if (!this.loadFromSpreadsheet && this.localizationTsvFiles && this.localizationTsvFiles.length > 0) {
            this.parseTsvFiles();
        }

        // JSON 파일 병합
        if (this.localizationJsonFiles && this.localizationJsonFiles.length > 0) {
            this.mergeJsonFiles();
        }
        */

        // 저장된 언어 불러오기
        const savedLanguage = sys.localStorage.getItem('game_language');
        if (savedLanguage && LocalizationManager._data![savedLanguage]) {
            LocalizationManager._currentLanguage = savedLanguage;
        } else {
            LocalizationManager._currentLanguage = this.defaultLanguage;
        }

        // CDN 로딩
        if (this.useCDN && this.cdnProjectId) {
            this.initWithCDN();
        } else {
            this.completeInitialization();
        }
    }

    private async initWithCDN(): Promise<void> {
        if (this.debugMode) {
            console.log('[LocalizationManager] CDN 초기화 시작 (버전 체크)...');
            console.log(`  - Project ID: ${this.cdnProjectId}`);
            console.log(`  - Base URL: ${this.cdnBaseUrl}`);
            console.log(`  - Version URL: ${this.cdnVersionUrl}`);
        }

        try {
            const result = await LocalizationManager.checkVersionAndLoad(LocalizationManager._currentLanguage);

            if (this.debugMode) {
                const versionInfo = result.version ? ` (v${result.version})` : '';
                console.log(`[LocalizationManager] CDN 로드 결과: ${result.source} (${result.keyCount}개 키)${versionInfo}`);
            }

            this.completeInitialization();
            this.loadRemainingLanguagesWithVersion();

        } catch (error) {
            console.error('[LocalizationManager] CDN 초기화 실패:', error);
            this.completeInitialization();
        }
    }

    private async loadRemainingLanguages(): Promise<void> {
        const languages = ['ko', 'en', 'cn'];
        const currentLang = LocalizationManager._currentLanguage;

        for (const lang of languages) {
            if (lang !== currentLang) {
                await LocalizationManager.loadFromCDN(lang);
            }
        }

        if (this.debugMode) {
            console.log('[LocalizationManager] 모든 언어 로드 완료');
        }
    }

    private async loadRemainingLanguagesWithVersion(): Promise<void> {
        const languages = ['ko', 'en', 'cn'];
        const currentLang = LocalizationManager._currentLanguage;

        for (const lang of languages) {
            if (lang !== currentLang) {
                await LocalizationManager.checkVersionAndLoad(lang);
            }
        }

        if (this.debugMode) {
            console.log('[LocalizationManager] 모든 언어 로드 완료 (버전 체크)');
        }
    }

    private completeInitialization(): void {
        LocalizationManager._isInitialized = true;

        if (this.debugMode) {
            console.log('[LocalizationManager] 초기화 완료');
            console.log(`  - CDN 사용: ${this.useCDN}`);
            console.log(`  - 현재 언어: ${LocalizationManager._currentLanguage}`);
            console.log(`  - 지원 언어: ${LocalizationManager.getSupportedLanguages().join(', ')}`);

            if (LocalizationManager._data) {
                for (const lang in LocalizationManager._data) {
                    const keyCount = Object.keys(LocalizationManager._data[lang]).length;
                    console.log(`  - ${lang}: ${keyCount}개 키`);
                }
            }
        }

        if (this.autoLocalizeOnStart) {
            this.scheduleOnce(() => {
                LocalizationManager.localizeScene();
            }, 0);
        }
    }

    // ========== TSV/JSON 파싱 메서드 ==========

    private loadTsvFromSpreadsheet(callback?: () => void): void {
        if (!this.spreadsheetUrl || this.spreadsheetUrl.trim() === '') {
            if (callback) callback();
            return;
        }

        let tsvUrl = this.spreadsheetUrl.trim();
        if (tsvUrl.includes('docs.google.com/spreadsheets')) {
            tsvUrl = tsvUrl.replace(/\/edit.*$/, '/export?format=tsv');
            tsvUrl = tsvUrl.replace(/\/view.*$/, '/export?format=tsv');
            if (!tsvUrl.includes('format=')) {
                tsvUrl += (tsvUrl.includes('?') ? '&' : '?') + 'format=tsv';
            }
        }

        fetch(tsvUrl)
            .then(response => response.text())
            .then(tsvContent => {
                this.parseTsvContent(tsvContent);
                if (callback) callback();
            })
            .catch(error => {
                console.error('[LocalizationManager] 스프레드시트 로드 실패:', error);
                if (callback) callback();
            });
    }

    private parseTsvContent(tsvContent: string): void {
        if (!tsvContent || tsvContent.trim() === '') return;

        if (!LocalizationManager._data) {
            LocalizationManager._data = { ko: {}, en: {}, cn: {} };
        }

        const parsedData = this.parseTSV(tsvContent);

        parsedData.forEach((row) => {
            const key = row.Key;
            if (!key || key.startsWith('#')) return;

            const languages = ['Ko', 'En', 'Cn'];
            languages.forEach(lang => {
                const value = row[lang];
                const langKey = lang.toLowerCase();

                if (!LocalizationManager._data![langKey]) {
                    LocalizationManager._data![langKey] = {};
                }

                if (value !== undefined && value !== null && value !== '') {
                    LocalizationManager._data![langKey][key] = value;
                }
            });
        });
    }

    private loadTsvFromFolder(callback?: () => void): void {
        if (!this.tsvFolderPath || this.tsvFolderPath.trim() === '') {
            if (callback) callback();
            return;
        }

        let folderPath = this.tsvFolderPath.trim().replace(/\\/g, '/');
        if (folderPath.endsWith('/')) {
            folderPath = folderPath.slice(0, -1);
        }

        resources.loadDir(folderPath, TextAsset, (err, assets) => {
            if (err || !assets || assets.length === 0) {
                if (callback) callback();
                return;
            }

            assets.forEach((asset: any) => {
                if (asset instanceof TextAsset) {
                    const fileName = asset.name || '';
                    if (fileName.toLowerCase().endsWith('.tsv')) {
                        if (!this.localizationTsvFiles) {
                            this.localizationTsvFiles = [];
                        }
                        this.localizationTsvFiles.push(asset);
                    }
                }
            });

            if (callback) callback();
        });
    }

    private parseTsvFiles(): void {
        if (!LocalizationManager._data) {
            LocalizationManager._data = { ko: {}, en: {}, cn: {} };
        }

        this.localizationTsvFiles.forEach((tsvAsset, index) => {
            if (!tsvAsset || !tsvAsset.text) return;

            const tsvData = this.parseTSV(tsvAsset.text);

            tsvData.forEach((row) => {
                const key = row.Key;
                if (!key || key.startsWith('#')) return;

                const languages = ['Ko', 'En', 'Cn'];
                languages.forEach(lang => {
                    const value = row[lang];
                    const langKey = lang.toLowerCase();

                    if (!LocalizationManager._data![langKey]) {
                        LocalizationManager._data![langKey] = {};
                    }

                    if (value !== undefined && value !== null && value !== '') {
                        LocalizationManager._data![langKey][key] = value;
                    }
                });
            });
        });
    }

    private parseTSV(content: string): any[] {
        const lines = content.split('\n');
        const result: any[] = [];

        if (lines.length === 0) return result;

        const headers = lines[0].split('\t').map(h => h.trim());

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = line.split('\t');
            const row: any = {};

            headers.forEach((header, index) => {
                row[header] = values[index] ? values[index].trim() : '';
            });

            result.push(row);
        }

        return result;
    }

    private mergeJsonFiles(): void {
        if (!LocalizationManager._data) {
            LocalizationManager._data = { ko: {}, en: {}, cn: {} };
        }

        this.localizationJsonFiles.forEach((jsonAsset, index) => {
            if (!jsonAsset || !jsonAsset.json) return;

            const jsonData = jsonAsset.json as LocalizationData;

            for (const lang in jsonData) {
                if (!LocalizationManager._data![lang]) {
                    LocalizationManager._data![lang] = {};
                }

                const langData = jsonData[lang];
                for (const key in langData) {
                    LocalizationManager._data![lang][key] = langData[key];
                }
            }
        });
    }

    start(): void {
        if (this.autoLocalizeOnStart && LocalizationManager._isInitialized) {
            this.scheduleOnce(() => {
                LocalizationManager.localizeScene();
            }, 0);
        }
    }

    private onSceneLoaded(): void {
        if (this.debugMode) {
            console.log('[LocalizationManager] 씬 로드됨 - 자동 로컬라이징 시작');
        }

        this.scheduleOnce(() => {
            LocalizationManager.localizeScene();
        }, 0.1);
    }

    // ========== Static Methods - 이미지 로컬라이징 ==========

    public static localizeSprite(sprite: Sprite, key: string, prefix?: string): void {
        if (!sprite || !key) return;
        if (!this.ensureInitialized()) return;
        if (!this._imageData) return;

        const keyPrefix = prefix || "@img:";
        let imageKey = key;

        if (key.indexOf(keyPrefix) === 0) {
            imageKey = key.substring(keyPrefix.length);
        }

        (sprite as any)._localizationImageKey = imageKey;
        this.loadLocalizedSprite(sprite, imageKey);
    }

    private static loadLocalizedSprite(sprite: Sprite, key: string): void {
        if (!this._imageData) return;

        const currentLang = this._currentLanguage;
        const imagePath = this._imageData[currentLang]?.[key];

        if (!imagePath) return;

        const basePath = this._imageBasePath || "";
        const fullPath = basePath ? `${basePath}/${imagePath}` : imagePath;

        resources.load(fullPath, SpriteFrame, (err, spriteFrame) => {
            if (err) return;
            if (sprite && sprite.isValid) {
                sprite.spriteFrame = spriteFrame;
            }
        });
    }

    public static updateAllLocalizedSprites(): void {
        if (!this.ensureInitialized()) return;
        if (!this._imageData) return;

        const canvas = find("Canvas");
        if (!canvas) return;

        this.updateNodeSprites(canvas);
    }

    private static updateNodeSprites(node: Node): number {
        if (!node || !node.isValid) return 0;

        let count = 0;

        const sprite = node.getComponent(Sprite);
        if (sprite && (sprite as any)._localizationImageKey) {
            const key = (sprite as any)._localizationImageKey;
            this.loadLocalizedSprite(sprite, key);
            count++;
        }

        for (let i = 0; i < node.children.length; i++) {
            count += this.updateNodeSprites(node.children[i]);
        }

        return count;
    }

    onDestroy(): void {
        director.off(Director.EVENT_AFTER_SCENE_LAUNCH, this.onSceneLoaded, this);

        if (LocalizationManager.instance === this) {
            LocalizationManager.instance = null;
            LocalizationManager._isInitialized = false;
        }
    }
}
