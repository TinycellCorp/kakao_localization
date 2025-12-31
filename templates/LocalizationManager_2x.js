// LocalizationManager.js (Cocos Creator 2.x)
var LocalizationManager = cc.Class({
  extends: cc.Component,
  
  properties: {
    localizationJsonFiles: {
      default: [],
      type: [cc.JsonAsset],
      tooltip: "다국어 JSON 파일 배열 (여러 파일 가능)"
    },
    
    localizationTsvFiles: {
      default: [],
      type: [cc.TextAsset],
      tooltip: "다국어 TSV 파일 배열 (수동 지정, 스프레드시트와 함께 사용 가능)"
    },
    
    // [CDN 사용으로 비활성화] 스프레드시트 로드
    loadFromSpreadsheet: {
      default: false,
      tooltip: "[비활성화됨 - CDN 사용] 스프레드시트에서 로드할지 여부"
    },
    
    spreadsheetUrl: {
      default: "",
      tooltip: "스프레드시트 URL (Google Sheets 공개 URL, TSV 형식으로 내보내기)"
    },
    
    spreadsheetSheetIds: {
      default: [],
      type: [cc.String],
      tooltip: "로드할 시트 ID 목록 (비어있으면 URL의 gid만 사용, 여러 시트를 모두 로드하려면 각 시트의 gid를 추가)"
    },
    
    tsvFolderPath: {
      default: "Localize",
      tooltip: "TSV 파일 폴더 경로 (resources 폴더 기준, 예: 'Localize') - TSV 파일을 JSON으로 변환하여 로드"
    },
    
    // [CDN 사용으로 비활성화] TSV 폴더 자동 로드
    autoLoadTsvFolder: {
      default: false,
      tooltip: "[비활성화됨 - CDN 사용] TSV 폴더 자동 로드 사용 여부"
    },
    
    defaultLanguage: {
      default: "ko",
      tooltip: "기본 언어 (ko, en, cn)"
    },
    
    autoLocalizeOnStart: {
      default: true,
      tooltip: "시작 시 자동 로컬라이징"
    },
    
    autoLocalizeOnSceneLoaded: {
      default: true,
      tooltip: "씬 로드 시 자동 로컬라이징"
    },
    
    keyPrefix: {
      default: "@",
      tooltip: "로컬라이징 키 접두사"
    },
    
    debugMode: {
      default: false,
      tooltip: "디버그 모드"
    },
    
    warnOnDuplicate: {
      default: true,
      tooltip: "중복 키 경고"
    },

    // ========== CDN Properties ==========

    useCDN: {
      default: true,
      tooltip: "CDN에서 로컬라이징 로드 사용"
    },

    cdnProjectId: {
      default: "NEW_PROJECT_ID",
      tooltip: "CDN 프로젝트 ID"
    },

    cdnBaseUrl: {
      default: "https://raw.githubusercontent.com/TinycellCorp/kakao_localization/main",
      tooltip: "CDN 베이스 URL"
    },

    useFallback: {
      default: true,
      tooltip: "CDN 실패 시 로컬 폴백 사용"
    },

    useCache: {
      default: true,
      tooltip: "CDN 캐시 사용 (LocalStorage)"
    },

    cacheExpireSeconds: {
      default: 3600,
      tooltip: "CDN 캐시 만료 시간 (초, 0=무제한)"
    },

    cdnVersionUrl: {
      default: "https://raw.githubusercontent.com/TinycellCorp/kakao_localization/main/version.json",
      tooltip: "CDN 버전 파일 URL"
    }
  },
  
  statics: {
    instance: null,
    _currentLanguage: "ko",
    _data: null,
    _isInitialized: false,
    _initCallbacks: [], // 초기화 완료 대기 콜백 배열
    
    // ========== 초기화 체크 ==========
    
    ensureInitialized: function() {
      if (!this._isInitialized || !this._data) {
        console.warn('[LocalizationManager] 아직 초기화되지 않았습니다.');
        return false;
      }
      return true;
    },
    
    /**
     * 초기화 완료를 대기하는 메서드
     * 이미 초기화되었으면 즉시 콜백 호출, 아니면 초기화 완료 후 호출
     * @param {function} callback - 초기화 완료 후 호출할 콜백 함수
     * @example
     * LocalizationManager.waitForInitialization(function() {
     *   console.log('로컬라이징 초기화 완료!');
     *   // 다음 단계 진행
     * });
     */
    waitForInitialization: function(callback) {
      if (!callback || typeof callback !== 'function') {
        console.warn('[LocalizationManager] waitForInitialization: 유효하지 않은 콜백 함수');
        return;
      }
      
      // 이미 초기화되었으면 즉시 콜백 호출
      if (this._isInitialized && this._data) {
        if (this.instance && this.instance.debugMode) {
          console.log('[LocalizationManager] 이미 초기화되어 있음 - 즉시 콜백 호출');
        }
        callback();
        return;
      }
      
      // 초기화 대기 중이면 콜백을 배열에 추가
      this._initCallbacks.push(callback);
      
      if (this.instance && this.instance.debugMode) {
        console.log('[LocalizationManager] 초기화 대기 콜백 등록 (대기 중: ' + this._initCallbacks.length + '개)');
      }
    },
    
    // ========== 텍스트 가져오기 ==========
    
    getText: function(key) {
      if (!this.ensureInitialized()) return key;      
      
      if (key.includes('@')) {
        key = key.replace('@', '');
      }

      var text = this._data[this._currentLanguage][key];

      if (!text) {
        if (this.instance && this.instance.debugMode) {
          console.warn('[LocalizationManager] 키를 찾을 수 없습니다:', key);
        }
        return key;
      }
      
      text = text.replace(/\\n/g, '\n');
      text = text.replace(/\\s/g, ' ');
      return text;
    },

    getTextWithArgs: function(key) {
      if(key.includes('@')){
        key = key.replace('@', '');
      }
      
      var text = this.getText(key);
      
      for (var i = 1; i < arguments.length; i++) {
        text = text.replace('{' + (i - 1) + '}', arguments[i]);
      }
      
      return text;
    },
    
    // ========== Label 로컬라이징 ==========
    
    localizeLabel: function(label, prefix) {
      if (!label || !label.string) return false;
      if (!this.ensureInitialized()) return false;
      
      var text = label.string.trim();
      var keyPrefix = prefix || (this.instance ? this.instance.keyPrefix : "@");
      
      if (text.indexOf(keyPrefix) === 0) {
        var key = text.substring(keyPrefix.length);
        var localizedText = this.getText(key);
        
        label.string = localizedText;
        label._localizationKey = key;
        
        return true;
      }
      
      return false;
    },
    
    localizeNode: function(node, prefix) {
      if (!node || !node.isValid) return 0;
      if (!this.ensureInitialized()) return 0;
      
      var count = 0;
      var keyPrefix = prefix || (this.instance ? this.instance.keyPrefix : "@");
      
      var label = node.getComponent(cc.Label);
      if (label && this.localizeLabel(label, keyPrefix)) {
        count++;
      }
      
      for (var i = 0; i < node.children.length; i++) {
        count += this.localizeNode(node.children[i], keyPrefix);
      }
      
      return count;
    },
    
    localizeScene: function() {
      if (!this.ensureInitialized()) return 0;
      
      var canvas = cc.find("Canvas");
      if (!canvas) {
        if (this.instance && this.instance.debugMode) {
          console.warn('[LocalizationManager] Canvas를 찾을 수 없습니다.');
        }
        return 0;
      }
      
      var startTime = Date.now();
      var count = this.localizeNode(canvas);
      var elapsed = Date.now() - startTime;
      
      if (this.instance && this.instance.debugMode) {
        console.log('[LocalizationManager] ' + count + '개 Label 로컬라이징 (' + elapsed + 'ms)');
      }
      
      return count;
    },
    
    // ========== 프리펩 인스턴스화 헬퍼 ==========
    
    /**
     * 프리펩을 인스턴스화하고 자동으로 로컬라이징
     * @param {cc.Prefab} prefab - 프리펩
     * @returns {cc.Node} 생성된 노드
     */
    instantiatePrefab: function(prefab) {
      if (!prefab) {
        console.error('[LocalizationManager] prefab이 null입니다.');
        return null;
      }
      
      var node = cc.instantiate(prefab);
      
      // 생성 즉시 로컬라이징
      this.localizeNode(node);
      
      return node;
    },
    
    /**
     * 노드를 부모에 추가하고 자동으로 로컬라이징
     * @param {cc.Node} node - 추가할 노드
     * @param {cc.Node} parent - 부모 노드
     */
    addChildWithLocalization: function(node, parent) {
      if (!node || !parent) return;
      
      parent.addChild(node);
      
      // 추가 후 로컬라이징
      this.localizeNode(node);
    },
    
    // ========== 언어 변경 ==========
    
    setLanguage: function(language) {
      if (!this.ensureInitialized()) return;
      
      if (this._currentLanguage === language) return;

      if (!this._data || !this._data[language]) {
        console.error('[LocalizationManager] ' + language + ' 데이터가 없습니다.');
        return;
      }
      
      this._currentLanguage = language;
      
      this.updateAllLocalizedLabels();
      
      // Hi5 SDK 사용 시 Hi5 SDK에 저장
      if (window['Hi5'] && window['Hi5'].setItem) {
        window['Hi5'].setItem('game_language', language, true);
        if (window['Hi5'].SaveData && typeof window['Hi5'].SaveData === 'function') {
          window['Hi5'].SaveData();
        }
      } else {
        // Hi5 SDK가 없을 때는 localStorage 사용 (fallback)
        cc.sys.localStorage.setItem('game_language', language);
      }
      
      console.log('[LocalizationManager] 언어 변경:', language);
    },
    
    updateAllLocalizedLabels: function() {
      var canvas = cc.find("Canvas");
      if (!canvas) return;
      
      var startTime = Date.now();
      var count = this.updateNodeLabels(canvas);
      var elapsed = Date.now() - startTime;
      
      if (this.instance && this.instance.debugMode) {
        console.log('[LocalizationManager] ' + count + '개 Label 업데이트 (' + elapsed + 'ms)');
      }
    },
    
    updateNodeLabels: function(node) {
      if (!node || !node.isValid) return 0;
      
      var count = 0;
      
      var label = node.getComponent(cc.Label);
      if (label && label._localizationKey) {
        label.string = this.getText(label._localizationKey);
        count++;
      }
      
      for (var i = 0; i < node.children.length; i++) {
        count += this.updateNodeLabels(node.children[i]);
      }
      
      return count;
    },
    
    getLanguage: function() {
      return this._currentLanguage;
    },
    
    getSupportedLanguages: function() {
      if (!this._data) return [];
      return Object.keys(this._data);
    },
    
    // ========== 동적 JSON 추가 ==========
    
    /**
     * 런타임에 JSON 데이터 추가
     * @param {object} jsonData - 추가할 JSON 데이터
     * @param {boolean} overwrite - 기존 키 덮어쓰기 여부
     * 
     * @example
     * LocalizationManager.addJsonData({
     *   ko: { "custom.key": "커스텀 텍스트" },
     *   en: { "custom.key": "Custom Text" }
     * });
     */
    addJsonData: function(jsonData, overwrite) {
      if (!jsonData) return;
      
      overwrite = overwrite !== undefined ? overwrite : false;
      
      if (!this._data) {
        this._data = {
          ko: {},
          en: {},
          cn: {}
        };
      }
      
      for (var lang in jsonData) {
        if (!this._data[lang]) {
          this._data[lang] = {};
        }
        
        var langData = jsonData[lang];
        for (var key in langData) {
          // 덮어쓰기 모드가 아니고 키가 이미 존재하면 스킵
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
    },
    
    /**
     * JsonAsset을 런타임에 병합
     * @param {cc.JsonAsset} jsonAsset - 추가할 JsonAsset
     * @param {boolean} overwrite - 기존 키 덮어쓰기
     */
    mergeJsonAsset: function(jsonAsset, overwrite) {
      if (!jsonAsset || !jsonAsset.json) {
        console.error('[LocalizationManager] 유효하지 않은 JsonAsset');
        return;
      }

      this.addJsonData(jsonAsset.json, overwrite);
    },

    // ========== CDN 로딩 ==========

    /**
     * CDN에서 로컬라이징 JSON 로드
     * @param {string} language - 언어 코드 (ko, en, cn)
     * @param {function} callback - 완료 콜백 (result 객체 전달)
     */
    loadFromCDN: function(language, callback) {
      var self = this;

      if (!this.instance) {
        console.error('[LocalizationManager] 인스턴스가 없습니다.');
        if (callback) callback({ success: false, source: 'local', language: language, keyCount: 0 });
        return;
      }

      var inst = this.instance;
      var cdnProjectId = inst.cdnProjectId;
      var cdnBaseUrl = inst.cdnBaseUrl;
      var useCache = inst.useCache;
      var useFallback = inst.useFallback;
      var cacheExpireSeconds = inst.cacheExpireSeconds;
      var debugMode = inst.debugMode;

      if (!cdnProjectId) {
        console.error('[LocalizationManager] cdnProjectId가 설정되지 않았습니다.');
        if (callback) callback({ success: false, source: 'local', language: language, keyCount: 0 });
        return;
      }

      // 캐시 먼저 확인
      if (useCache) {
        var cached = this.loadFromCache(cdnProjectId, language, false);
        if (cached) {
          if (debugMode) {
            console.log('[LocalizationManager] 캐시에서 로드: ' + language);
          }

          if (!this._data) {
            this._data = { ko: {}, en: {}, cn: {} };
          }
          this._data[language] = cached.data;

          if (callback) callback({
            success: true,
            source: 'cache',
            language: language,
            keyCount: Object.keys(cached.data).length
          });
          return;
        }
      }

      // CDN에서 가져오기
      var url = cdnBaseUrl + '/' + cdnProjectId + '/' + language + '.json';

      if (debugMode) {
        console.log('[LocalizationManager] CDN 로드 시도: ' + url);
      }

      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.timeout = 10000;

      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            try {
              var data = JSON.parse(xhr.responseText);
              var keyCount = Object.keys(data).length;

              if (!self._data) {
                self._data = { ko: {}, en: {}, cn: {} };
              }
              self._data[language] = data;

              // 캐시에 저장
              if (useCache) {
                self.saveToCache(cdnProjectId, language, data, cacheExpireSeconds);
              }

              if (debugMode) {
                console.log('[LocalizationManager] CDN 로드 성공: ' + language + ' (' + keyCount + '개 키)');
              }

              if (callback) callback({ success: true, source: 'cdn', language: language, keyCount: keyCount });
            } catch (e) {
              console.error('[LocalizationManager] JSON 파싱 실패:', e);
              self.handleCDNError(language, cdnProjectId, useCache, useFallback, callback);
            }
          } else {
            console.warn('[LocalizationManager] CDN 로드 실패: HTTP ' + xhr.status);
            self.handleCDNError(language, cdnProjectId, useCache, useFallback, callback);
          }
        }
      };

      xhr.onerror = function() {
        console.warn('[LocalizationManager] CDN 로드 실패: 네트워크 오류');
        self.handleCDNError(language, cdnProjectId, useCache, useFallback, callback);
      };

      xhr.ontimeout = function() {
        console.warn('[LocalizationManager] CDN 로드 실패: 타임아웃');
        self.handleCDNError(language, cdnProjectId, useCache, useFallback, callback);
      };

      xhr.send();
    },

    /**
     * CDN 로드 실패 시 폴백 처리
     */
    handleCDNError: function(language, cdnProjectId, useCache, useFallback, callback) {
      // 폴백: 만료된 캐시라도 사용
      if (useCache) {
        var expiredCache = this.loadFromCache(cdnProjectId, language, true);
        if (expiredCache) {
          console.log('[LocalizationManager] 만료된 캐시 사용: ' + language);

          if (!this._data) {
            this._data = { ko: {}, en: {}, cn: {} };
          }
          this._data[language] = expiredCache.data;

          if (callback) callback({
            success: true,
            source: 'cache',
            language: language,
            keyCount: Object.keys(expiredCache.data).length
          });
          return;
        }
      }

      // 폴백: 로컬 파일 사용
      if (useFallback && this._data && this._data[language]) {
        var keyCount = Object.keys(this._data[language]).length;
        console.log('[LocalizationManager] 로컬 폴백 사용: ' + language + ' (' + keyCount + '개 키)');

        if (callback) callback({ success: true, source: 'local', language: language, keyCount: keyCount });
        return;
      }

      if (callback) callback({ success: false, source: 'local', language: language, keyCount: 0 });
    },

    /**
     * 모든 언어를 CDN에서 로드
     */
    loadAllFromCDN: function(callback) {
      var self = this;
      var languages = ['ko', 'en', 'cn'];
      var results = [];
      var index = 0;

      function loadNext() {
        if (index >= languages.length) {
          if (callback) callback(results);
          return;
        }

        self.loadFromCDN(languages[index], function(result) {
          results.push(result);
          index++;
          loadNext();
        });
      }

      loadNext();
    },

    // ========== 캐시 관리 ==========

    /**
     * 캐시 키 생성
     */
    getCacheKey: function(projectId, language) {
      return 'loc_' + projectId + '_' + language;
    },

    /**
     * 캐시에 저장
     */
    saveToCache: function(projectId, language, data, expireSeconds) {
      try {
        var cacheKey = this.getCacheKey(projectId, language);
        var cacheData = {
          data: data,
          timestamp: Date.now(),
          expireSeconds: expireSeconds
        };

        cc.sys.localStorage.setItem(cacheKey, JSON.stringify(cacheData));

        if (this.instance && this.instance.debugMode) {
          console.log('[LocalizationManager] 캐시 저장: ' + cacheKey);
        }
      } catch (e) {
        console.warn('[LocalizationManager] 캐시 저장 실패:', e);
      }
    },

    /**
     * 캐시에서 로드
     */
    loadFromCache: function(projectId, language, ignoreExpiry) {
      try {
        var cacheKey = this.getCacheKey(projectId, language);
        var cached = cc.sys.localStorage.getItem(cacheKey);

        if (!cached) return null;

        var cacheData = JSON.parse(cached);

        // 만료 체크
        if (!ignoreExpiry && cacheData.expireSeconds > 0) {
          var elapsed = (Date.now() - cacheData.timestamp) / 1000;
          if (elapsed > cacheData.expireSeconds) {
            if (this.instance && this.instance.debugMode) {
              console.log('[LocalizationManager] 캐시 만료: ' + cacheKey + ' (' + Math.floor(elapsed) + 's)');
            }
            return null;
          }
        }

        return { data: cacheData.data, timestamp: cacheData.timestamp };
      } catch (e) {
        console.warn('[LocalizationManager] 캐시 로드 실패:', e);
        return null;
      }
    },

    /**
     * 캐시 삭제
     */
    clearCache: function(projectId, language) {
      try {
        if (projectId && language) {
          var cacheKey = this.getCacheKey(projectId, language);
          cc.sys.localStorage.removeItem(cacheKey);
        } else if (projectId) {
          var languages = ['ko', 'en', 'cn'];
          for (var i = 0; i < languages.length; i++) {
            var key = this.getCacheKey(projectId, languages[i]);
            cc.sys.localStorage.removeItem(key);
          }
        }

        if (this.instance && this.instance.debugMode) {
          console.log('[LocalizationManager] 캐시 삭제 완료');
        }
      } catch (e) {
        console.warn('[LocalizationManager] 캐시 삭제 실패:', e);
      }
    },

    /**
     * CDN에서 새로고침 (캐시 무시하고 다시 로드)
     */
    refreshFromCDN: function(language, callback) {
      if (!this.instance) {
        if (callback) callback([]);
        return;
      }

      var cdnProjectId = this.instance.cdnProjectId;

      // 캐시 삭제
      if (language) {
        this.clearCache(cdnProjectId, language);
      } else {
        this.clearCache(cdnProjectId);
      }

      // 다시 로드
      if (language) {
        this.loadFromCDN(language, function(result) {
          if (callback) callback([result]);
        });
      } else {
        this.loadAllFromCDN(callback);
      }
    },

    // ========== 버전 관리 ==========

    /**
     * CDN에서 버전 정보 가져오기
     * @param {function} callback - (version: string | null) 콜백
     */
    fetchVersion: function(callback) {
      if (!this.instance) {
        if (callback) callback(null);
        return;
      }

      var cdnVersionUrl = this.instance.cdnVersionUrl;
      var cdnProjectId = this.instance.cdnProjectId;
      var debugMode = this.instance.debugMode;

      if (debugMode) {
        console.log('[LocalizationManager] 버전 체크: ' + cdnVersionUrl);
      }

      var xhr = new XMLHttpRequest();
      xhr.open('GET', cdnVersionUrl + '?t=' + Date.now(), true); // 캐시 방지
      xhr.timeout = 5000;

      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            try {
              var versionData = JSON.parse(xhr.responseText);
              var version = versionData[cdnProjectId] || null;

              if (debugMode) {
                console.log('[LocalizationManager] 서버 버전: ' + version);
              }

              if (callback) callback(version);
            } catch (e) {
              console.warn('[LocalizationManager] 버전 파싱 실패:', e);
              if (callback) callback(null);
            }
          } else {
            console.warn('[LocalizationManager] 버전 fetch 실패: HTTP ' + xhr.status);
            if (callback) callback(null);
          }
        }
      };

      xhr.onerror = function() {
        console.warn('[LocalizationManager] 버전 fetch 실패: 네트워크 오류');
        if (callback) callback(null);
      };

      xhr.ontimeout = function() {
        console.warn('[LocalizationManager] 버전 fetch 실패: 타임아웃');
        if (callback) callback(null);
      };

      xhr.send();
    },

    /**
     * 캐시된 버전 가져오기
     * @param {string} projectId - 프로젝트 ID
     * @returns {string | null} 캐시된 버전
     */
    getCachedVersion: function(projectId) {
      try {
        var key = 'loc_version_' + projectId;
        return cc.sys.localStorage.getItem(key);
      } catch (e) {
        console.warn('[LocalizationManager] 캐시 버전 로드 실패:', e);
        return null;
      }
    },

    /**
     * 버전을 캐시에 저장
     * @param {string} projectId - 프로젝트 ID
     * @param {string} version - 저장할 버전
     */
    saveCachedVersion: function(projectId, version) {
      try {
        var key = 'loc_version_' + projectId;
        cc.sys.localStorage.setItem(key, version);

        if (this.instance && this.instance.debugMode) {
          console.log('[LocalizationManager] 버전 저장: ' + version);
        }
      } catch (e) {
        console.warn('[LocalizationManager] 버전 저장 실패:', e);
      }
    },

    /**
     * 버전 체크 후 필요시 로드
     * @param {string} language - 언어 코드
     * @param {function} callback - 완료 콜백
     */
    checkVersionAndLoad: function(language, callback) {
      var self = this;

      if (!this.instance) {
        if (callback) callback({ success: false, source: 'local', language: language, keyCount: 0 });
        return;
      }

      var inst = this.instance;
      var cdnProjectId = inst.cdnProjectId;
      var debugMode = inst.debugMode;

      // 1. 서버 버전 가져오기
      this.fetchVersion(function(serverVersion) {
        // 버전 fetch 실패 시 캐시 사용
        if (!serverVersion) {
          if (debugMode) {
            console.log('[LocalizationManager] 버전 체크 실패 - 캐시 사용');
          }
          self.loadFromCacheOrFallback(language, callback);
          return;
        }

        // 2. 로컬 캐시 버전과 비교
        var cachedVersion = self.getCachedVersion(cdnProjectId);

        if (debugMode) {
          console.log('[LocalizationManager] 버전 비교 - 서버: ' + serverVersion + ', 캐시: ' + cachedVersion);
        }

        // 3. 버전이 같으면 캐시 사용
        if (cachedVersion === serverVersion) {
          var cached = self.loadFromCache(cdnProjectId, language, true); // 만료 무시
          if (cached) {
            if (debugMode) {
              console.log('[LocalizationManager] 버전 동일 - 캐시 사용');
            }

            if (!self._data) {
              self._data = { ko: {}, en: {}, cn: {} };
            }
            self._data[language] = cached.data;

            if (callback) callback({
              success: true,
              source: 'cache',
              language: language,
              keyCount: Object.keys(cached.data).length,
              version: cachedVersion
            });
            return;
          }
        }

        // 4. 버전이 다르면 CDN에서 새로 fetch
        if (debugMode) {
          console.log('[LocalizationManager] 버전 변경 - CDN에서 새로 로드');
        }
        self.fetchFromCDN(language, serverVersion, callback);
      });
    },

    /**
     * 캐시에서 로드하거나 폴백
     */
    loadFromCacheOrFallback: function(language, callback) {
      if (!this.instance) {
        if (callback) callback({ success: false, source: 'local', language: language, keyCount: 0 });
        return;
      }

      var cdnProjectId = this.instance.cdnProjectId;
      var useFallback = this.instance.useFallback;

      // 캐시에서 로드 (만료 무시)
      var cached = this.loadFromCache(cdnProjectId, language, true);
      if (cached) {
        if (!this._data) {
          this._data = { ko: {}, en: {}, cn: {} };
        }
        this._data[language] = cached.data;

        if (callback) callback({
          success: true,
          source: 'cache',
          language: language,
          keyCount: Object.keys(cached.data).length
        });
        return;
      }

      // 로컬 폴백
      if (useFallback && this._data && this._data[language]) {
        var keyCount = Object.keys(this._data[language]).length;
        if (callback) callback({ success: true, source: 'local', language: language, keyCount: keyCount });
        return;
      }

      if (callback) callback({ success: false, source: 'local', language: language, keyCount: 0 });
    },

    /**
     * CDN에서 직접 fetch (버전 저장 포함)
     */
    fetchFromCDN: function(language, serverVersion, callback) {
      var self = this;

      if (!this.instance) {
        if (callback) callback({ success: false, source: 'local', language: language, keyCount: 0 });
        return;
      }

      var inst = this.instance;
      var cdnProjectId = inst.cdnProjectId;
      var cdnBaseUrl = inst.cdnBaseUrl;
      var cacheExpireSeconds = inst.cacheExpireSeconds;
      var debugMode = inst.debugMode;
      var useFallback = inst.useFallback;

      var url = cdnBaseUrl + '/' + cdnProjectId + '/' + language + '.json';

      if (debugMode) {
        console.log('[LocalizationManager] CDN fetch: ' + url);
      }

      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.timeout = 10000;

      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            try {
              var data = JSON.parse(xhr.responseText);
              var keyCount = Object.keys(data).length;

              if (!self._data) {
                self._data = { ko: {}, en: {}, cn: {} };
              }
              self._data[language] = data;

              // 캐시에 저장 (버전 포함)
              self.saveToCacheWithVersion(cdnProjectId, language, data, serverVersion, cacheExpireSeconds);

              if (debugMode) {
                console.log('[LocalizationManager] CDN 로드 성공: ' + language + ' (' + keyCount + '개 키, v' + serverVersion + ')');
              }

              if (callback) callback({
                success: true,
                source: 'cdn',
                language: language,
                keyCount: keyCount,
                version: serverVersion
              });
            } catch (e) {
              console.error('[LocalizationManager] JSON 파싱 실패:', e);
              self.loadFromCacheOrFallback(language, callback);
            }
          } else {
            console.warn('[LocalizationManager] CDN 로드 실패: HTTP ' + xhr.status);
            self.loadFromCacheOrFallback(language, callback);
          }
        }
      };

      xhr.onerror = function() {
        console.warn('[LocalizationManager] CDN 로드 실패: 네트워크 오류');
        self.loadFromCacheOrFallback(language, callback);
      };

      xhr.ontimeout = function() {
        console.warn('[LocalizationManager] CDN 로드 실패: 타임아웃');
        self.loadFromCacheOrFallback(language, callback);
      };

      xhr.send();
    },

    /**
     * 캐시에 저장 (버전 포함)
     */
    saveToCacheWithVersion: function(projectId, language, data, version, expireSeconds) {
      try {
        // 데이터 저장
        var cacheKey = this.getCacheKey(projectId, language);
        var cacheData = {
          data: data,
          version: version,
          timestamp: Date.now(),
          expireSeconds: expireSeconds
        };

        cc.sys.localStorage.setItem(cacheKey, JSON.stringify(cacheData));

        // 버전 저장
        this.saveCachedVersion(projectId, version);

        if (this.instance && this.instance.debugMode) {
          console.log('[LocalizationManager] 캐시 저장 (v' + version + '): ' + cacheKey);
        }
      } catch (e) {
        console.warn('[LocalizationManager] 캐시 저장 실패:', e);
      }
    }
  },
  
  // ========== 라이프사이클 ==========
  
  onLoad: function() {
    var self = this;
    
    if (LocalizationManager.instance) {
      if (this.debugMode) {
        console.warn('[LocalizationManager] 이미 인스턴스가 존재합니다.');
      }
      this.node.destroy();
      return;
    }
    
    LocalizationManager.instance = this;
    
    // ========== 데이터 초기화 ==========
    LocalizationManager._data = {
      ko: {},
      en: {},
      cn: {}
    };
    
    // ========== [CDN 사용으로 비활성화] 로컬 데이터 로드 ==========
    /*
    if (this.loadFromSpreadsheet && this.spreadsheetUrl) {
      // 스프레드시트에서 TSV 데이터 가져오기
      this.loadTsvFromSpreadsheet(function() {
        self.finishInitialization();
      });
    } else {
      // ========== TSV 폴더 자동 로드 (JSON으로 변환하여 로드) ==========
      if (this.autoLoadTsvFolder && this.tsvFolderPath) {
        // 비동기 로드이므로 콜백에서 초기화 완료 처리
        this.loadTsvFromFolderAsJson(function() {
          self.finishInitialization();
        });
      } else {
        // TSV 폴더 자동 로드가 아닌 경우 바로 초기화 완료
        self.finishInitialization();
      }
    }
    */
    // CDN만 사용 - 바로 초기화 진행
    self.finishInitialization();
    
    // 씬 전환 시에도 유지
    cc.game.addPersistRootNode(this.node);
    
    // 씬 로드 이벤트 리스너 등록
    if (this.autoLocalizeOnSceneLoaded) {
      cc.director.on(cc.Director.EVENT_AFTER_SCENE_LAUNCH, this.onSceneLoaded, this);
    }
  },
  
  // ========== 스프레드시트에서 TSV 로드 ==========
  
  /**
   * 스프레드시트 URL에서 TSV 데이터를 가져와서 파싱 (여러 시트 지원)
   * @param {function} callback - 로드 완료 후 호출할 콜백 함수
   */
  loadTsvFromSpreadsheet: function(callback) {
    var self = this;
    
    if (!this.spreadsheetUrl || this.spreadsheetUrl.trim() === '') {
      console.error('[LocalizationManager] 스프레드시트 URL이 지정되지 않았습니다.');
      if (callback) callback();
      return;
    }
    
    // 스프레드시트 ID 추출
    var spreadsheetId = this.extractSpreadsheetId(this.spreadsheetUrl);
    if (!spreadsheetId) {
      console.error('[LocalizationManager] 스프레드시트 ID를 추출할 수 없습니다.');
      if (callback) callback();
      return;
    }
    
    // 시트 ID 목록 가져오기
    var sheetIds = this.getSheetIds();
    
    if (this.debugMode) {
      console.log('[LocalizationManager] 스프레드시트에서 TSV 로드 시작');
      console.log('  - 스프레드시트 ID: ' + spreadsheetId);
      console.log('  - 시트 개수: ' + sheetIds.length);
      for (var i = 0; i < sheetIds.length; i++) {
        console.log('    [' + (i + 1) + '] 시트 ID: ' + sheetIds[i]);
      }
    }
    
    // 여러 시트를 순차적으로 로드
    this.loadMultipleSheets(spreadsheetId, sheetIds, 0, callback);
  },
  
  /**
   * URL에서 스프레드시트 ID 추출
   * @param {string} url - Google Sheets URL
   * @returns {string} 스프레드시트 ID
   */
  extractSpreadsheetId: function(url) {
    // https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit#gid={SHEET_ID}
    var match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return null;
  },
  
  /**
   * 로드할 시트 ID 목록 가져오기
   * @returns {Array} 시트 ID 배열
   */
  getSheetIds: function() {
    var sheetIds = [];
    
    // spreadsheetSheetIds가 지정되어 있으면 사용
    if (this.spreadsheetSheetIds && this.spreadsheetSheetIds.length > 0) {
      for (var i = 0; i < this.spreadsheetSheetIds.length; i++) {
        var sheetId = this.spreadsheetSheetIds[i];
        if (sheetId && sheetId.trim() !== '') {
          sheetIds.push(sheetId.trim());
        }
      }
    }
    
    // spreadsheetSheetIds가 비어있으면 URL에서 gid 추출
    if (sheetIds.length === 0) {
      var url = this.spreadsheetUrl.trim();
      var gidMatch = url.match(/[#&]gid=([0-9]+)/);
      if (gidMatch && gidMatch[1]) {
        sheetIds.push(gidMatch[1]);
      } else {
        // gid가 없으면 기본 시트(0) 사용
        sheetIds.push('0');
      }
    }
    
    return sheetIds;
  },
  
  /**
   * 여러 시트를 순차적으로 로드
   * @param {string} spreadsheetId - 스프레드시트 ID
   * @param {Array} sheetIds - 시트 ID 배열
   * @param {number} index - 현재 로드 중인 시트 인덱스
   * @param {function} callback - 모든 시트 로드 완료 후 호출할 콜백
   */
  loadMultipleSheets: function(spreadsheetId, sheetIds, index, callback) {
    var self = this;
    
    // 모든 시트를 로드했으면 콜백 호출
    if (index >= sheetIds.length) {
      if (this.debugMode) {
        console.log('[LocalizationManager] 모든 시트 로드 완료 (' + sheetIds.length + '개)');
      }
      if (callback) callback();
      return;
    }
    
    var sheetId = sheetIds[index];
    var tsvUrl = 'https://docs.google.com/spreadsheets/d/' + spreadsheetId + '/export?format=tsv&gid=' + sheetId;
    
    if (this.debugMode) {
      console.log('[LocalizationManager] 시트 로드 중 [' + (index + 1) + '/' + sheetIds.length + ']: gid=' + sheetId);
    }
    
    // XMLHttpRequest로 TSV 데이터 가져오기
    var xhr = new XMLHttpRequest();
    xhr.open('GET', tsvUrl, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          var tsvContent = xhr.responseText;
          
          if (!tsvContent || tsvContent.trim() === '') {
            if (self.debugMode) {
              console.warn('[LocalizationManager] 시트 ' + sheetId + '에서 빈 데이터를 받았습니다.');
            }
            // 빈 데이터여도 다음 시트로 진행
            self.loadMultipleSheets(spreadsheetId, sheetIds, index + 1, callback);
            return;
          }
          
          if (self.debugMode) {
            console.log('[LocalizationManager] 시트 ' + sheetId + ' 로드 완료');
          }
          
          // TSV 데이터를 직접 파싱하여 적용 (병합)
          self.parseTsvContent(tsvContent);
          
          // 다음 시트 로드
          self.loadMultipleSheets(spreadsheetId, sheetIds, index + 1, callback);
        } else {
          console.error('[LocalizationManager] 시트 ' + sheetId + ' 로드 실패: HTTP ' + xhr.status);
          console.error('  URL: ' + tsvUrl);
          // 실패해도 다음 시트로 진행
          self.loadMultipleSheets(spreadsheetId, sheetIds, index + 1, callback);
        }
      }
    };
    xhr.onerror = function() {
      console.error('[LocalizationManager] 시트 ' + sheetId + ' 로드 실패: 네트워크 오류');
      console.error('  URL: ' + tsvUrl);
      // 실패해도 다음 시트로 진행
      self.loadMultipleSheets(spreadsheetId, sheetIds, index + 1, callback);
    };
    xhr.send();
  },
  
  /**
   * TSV 문자열 내용을 직접 파싱하여 로컬라이제이션 데이터로 변환
   * @param {string} tsvContent - TSV 파일 내용
   */
  parseTsvContent: function(tsvContent) {
    if (!tsvContent || tsvContent.trim() === '') {
      return;
    }
    
    // 데이터 초기화
    if (!LocalizationManager._data) {
      LocalizationManager._data = {
        ko: {},
        en: {},
        cn: {}
      };
    }
    
    // TSV 파싱
    var parsedData = this.parseTSV(tsvContent);
    var self = this;
    var validCount = 0;
    var skipCount = 0;
    
    parsedData.forEach(function(row) {
      var key = row.Key;
      
      // 키가 없거나 #으로 시작하면 스킵
      if (!key || key.indexOf('#') === 0) {
        skipCount++;
        return;
      }
      
      // 언어별 데이터 저장 (Ko, En, Cn -> ko, en, cn)
      var languages = ['Ko', 'En', 'Cn'];
      languages.forEach(function(lang) {
        var value = row[lang];
        var langKey = lang.toLowerCase();
        
        if (!LocalizationManager._data[langKey]) {
          LocalizationManager._data[langKey] = {};
        }
        
        if (value !== undefined && value !== null && value !== '') {
          // 중복 키 체크
          if (LocalizationManager._data[langKey][key] && self.warnOnDuplicate) {
            console.warn('[LocalizationManager] 중복 키 발견: ' + key + ' (언어: ' + langKey + ')');
          }
          
          LocalizationManager._data[langKey][key] = value;
        } else {
          // 빈 값이면 키 그대로 (디버깅용)
          if (!LocalizationManager._data[langKey][key]) {
            LocalizationManager._data[langKey][key] = key;
          }
        }
      });
      
      validCount++;
    });
    
    if (this.debugMode) {
      console.log('[LocalizationManager] 스프레드시트 TSV 파싱 완료 - 유효: ' + validCount + '개, 스킵: ' + skipCount + '개');
    }
  },
  
  // ========== TSV 폴더 자동 로드 (JSON으로 변환하여 로드) ==========
  
  /**
   * 지정된 경로에서 모든 TSV 파일을 자동으로 로드하여 JSON 형식으로 변환
   * @param {function} callback - 로드 완료 후 호출할 콜백 함수
   */
  loadTsvFromFolderAsJson: function(callback) {
    var self = this;
    
    if (!this.tsvFolderPath || this.tsvFolderPath.trim() === '') {
      if (this.debugMode) {
        console.warn('[LocalizationManager] TSV 폴더 경로가 지정되지 않았습니다.');
      }
      if (callback) callback();
      return;
    }
    
    // 경로 정리 (앞뒤 공백 제거, 슬래시 정리)
    var folderPath = this.tsvFolderPath.trim().replace(/\\/g, '/');
    if (folderPath.lastIndexOf('/') === folderPath.length - 1) {
      folderPath = folderPath.substring(0, folderPath.length - 1);
    }
    
    if (this.debugMode) {
      console.log('[LocalizationManager] TSV 폴더 로드 시작 (JSON으로 변환): ' + folderPath);
    }
    
    // Cocos Creator 2.x에서는 cc.loader.loadResDir로 TSV 파일 목록 가져오기
    cc.loader.loadResDir(folderPath, function(err, assets, urls) {
      if (err) {
        console.error('[LocalizationManager] TSV 폴더 로드 실패: ' + folderPath, err);
        if (callback) callback();
        return;
      }
      
      if (!assets || assets.length === 0) {
        if (self.debugMode) {
          console.warn('[LocalizationManager] TSV 파일을 찾을 수 없습니다: ' + folderPath);
        }
        if (callback) callback();
        return;
      }
      
      // TSV 파일만 필터링 (.tsv 확장자)
      var tsvFilePaths = [];
      for (var i = 0; i < assets.length; i++) {
        var asset = assets[i];
        var fileName = asset.name || '';
        var lowerFileName = fileName.toLowerCase();
        var isTsvFile = lowerFileName.length >= 4 && lowerFileName.lastIndexOf('.tsv') === lowerFileName.length - 4;
        
        if (isTsvFile) {
          // asset.name에서 확장자 제거 (cc.loader.loadRes는 확장자 없이 경로를 받음)
          var nameWithoutExt = fileName;
          if (lowerFileName.lastIndexOf('.tsv') !== -1) {
            nameWithoutExt = fileName.substring(0, fileName.length - 4);
          }
          
          var filePath = folderPath + '/' + nameWithoutExt;
          
          tsvFilePaths.push(filePath);
          if (self.debugMode) {
            console.log('[LocalizationManager] TSV 파일 발견: ' + fileName + ' (경로: ' + filePath + ')');
            console.log('[LocalizationManager] asset.name:', asset.name, 'asset.nativeUrl:', asset.nativeUrl);
          }
        }
      }
      
      if (tsvFilePaths.length === 0) {
        if (self.debugMode) {
          console.warn('[LocalizationManager] TSV 파일을 찾을 수 없습니다: ' + folderPath);
        }
        if (callback) callback();
        return;
      }
      
      if (self.debugMode) {
        console.log('[LocalizationManager] ' + tsvFilePaths.length + '개 TSV 파일 발견 - JSON으로 변환하여 로드');
      }
      
      // 각 TSV 파일을 로드하여 JSON 형식으로 변환
      self.loadTsvFilesAsJson(tsvFilePaths, 0, callback);
    }.bind(this));
  },
  
  /**
   * 경로 목록에서 TSV 파일들을 순차적으로 로드하여 JSON 형식으로 변환
   * @param {Array} filePaths - TSV 파일 경로 배열 (resources 폴더 기준)
   * @param {number} index - 현재 로드 중인 파일 인덱스
   * @param {function} callback - 모든 파일 로드 완료 후 호출할 콜백
   */
  loadTsvFilesAsJson: function(filePaths, index, callback) {
    var self = this;
    
    // 모든 파일을 로드했으면 콜백 호출
    if (index >= filePaths.length) {
      if (this.debugMode) {
        console.log('[LocalizationManager] 모든 TSV 파일을 JSON으로 변환 완료 (' + filePaths.length + '개)');
      }
      if (callback) callback();
      return;
    }
    
    var filePath = filePaths[index];
    
    if (this.debugMode) {
      console.log('[LocalizationManager] TSV 파일 로드 중 [' + (index + 1) + '/' + filePaths.length + ']: ' + filePath);
    }
    
    // cc.loader.loadRes로 TSV 파일을 TextAsset으로 로드
    cc.loader.loadRes(filePath, cc.TextAsset, function(err, textAsset) {
      if (err) {
        console.error('[LocalizationManager] TSV 파일 로드 실패: ' + filePath, err);
        // 실패해도 다음 파일로 진행
        self.loadTsvFilesAsJson(filePaths, index + 1, callback);
        return;
      }
      
      if (!textAsset || !textAsset.text) {
        console.error('[LocalizationManager] TSV 파일이 유효하지 않습니다: ' + filePath);
        // 실패해도 다음 파일로 진행
        self.loadTsvFilesAsJson(filePaths, index + 1, callback);
        return;
      }
      
      var tsvContent = textAsset.text;
      
      if (!tsvContent || tsvContent.trim() === '') {
        if (self.debugMode) {
          console.warn('[LocalizationManager] TSV 파일이 비어있습니다: ' + filePath);
        }
        // 빈 파일이어도 다음 파일로 진행
        self.loadTsvFilesAsJson(filePaths, index + 1, callback);
        return;
      }
      
      if (self.debugMode) {
        console.log('[LocalizationManager] TSV 파일 로드 완료: ' + filePath);
        console.log('[LocalizationManager] JSON으로 변환 중...');
      }
      
      // TSV를 파싱하여 JSON 형식의 데이터 구조로 변환
      var jsonData = self.convertTsvToJson(tsvContent);
      
      if (jsonData) {
        // JSON 데이터를 직접 병합
        LocalizationManager.addJsonData(jsonData, false);
        
        if (self.debugMode) {
          console.log('[LocalizationManager] JSON 변환 및 병합 완료: ' + filePath);
        }
      }
      
      // 다음 파일 로드
      self.loadTsvFilesAsJson(filePaths, index + 1, callback);
    });
  },
  
  /**
   * TSV 내용을 JSON 형식의 데이터 구조로 변환
   * @param {string} tsvContent - TSV 파일 내용
   * @returns {object} JSON 형식의 로컬라이제이션 데이터
   */
  convertTsvToJson: function(tsvContent) {
    if (!tsvContent || tsvContent.trim() === '') {
      return null;
    }
    
    // TSV 파싱
    var parsedData = this.parseTSV(tsvContent);
    var jsonData = {
      ko: {},
      en: {},
      cn: {}
    };
    
    var validCount = 0;
    var skipCount = 0;
    
    for (var i = 0; i < parsedData.length; i++) {
      var row = parsedData[i];
      var key = row.Key;
      
      // 키가 없거나 #으로 시작하면 스킵
      if (!key || key.indexOf('#') === 0) {
        skipCount++;
        continue;
      }
      
      // 언어별 데이터 저장 (Ko, En, Cn -> ko, en, cn)
      var languages = ['Ko', 'En', 'Cn'];
      for (var j = 0; j < languages.length; j++) {
        var lang = languages[j];
        var value = row[lang];
        var langKey = lang.toLowerCase();
        
        if (value !== undefined && value !== null && value !== '') {
          jsonData[langKey][key] = value;
        } else {
          // 빈 값이면 키 그대로 (디버깅용)
          if (!jsonData[langKey][key]) {
            jsonData[langKey][key] = key;
          }
        }
      }
      
      validCount++;
    }
    
    if (this.debugMode) {
      console.log('[LocalizationManager] TSV → JSON 변환 완료 - 유효: ' + validCount + '개, 스킵: ' + skipCount + '개');
    }
    
    return jsonData;
  },
  
  /**
   * 경로 목록에서 TSV 파일들을 순차적으로 로드 (cc.loader.load 사용)
   * @param {Array} filePaths - TSV 파일 경로 배열 (resources 폴더 기준)
   * @param {number} index - 현재 로드 중인 파일 인덱스
   * @param {function} callback - 모든 파일 로드 완료 후 호출할 콜백            
   */
  loadTsvFilesFromPaths: function(filePaths, index, callback) {
    var self = this;
    
    // 모든 파일을 로드했으면 콜백 호출
    if (index >= filePaths.length) {
      if (this.debugMode) {
        console.log('[LocalizationManager] 모든 TSV 파일 로드 완료 (' + filePaths.length + '개)');
      }
      if (callback) callback();
      return;
    }
    
    var filePath = filePaths[index];
    
    if (this.debugMode) {
      console.log('[LocalizationManager] TSV 파일 로드 중 [' + (index + 1) + '/' + filePaths.length + ']: ' + filePath);
    }
    
    // cc.loader.load로 TSV 파일 로드
    cc.loader.loadRes(filePath, cc.TextAsset, function(err, textAsset) {
      if (err) {
        console.error('[LocalizationManager] TSV 파일 로드 실패: ' + filePath, err);
        // 실패해도 다음 파일로 진행
        self.loadTsvFilesFromPaths(filePaths, index + 1, callback);
        return;
      }
      
      if (!textAsset || !textAsset.text) {
        console.error('[LocalizationManager] TSV 파일이 유효하지 않습니다: ' + filePath);
        // 실패해도 다음 파일로 진행
        self.loadTsvFilesFromPaths(filePaths, index + 1, callback);
        return;
      }
      
      var tsvContent = textAsset.text;
      
      if (!tsvContent || tsvContent.trim() === '') {
        if (self.debugMode) {
          console.warn('[LocalizationManager] TSV 파일이 비어있습니다: ' + filePath);
        }
        // 빈 파일이어도 다음 파일로 진행
        self.loadTsvFilesFromPaths(filePaths, index + 1, callback);
        return;
      }
      
      if (self.debugMode) {
        console.log('[LocalizationManager] TSV 파일 로드 완료: ' + filePath);
        console.log('[LocalizationManager] 내용 길이: ' + tsvContent.length);
      }
      
      // TSV 데이터를 직접 파싱하여 적용 (병합)
      self.parseTsvContent(tsvContent);
      
      // 다음 파일 로드
      self.loadTsvFilesFromPaths(filePaths, index + 1, callback);
    });
  },
  
  /**
   * URL 목록에서 TSV 파일들을 순차적으로 로드 (스프레드시트용)
   * @param {Array} urls - TSV 파일 URL 배열
   * @param {number} index - 현재 로드 중인 파일 인덱스
   * @param {function} callback - 모든 파일 로드 완료 후 호출할 콜백
   */
  loadTsvFilesFromUrls: function(urls, index, callback) {
    var self = this;
    
    // 모든 파일을 로드했으면 콜백 호출
    if (index >= urls.length) {
      if (this.debugMode) {
        console.log('[LocalizationManager] 모든 TSV 파일 로드 완료 (' + urls.length + '개)');
      }
      if (callback) callback();
      return;
    }
    
    var url = urls[index];
    
    if (this.debugMode) {
      console.log('[LocalizationManager] TSV 파일 로드 중 [' + (index + 1) + '/' + urls.length + ']: ' + url);
    }
    
    // XMLHttpRequest로 TSV 파일 직접 로드
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          var tsvContent = xhr.responseText;
          
          if (!tsvContent || tsvContent.trim() === '') {
            if (self.debugMode) {
              console.warn('[LocalizationManager] TSV 파일이 비어있습니다: ' + url);
            }
            // 빈 파일이어도 다음 파일로 진행
            self.loadTsvFilesFromUrls(urls, index + 1, callback);
            return;
          }
          
          if (self.debugMode) {
            console.log('[LocalizationManager] TSV 파일 로드 완료: ' + url);
            console.log('[LocalizationManager] 내용 길이: ' + tsvContent.length);
          }
          
          // TSV 데이터를 직접 파싱하여 적용 (병합)
          self.parseTsvContent(tsvContent);
          
          // 다음 파일 로드
          self.loadTsvFilesFromUrls(urls, index + 1, callback);
        } else {
          console.error('[LocalizationManager] TSV 파일 로드 실패: HTTP ' + xhr.status);
          console.error('  URL: ' + url);
          // 실패해도 다음 파일로 진행
          self.loadTsvFilesFromUrls(urls, index + 1, callback);
        }
      }
    };
    xhr.onerror = function() {
      console.error('[LocalizationManager] TSV 파일 로드 실패: 네트워크 오류');
      console.error('  URL: ' + url);
      // 실패해도 다음 파일로 진행
      self.loadTsvFilesFromUrls(urls, index + 1, callback);
    };
    xhr.send();
  },
  
  /**
   * 초기화 완료 처리
   */
  finishInitialization: function() {
    // ========== [CDN 사용으로 비활성화] 로컬 파일 로딩 ==========
    /*
    // ========== TSV 파일 파싱 및 병합 ==========
    // 스프레드시트에서 로드한 경우가 아니고, 수동 지정된 TSV 파일이 있는 경우에만 파싱
    if (!this.loadFromSpreadsheet && this.localizationTsvFiles && this.localizationTsvFiles.length > 0) {
      this.parseTsvFiles();
    }

    // ========== JSON 파일 병합 ==========
    // 수동 지정된 JSON 파일 병합 (jsonFolderPath에서 자동 로드한 것은 이미 병합됨)
    if (this.localizationJsonFiles && this.localizationJsonFiles.length > 0) {
      this.mergeJsonFiles();
    }

    // 데이터가 있는지 확인 (스프레드시트, TSV 파일, JSON 파일 중 하나라도 있어야 함)
    var hasTsvFiles = this.localizationTsvFiles && this.localizationTsvFiles.length > 0;
    var hasJsonFiles = this.localizationJsonFiles && this.localizationJsonFiles.length > 0;

    // 스프레드시트 데이터 확인
    var hasSpreadsheetData = false;
    // tsvFolderPath에서 자동 로드한 데이터 확인 (JSON으로 변환됨)
    var hasTsvFolderData = false;
    if (LocalizationManager._data) {
      for (var lang in LocalizationManager._data) {
        var langData = LocalizationManager._data[lang];
        if (langData && Object.keys(langData).length > 0) {
          if (this.loadFromSpreadsheet) {
            hasSpreadsheetData = true;
          } else if (this.autoLoadTsvFolder) {
            hasTsvFolderData = true;
          }
          break;
        }
      }
    }

    if (!hasTsvFiles && !hasJsonFiles && !hasSpreadsheetData && !hasTsvFolderData) {
      console.error('[LocalizationManager] localizationTsvFiles, localizationJsonFiles, tsvFolderPath 또는 스프레드시트 데이터가 필요합니다!');
      return;
    }
    */
      
      // 저장된 언어 불러오기
      var savedLanguage = null;
      
      // Hi5 SDK 사용 시 Hi5 SDK에서 데이터 가져오기
      if (window['Hi5'] && window['Hi5'].getItem) {
        savedLanguage = window['Hi5'].getItem('game_language', null);
      } else {
        // Hi5 SDK가 없을 때는 localStorage 사용 (fallback)
        savedLanguage = cc.sys.localStorage.getItem('game_language');
      }
      
      if (savedLanguage && LocalizationManager._data[savedLanguage]) {
        LocalizationManager._currentLanguage = savedLanguage;
      } else {
        LocalizationManager._currentLanguage = this.defaultLanguage;
      }
      
      // ========== CDN 로딩 ==========
      if (this.useCDN && this.cdnProjectId) {
        this.initWithCDN();
      } else {
        this.completeInitialization();
      }
  },

  /**
   * CDN을 사용한 초기화 (버전 체크 포함)
   */
  initWithCDN: function() {
    var self = this;

    if (this.debugMode) {
      console.log('[LocalizationManager] CDN 초기화 시작 (버전 체크)...');
      console.log('  - Project ID: ' + this.cdnProjectId);
      console.log('  - Base URL: ' + this.cdnBaseUrl);
      console.log('  - Version URL: ' + this.cdnVersionUrl);
    }

    // 버전 체크 후 현재 언어 로드
    LocalizationManager.checkVersionAndLoad(LocalizationManager._currentLanguage, function(result) {
      if (self.debugMode) {
        var versionInfo = result.version ? ' (v' + result.version + ')' : '';
        console.log('[LocalizationManager] CDN 로드 결과: ' + result.source + ' (' + result.keyCount + '개 키)' + versionInfo);
      }

      self.completeInitialization();

      // 나머지 언어는 백그라운드에서 로드 (버전 체크 사용)
      self.loadRemainingLanguagesWithVersion();
    });
  },

  /**
   * 나머지 언어 백그라운드 로드
   */
  loadRemainingLanguages: function() {
    var self = this;
    var languages = ['ko', 'en', 'cn'];
    var currentLang = LocalizationManager._currentLanguage;
    var index = 0;

    function loadNext() {
      if (index >= languages.length) {
        if (self.debugMode) {
          console.log('[LocalizationManager] 모든 언어 로드 완료');
        }
        return;
      }

      var lang = languages[index];
      index++;

      if (lang === currentLang) {
        loadNext();
        return;
      }

      LocalizationManager.loadFromCDN(lang, function() {
        loadNext();
      });
    }

    loadNext();
  },

  /**
   * 나머지 언어 백그라운드 로드 (버전 체크 사용)
   */
  loadRemainingLanguagesWithVersion: function() {
    var self = this;
    var languages = ['ko', 'en', 'cn'];
    var currentLang = LocalizationManager._currentLanguage;
    var index = 0;

    function loadNext() {
      if (index >= languages.length) {
        if (self.debugMode) {
          console.log('[LocalizationManager] 모든 언어 로드 완료 (버전 체크)');
        }
        return;
      }

      var lang = languages[index];
      index++;

      if (lang === currentLang) {
        loadNext();
        return;
      }

      LocalizationManager.checkVersionAndLoad(lang, function() {
        loadNext();
      });
    }

    loadNext();
  },

  /**
   * 초기화 완료 처리
   */
  completeInitialization: function() {
      LocalizationManager._isInitialized = true;

      if (this.debugMode) {
        console.log('[LocalizationManager] 초기화 완료');
        console.log('  - CDN 사용: ' + this.useCDN);
      var tsvCount = this.localizationTsvFiles ? this.localizationTsvFiles.length : 0;
      var jsonCount = this.localizationJsonFiles ? this.localizationJsonFiles.length : 0;
      var source = this.loadFromSpreadsheet ? '스프레드시트' : '로컬 파일';
      console.log('  - 데이터 소스: ' + source);
      console.log('  - TSV 파일: ' + tsvCount + '개, JSON 파일: ' + jsonCount + '개');
      console.log('  - 현재 언어: ' + LocalizationManager._currentLanguage);
      console.log('  - 지원 언어: ' + LocalizationManager.getSupportedLanguages().join(', '));
        
        // 각 언어별 키 개수 출력
      for (var langKey in LocalizationManager._data) {
        var keyCount = Object.keys(LocalizationManager._data[langKey]).length;
        console.log('  - ' + langKey + ': ' + keyCount + '개 키');
      }
    }
    
    // ========== 초기화 완료 대기 콜백 호출 ==========
    if (LocalizationManager._initCallbacks && LocalizationManager._initCallbacks.length > 0) {
      if (this.debugMode) {
        console.log('[LocalizationManager] 초기화 완료 콜백 호출 (' + LocalizationManager._initCallbacks.length + '개)');
      }
      
      // 모든 콜백 호출
      var callbacks = LocalizationManager._initCallbacks.slice(); // 복사본 생성
      LocalizationManager._initCallbacks = []; // 배열 초기화
      
      for (var i = 0; i < callbacks.length; i++) {
        try {
          callbacks[i]();
        } catch (e) {
          console.error('[LocalizationManager] 초기화 완료 콜백 실행 중 오류:', e);
        }
      }
    }
    
    // 초기화 완료 후 자동 로컬라이징 (스프레드시트 로드의 경우 지연 필요)
    if (this.autoLocalizeOnStart) {
      var self = this;
      this.scheduleOnce(function() {
        LocalizationManager.localizeScene();
      }, this.loadFromSpreadsheet ? 0.1 : 0);
    }
  },
  
  // ========== TSV 파일 파싱 ==========
  
  /**
   * TSV 파일을 파싱하여 로컬라이제이션 데이터로 변환
   */
  parseTsvFiles: function() {
    var self = this;
    
    // 데이터 초기화 (이미 onLoad에서 초기화됨)
    if (!LocalizationManager._data) {
      LocalizationManager._data = {
        ko: {},
        en: {},
        cn: {}
      };
    }
    
    // 각 TSV 파일을 순서대로 파싱
    for (var index = 0; index < this.localizationTsvFiles.length; index++) {
      var tsvAsset = this.localizationTsvFiles[index];
      
      if (!tsvAsset) {
        console.error('[LocalizationManager] TSV 파일이 null입니다 (index: ' + index + ')');
        if (this.debugMode) {
          console.log('[LocalizationManager] localizationTsvFiles[' + index + '] =', tsvAsset);
        }
        continue;
      }
      
      if (tsvAsset.text === undefined || tsvAsset.text === null) {
        console.error('[LocalizationManager] TSV 파일에 text 속성이 없습니다 (index: ' + index + ')');
        if (this.debugMode) {
          console.log('[LocalizationManager] 에셋 구조:', {
            name: tsvAsset.name,
            type: tsvAsset.constructor ? tsvAsset.constructor.name : typeof tsvAsset,
            keys: Object.keys(tsvAsset),
            hasText: 'text' in tsvAsset,
            textValue: tsvAsset.text
          });
        }
        continue;
      }
      
      var fileName = tsvAsset.name || 'tsv_file_' + index;
      
      if (this.debugMode) {
        console.log('[LocalizationManager] TSV 파일 파싱 시작: ' + fileName);
        console.log('[LocalizationManager] text 길이: ' + (tsvAsset.text ? tsvAsset.text.length : 0));
        console.log('[LocalizationManager] text 처음 200자:', tsvAsset.text ? tsvAsset.text.substring(0, 200) : 'null');
      }
      
      var tsvData = this.parseTSV(tsvAsset.text);
      
      if (this.debugMode) {
        console.log('[LocalizationManager] TSV 파싱 중: ' + fileName);
      }
      
      // TSV 데이터를 로컬라이제이션 데이터로 변환
      var validCount = 0;
      var skipCount = 0;
      
      for (var i = 0; i < tsvData.length; i++) {
        var row = tsvData[i];
        var key = row.Key;
        
        // 키가 없거나 #으로 시작하면 스킵
        if (!key || key.indexOf('#') === 0) {
          skipCount++;
          continue;
        }
        
        // 언어별 데이터 저장 (Ko, En, Cn -> ko, en, cn)
        var languages = ['Ko', 'En', 'Cn'];
        for (var j = 0; j < languages.length; j++) {
          var lang = languages[j];
          var value = row[lang];
          var langKey = lang.toLowerCase();
          
          if (!LocalizationManager._data[langKey]) {
            LocalizationManager._data[langKey] = {};
          }
          
          if (value !== undefined && value !== null && value !== '') {
            // 중복 키 체크
            if (LocalizationManager._data[langKey][key] && self.warnOnDuplicate) {
              console.warn('[LocalizationManager] 중복 키 발견: ' + key + ' (파일: ' + fileName + ', 언어: ' + langKey + ')');
            }
            
            LocalizationManager._data[langKey][key] = value;
    } else {
            // 빈 값이면 키 그대로 (디버깅용)
            if (!LocalizationManager._data[langKey][key]) {
              LocalizationManager._data[langKey][key] = key;
            }
          }
        }
        
        validCount++;
      }
      
      if (this.debugMode) {
        console.log('  - 유효: ' + validCount + '개, 스킵: ' + skipCount + '개');
      }
    }
    
    if (this.debugMode) {
      console.log('[LocalizationManager] TSV 파싱 완료');
    }
  },
  
  /**
   * TSV 문자열을 파싱하여 객체 배열로 변환
   * @param {string} content - TSV 파일 내용
   * @returns {Array} 파싱된 데이터 배열
   */
  parseTSV: function(content) {
    var lines = content.split('\n');
    var result = [];
    var separator = '\t';
    
    if (lines.length === 0) {
      return result;
    }
    
    // 첫 줄은 헤더
    var headers = lines[0].split(separator);
    for (var i = 0; i < headers.length; i++) {
      headers[i] = headers[i].trim();
    }
    
    // 나머지 줄은 데이터
    for (var j = 1; j < lines.length; j++) {
      var line = lines[j].trim();
      if (!line) continue; // 빈 줄 스킵
      
      var values = line.split(separator);
      var row = {};
      
      for (var k = 0; k < headers.length; k++) {
        row[headers[k]] = values[k] ? values[k].trim() : '';
      }
      
      result.push(row);
    }
    
    return result;
  },
  
  // ========== JSON 파일 병합 ==========
  
  /**
   * 여러 JSON 파일을 하나로 병합
   */
  mergeJsonFiles: function() {
    var self = this;
    
    // 데이터 초기화 (이미 onLoad에서 초기화됨)
    if (!LocalizationManager._data) {
    LocalizationManager._data = {
      ko: {},
      en: {},
      cn: {}
    };
    }
    
    // 각 JSON 파일을 순서대로 병합
    for (var index = 0; index < this.localizationJsonFiles.length; index++) {
      var jsonAsset = this.localizationJsonFiles[index];
      
      if (!jsonAsset || !jsonAsset.json) {
        console.error('[LocalizationManager] JSON 파일이 유효하지 않습니다 (index: ' + index + ')');
        continue;
      }
      
      var jsonData = jsonAsset.json;
      var fileName = jsonAsset.name || 'file_' + index;
      
      if (this.debugMode) {
        console.log('[LocalizationManager] 병합 중: ' + fileName);
      }
      
      // 각 언어별로 병합
      for (var lang in jsonData) {
        if (!LocalizationManager._data[lang]) {
          LocalizationManager._data[lang] = {};
        }
        
        var langData = jsonData[lang];
        var duplicateCount = 0;
        
        for (var key in langData) {
          // 중복 키 체크
          if (LocalizationManager._data[lang][key] && self.warnOnDuplicate) {
            console.warn('[LocalizationManager] 중복 키 발견: ' + key + ' (파일: ' + fileName + ', 언어: ' + lang + ')');
            duplicateCount++;
          }
          
          // 병합 (나중에 로드된 것이 우선)
          LocalizationManager._data[lang][key] = langData[key];
        }
        
        if (this.debugMode) {
          var keyCount = Object.keys(langData).length;
          console.log('  - ' + lang + ': ' + keyCount + '개 키 추가' + (duplicateCount > 0 ? ' (중복: ' + duplicateCount + '개)' : ''));
        }
      }
    }
    
    if (this.debugMode) {
      console.log('[LocalizationManager] JSON 병합 완료');
    }
  },
  
  start: function() {
    // 스프레드시트에서 로드하는 경우 finishInitialization에서 처리하므로 여기서는 스킵
    // 이미 초기화가 완료된 경우에만 자동 로컬라이징
    if (this.autoLocalizeOnStart && LocalizationManager._isInitialized) {
      var self = this;
      this.scheduleOnce(function() {
        LocalizationManager.localizeScene();
      }, 0);
    }
  },
  
  // ========== 씬 로드 이벤트 ==========
  
  onSceneLoaded: function() {
    if (this.debugMode) {
      console.log('[LocalizationManager] 씬 로드됨 - 자동 로컬라이징 시작');
    }
    
    // 씬이 완전히 로드된 후 로컬라이징
    var self = this;
    this.scheduleOnce(function() {
      LocalizationManager.localizeScene();
    }, 0.1);
  },
  
  onDestroy: function() {
    // 이벤트 리스너 제거
    cc.director.off(cc.Director.EVENT_AFTER_SCENE_LAUNCH, this.onSceneLoaded, this);
    
    if (LocalizationManager.instance === this) {
      LocalizationManager.instance = null;
      LocalizationManager._isInitialized = false;
    }
  }
  
});

// 전역 접근
cc.pvz = cc.pvz || {};
cc.pvz.LocalizationManager = LocalizationManager;

module.exports = LocalizationManager;
