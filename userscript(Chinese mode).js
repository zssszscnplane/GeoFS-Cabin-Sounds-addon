// ==UserScript==
// @name         GeoFS-Cabin-Sounds-addon
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  none
// @author       Bilibili-我是小猪05 Xiaohongshu-起飞吧！凤凰牌飞机！ Github-zssszscnplane
// @match        https://www.geo-fs.com/geofs.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geo-fs.com
// @grant        none
// @connect      raw.githubusercontent.com
// @connect      cdn.jsdelivr.net
// @connect      gh-proxy.com
// @connect      ghproxy.net
// ==/UserScript==
(function() {
    'use strict';

    var audioCache = {};
    var sounds = [];

    // 预设客舱广播音频（引用自 GitHub 仓库 zssszscnplane/GeoFS-Cabin-Sounds-addon 的 "Sounds of airlines in China" 文件夹）
    // 每个声音配多个镜像源，加载失败时自动切换到下一个，避免单个源被墙导致无法播放
    function presetUrls(fileName, encodedName) {
        var base = 'Sounds%20of%20airlines%20in%20China/' + encodedName;
        return [
            'https://cdn.jsdelivr.net/gh/zssszscnplane/GeoFS-Cabin-Sounds-addon@main/' + base,
            'https://raw.githubusercontent.com/zssszscnplane/GeoFS-Cabin-Sounds-addon/main/' + base,
            'https://gh-proxy.com/https://raw.githubusercontent.com/zssszscnplane/GeoFS-Cabin-Sounds-addon/main/' + base,
            'https://ghproxy.net/https://raw.githubusercontent.com/zssszscnplane/GeoFS-Cabin-Sounds-addon/main/' + base
        ];
    }

    // 每个预设音频同时包含中文名（name，兼作缓存 key）和英文名（enName）
    var presetSounds = [
        { name: '叮咚',       enName: 'Chime',                    urls: presetUrls('叮咚', '%E5%8F%AE%E5%92%9A.mp3') },
        { name: '关门',       enName: 'Door Close',               urls: presetUrls('关门', '%E5%85%B3%E9%97%A8.mp3') },
        { name: '起飞前',     enName: 'Before Takeoff',           urls: presetUrls('起飞前', '%E8%B5%B7%E9%A3%9E%E5%89%8D.mp3') },
        { name: '巡航',       enName: 'Cruise',                   urls: presetUrls('巡航', '%E5%B7%A1%E8%88%AA.mp3') },
        { name: '爬升',       enName: 'Climb',                    urls: presetUrls('爬升', '%E7%88%AC%E5%8D%87.mp3') },
        { name: '早餐',       enName: 'Breakfast',                urls: presetUrls('早餐', '%E6%97%A9%E9%A4%90.mp3') },
        { name: '晚餐',       enName: 'Dinner',                   urls: presetUrls('晚餐', '%E6%99%9A%E9%A4%90.mp3') },
        { name: '颠簸提醒',   enName: 'Turbulence Reminder',      urls: presetUrls('颠簸提醒', '%E9%A2%A0%E7%B0%B8%E6%8F%90%E9%86%92.mp3') },
        { name: '机上娱乐',   enName: 'In-flight Entertainment',  urls: presetUrls('机上娱乐', '%E6%9C%BA%E4%B8%8A%E5%A8%B1%E4%B9%90.mp3') },
        { name: '开门',       enName: 'Door Open',                urls: presetUrls('开门', '%E5%BC%80%E9%97%A8.mp3') },
        { name: '技术故障',   enName: 'Technical Failure',        urls: presetUrls('技术故障', '%E6%8A%80%E6%9C%AF%E6%95%85%E9%9A%9C.mp3') },
        { name: '紧急撤离',   enName: 'Emergency Evacuation',     urls: presetUrls('紧急撤离', '%E7%B4%A7%E6%80%A5%E6%92%A4%E7%A6%BB.mp3') },
        { name: '复飞',       enName: 'Go Around',                urls: presetUrls('复飞', '%E5%A4%8D%E9%A3%9E.mp3') },
        { name: '用餐提醒',   enName: 'Meal Service Reminder',    urls: presetUrls('用餐提醒', '%E7%94%A8%E9%A4%90%E6%8F%90%E9%86%92.mp3') },
        { name: '落地前',     enName: 'Before Landing',           urls: presetUrls('落地前', '%E8%90%BD%E5%9C%B0%E5%89%8D.mp3') },
        { name: '备降',       enName: 'Diversion',                urls: presetUrls('备降', '%E5%A4%87%E9%99%8D.mp3') },
        { name: '备降道歉',   enName: 'Diversion Apology',        urls: presetUrls('备降道歉', '%E5%A4%87%E9%99%8D%E9%81%93%E6%AD%89.mp3') }
    ];

    // 预设音频的双语名称映射：key 为中文名（audioCache 的 key），value 为 {zh, en}
    var presetNameMap = {};
    presetSounds.forEach(function(item) {
        presetNameMap[item.name] = { zh: item.name, en: item.enName };
    });

    var currentLanguage = '简体中文';
    var uploadedSounds = [];
    var languageMap = {
        '简体中文': {
            'title': 'GeoFS 客舱广播插件',
            'sound': '音量',
            'uploadAudio': '上传音频',
            'inputPlaceholder': '请输入文字',
            'browseFile': '浏览本地文件',
            'upload': '上传',
            'fileTooBig': '文件过大（最大 200MB）',
            'fileInvalid': '仅支持 .mp3 文件',
            'viewAuthor': '查看作者',
            'language': '语言'
        },
        'English': {
            'title': 'GeoFS Cabin Sounds Addon',
            'sound': 'Volume',
            'uploadAudio': 'Upload Audio',
            'inputPlaceholder': 'Enter name',
            'browseFile': 'Browse local file',
            'upload': 'Upload',
            'fileTooBig': 'File too large (max 200MB)',
            'fileInvalid': 'Only .mp3 files supported',
            'viewAuthor': 'View Author',
            'language': 'Language'
        }
    };

    // ========== 【新皮肤】注入全局样式 ==========
    var styleEl = document.createElement('style');
    styleEl.textContent = `
        #sound-button, #sound-menu, #sound-menu * {
            box-sizing: border-box;
        }

        @keyframes gc-pop-in {
            from { opacity: 0; transform: translateY(12px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* 悬浮按钮：圆形渐变 */
        #sound-button {
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 26px;
            font-weight: 700;
            line-height: 1;
            cursor: pointer;
            box-shadow: 0 8px 24px rgba(56, 189, 248, 0.35);
            z-index: 9999;
            user-select: none;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        #sound-button:hover {
            transform: scale(1.08) rotate(-6deg);
            box-shadow: 0 12px 32px rgba(56, 189, 248, 0.55);
        }
        #sound-button:active {
            transform: scale(0.94);
        }

        /* 菜单面板：深色玻璃拟态 */
        #sound-menu {
            position: fixed;
            bottom: 96px;
            right: 24px;
            width: 320px;
            background: linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            color: #e2e8f0;
            padding: 20px;
            border-radius: 18px;
            border: 1px solid rgba(56, 189, 248, 0.25);
            box-shadow: 0 20px 48px rgba(0, 0, 0, 0.5),
                        0 0 32px rgba(56, 189, 248, 0.15);
            display: none;
            max-height: min(560px, calc(100vh - 140px));
            overflow-y: auto;
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
            animation: gc-pop-in 0.25s ease;
            scrollbar-width: thin;
            scrollbar-color: rgba(148, 163, 184, 0.3) transparent;
        }
        #sound-menu::-webkit-scrollbar { width: 6px; }
        #sound-menu::-webkit-scrollbar-track { background: transparent; }
        #sound-menu::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.3);
            border-radius: 3px;
        }
        #sound-menu::-webkit-scrollbar-thumb:hover {
            background: rgba(148, 163, 184, 0.5);
        }

        /* 标题 */
        #sound-menu h1 {
            font-size: 18px;
            font-weight: 700;
            margin: 0 0 6px 0;
            color: #38bdf8;
            background: linear-gradient(90deg, #38bdf8 0%, #818cf8 100%);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        #sound-menu h2 {
            font-size: 11px;
            margin: 0 0 16px 0;
            color: #64748b;
            font-weight: 400;
            line-height: 1.5;
        }

        /* 语言选择器 */
        .gc-lang-selector {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            align-items: flex-start;
            margin-bottom: 14px;
            padding-bottom: 14px;
            border-bottom: 1px solid rgba(148, 163, 184, 0.15);
        }
        #language-button {
            background: rgba(56, 189, 248, 0.1);
            color: #38bdf8;
            border: 1px solid rgba(56, 189, 248, 0.4);
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 12px;
            cursor: pointer;
            font-family: inherit;
            transition: all 0.2s;
        }
        #language-button:hover {
            background: rgba(56, 189, 248, 0.2);
        }
        #lang-options {
            display: flex;
            gap: 6px;
            width: 100%;
            margin-top: 8px;
        }
        #lang-options button {
            background: rgba(30, 41, 59, 0.8);
            color: #cbd5e1;
            border: 1px solid rgba(148, 163, 184, 0.2);
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 12px;
            cursor: pointer;
            font-family: inherit;
            transition: all 0.2s;
        }
        #lang-options button:hover {
            background: rgba(56, 189, 248, 0.15);
            border-color: rgba(56, 189, 248, 0.4);
            color: #38bdf8;
        }

        /* 音量 */
        .gc-volume-label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            font-size: 12px;
            color: #cbd5e1;
            text-transform: uppercase;
            letter-spacing: 0.06em;
        }
        .gc-volume-slider {
            width: 100%;
            margin: 0 0 18px 0;
            -webkit-appearance: none;
            appearance: none;
            height: 6px;
            border-radius: 3px;
            background: rgba(148, 163, 184, 0.2);
            outline: none;
            cursor: pointer;
        }
        .gc-volume-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: linear-gradient(135deg, #38bdf8, #818cf8);
            cursor: pointer;
            box-shadow: 0 0 8px rgba(56, 189, 248, 0.6);
            transition: transform 0.15s;
        }
        .gc-volume-slider::-webkit-slider-thumb:hover {
            transform: scale(1.2);
        }
        .gc-volume-slider::-moz-range-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: linear-gradient(135deg, #38bdf8, #818cf8);
            cursor: pointer;
            border: none;
            box-shadow: 0 0 8px rgba(56, 189, 248, 0.6);
        }

        /* 声音列表 */
        #sound-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .gc-sound-btn {
            display: flex;
            flex-direction: column;
            width: 100%;
            padding: 10px 12px;
            background: rgba(30, 41, 59, 0.6);
            color: #e2e8f0;
            border: 1px solid rgba(148, 163, 184, 0.15);
            border-radius: 10px;
            cursor: pointer;
            font-family: inherit;
            font-size: 13px;
            text-align: left;
            transition: all 0.2s ease;
        }
        .gc-sound-btn:hover {
            background: rgba(56, 189, 248, 0.12);
            border-color: rgba(56, 189, 248, 0.4);
            transform: translateX(2px);
        }
        .gc-sound-btn:active {
            transform: translateX(0) scale(0.99);
        }
        .gc-sound-row {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 7px;
        }
        .gc-play-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: linear-gradient(135deg, #38bdf8, #818cf8);
            color: #0f172a;
            font-size: 10px;
            font-weight: 900;
            flex-shrink: 0;
            line-height: 1;
        }
        .gc-sound-name {
            font-weight: 500;
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .gc-progress-track {
            width: 100%;
            height: 4px;
            background: rgba(148, 163, 184, 0.15);
            border-radius: 2px;
            overflow: hidden;
            position: relative;
        }
        .gc-progress-track .progress-bar {
            width: 0%;
            height: 100%;
            background: linear-gradient(90deg, #38bdf8, #818cf8);
            border-radius: 2px;
            transition: width 0.1s linear;
        }

        /* 上传区域 */
        .gc-upload-section {
            margin-top: 18px;
            padding-top: 16px;
            border-top: 1px solid rgba(148, 163, 184, 0.15);
        }
        .gc-upload-title {
            font-size: 12px;
            font-weight: 600;
            color: #cbd5e1;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            margin: 0 0 10px 0;
        }
        .gc-text-input {
            width: 100%;
            padding: 9px 12px;
            background: rgba(15, 23, 42, 0.6);
            color: #e2e8f0;
            border: 1px solid rgba(148, 163, 184, 0.2);
            border-radius: 8px;
            font-size: 13px;
            margin-bottom: 10px;
            outline: none;
            font-family: inherit;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        .gc-text-input::placeholder { color: #64748b; }
        .gc-text-input:focus {
            border-color: rgba(56, 189, 248, 0.6);
            box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.1);
        }

        .gc-btn {
            display: block;
            width: 100%;
            padding: 10px;
            border-radius: 8px;
            border: none;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            font-family: inherit;
            transition: all 0.2s;
            margin-top: 8px;
        }
        .gc-btn-block { width: 100%; }
        .gc-btn-secondary {
            background: rgba(30, 41, 59, 0.8);
            color: #cbd5e1;
            border: 1px solid rgba(148, 163, 184, 0.2);
            text-align: center;
        }
        .gc-btn-secondary:hover {
            background: rgba(56, 189, 248, 0.12);
            border-color: rgba(56, 189, 248, 0.4);
            color: #38bdf8;
        }
        .gc-btn-primary {
            background: linear-gradient(135deg, #38bdf8, #818cf8);
            color: #0f172a;
            font-weight: 700;
        }
        .gc-btn-primary:hover:not(:disabled) {
            filter: brightness(1.1);
            transform: translateY(-1px);
        }
        .gc-btn-primary:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }

        /* 文件预览 */
        .gc-file-display {
            display: none;
            margin-top: 10px;
        }

        /* 作者区域 */
        .gc-author-section {
            margin-top: 18px;
            padding-top: 16px;
            border-top: 1px solid rgba(148, 163, 184, 0.15);
            text-align: center;
        }
        .gc-author-title {
            font-size: 12px;
            font-weight: 600;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            margin: 0 0 12px 0;
        }
        .gc-links-row {
            display: flex;
            justify-content: center;
            gap: 16px;
        }
        .gc-author-icon {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            cursor: pointer;
            object-fit: contain;
            background: rgba(30, 41, 59, 0.6);
            padding: 4px;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .gc-author-icon:hover {
            transform: translateY(-2px) scale(1.08);
            box-shadow: 0 6px 16px rgba(56, 189, 248, 0.3);
        }
    `;
    document.head.appendChild(styleEl);

    // ========== 悬浮按钮 ==========
    var soundButton = document.createElement('div');
    soundButton.id = 'sound-button';
    soundButton.textContent = '♪';
    soundButton.title = 'Cabin Sounds';
    document.body.appendChild(soundButton);

    // ========== 菜单面板 ==========
    var soundMenu = document.createElement('div');
    soundMenu.id = 'sound-menu';
    document.body.appendChild(soundMenu);

    var menuTitle = document.createElement('h1');
    soundMenu.appendChild(menuTitle);

    var menuSubtitle = document.createElement('h2');
    menuSubtitle.textContent = 'Created by Bilibili-我是小猪05 Xiaohongshu-起飞吧！凤凰牌飞机！ Github-zssszscnplane';
    soundMenu.appendChild(menuSubtitle);

    // ========== 语言选择器 ==========
    var langSelectorContainer = document.createElement('div');
    langSelectorContainer.className = 'gc-lang-selector';
    soundMenu.appendChild(langSelectorContainer);

    var langButton = document.createElement('button');
    langButton.id = 'language-button';
    langButton.textContent = 'Language (语言)';
    langSelectorContainer.appendChild(langButton);

    var langOptions = document.createElement('div');
    langOptions.id = 'lang-options';
    langOptions.style.display = 'none';
    langSelectorContainer.appendChild(langOptions);

    var zhBtn = document.createElement('button');
    zhBtn.textContent = '简体中文';
    langOptions.appendChild(zhBtn);

    var enBtn = document.createElement('button');
    enBtn.textContent = 'English';
    langOptions.appendChild(enBtn);

    langButton.addEventListener('click', function(e) {
        e.stopPropagation();
        langOptions.style.display = (langOptions.style.display === 'none' || langOptions.style.display === '') ? 'block' : 'none';
    });
    document.addEventListener('click', function() {
        if (langOptions) langOptions.style.display = 'none';
    });
    langOptions.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    zhBtn.addEventListener('click', function() {
        setLanguage('简体中文');
        langOptions.style.display = 'none';
    });
    enBtn.addEventListener('click', function() {
        setLanguage('English');
        langOptions.style.display = 'none';
    });

    // ========== 音量 ==========
    var volumeLabel = document.createElement('label');
    volumeLabel.className = 'gc-volume-label';
    soundMenu.appendChild(volumeLabel);

    var volumeSlider = document.createElement('input');
    volumeSlider.type = 'range';
    volumeSlider.min = '0';
    volumeSlider.max = '1';
    volumeSlider.step = '0.01';
    volumeSlider.value = '0.5';
    volumeSlider.className = 'gc-volume-slider';
    volumeSlider.addEventListener('input', function() {
        setVolume(volumeSlider.value);
    });
    soundMenu.appendChild(volumeSlider);

    // ========== 声音列表 ==========
    var soundList = document.createElement('div');
    soundList.id = 'sound-list';
    soundMenu.appendChild(soundList);

    // ========== 上传区域 ==========
    var fileUploadSection = document.createElement('div');
    fileUploadSection.id = 'file-upload-section';
    fileUploadSection.className = 'gc-upload-section';
    soundMenu.appendChild(fileUploadSection);

    var uploadTitle = document.createElement('h3');
    uploadTitle.className = 'gc-upload-title';
    fileUploadSection.appendChild(uploadTitle);

    var fileNameInput = document.createElement('input');
    fileNameInput.type = 'text';
    fileNameInput.id = 'file-name-input';
    fileNameInput.className = 'gc-text-input';
    fileUploadSection.appendChild(fileNameInput);

    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.mp3';
    fileInput.id = 'file-input';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', function(e) {
        var files = e.target.files;
        if (files.length > 0) {
            var file = files[0];
            if (file.size > 10 * 1024 * 1024) { // 10MB限制，原注释写的200MB，代码判断是10MB
                alert(languageMap[currentLanguage]['fileTooBig']);
                return;
            }
            if (!file.name.endsWith('.mp3')) {
                alert(languageMap[currentLanguage]['fileInvalid']);
                return;
            }
            var fileName = file.name;
            fileNameInput.value = fileName;
            uploadButton.disabled = false;
        }
    });
    fileUploadSection.appendChild(fileInput);

    var browseButton = document.createElement('button');
    browseButton.className = 'gc-btn gc-btn-secondary gc-btn-block';
    browseButton.addEventListener('click', function() {
        fileInput.click();
    });
    fileUploadSection.appendChild(browseButton);

    var uploadButton = document.createElement('button');
    uploadButton.id = 'upload-button';
    uploadButton.className = 'gc-btn gc-btn-primary gc-btn-block';
    uploadButton.disabled = true;
    uploadButton.addEventListener('click', function() {
        if (fileInput.files.length > 0 && fileNameInput.value.trim() !== '') {
            var file = fileInput.files[0];
            var reader = new FileReader();
            reader.onload = function(event) {
                var audio = new Audio(event.target.result);
                audioCache[fileNameInput.value] = audio;
                generateButtons();
                fileInput.value = '';
                fileNameInput.value = '';
                uploadButton.disabled = true;
            };
            reader.readAsDataURL(file);
        }
    });
    fileUploadSection.appendChild(uploadButton);

    var fileDisplay = document.createElement('div');
    fileDisplay.id = 'file-display';
    fileDisplay.className = 'gc-file-display';
    soundMenu.appendChild(fileDisplay);

    function removeFile() {
        fileInput.value = '';
        fileNameInput.value = '';
        fileDisplay.textContent = '';
        fileDisplay.style.display = 'none';
        uploadButton.disabled = true;
    }

    function toggleMenu() {
        var menu = document.getElementById('sound-menu');
        if (menu.style.display === 'none' || menu.style.display === '') {
            menu.style.display = 'block';
        } else {
            menu.style.display = 'none';
        }
    }

    function setLanguage(lang) {
        currentLanguage = lang;
        updateUIText();
        generateButtons();
    }

    function updateUIText() {
        const lang = languageMap[currentLanguage];
        menuTitle.textContent = lang.title;
        volumeLabel.textContent = lang.sound;
        fileNameInput.placeholder = lang.inputPlaceholder;
        uploadTitle.textContent = lang.uploadAudio;
        browseButton.textContent = lang.browseFile;
        uploadButton.textContent = lang.upload;
        visitAuthorTitle.textContent = lang.viewAuthor;
    }

    function setVolume(volume) {
        Object.values(audioCache).forEach(function(audio) {
            audio.volume = volume;
        });
    }

    // 预加载预设客舱广播音频；单个源失败时自动切换到下一个镜像
    function tryNextSource(audio, urls, index, name) {
        if (index >= urls.length) {
            console.error('音频加载失败（所有源均不可用）:', name);
            return;
        }
        var src = urls[index];
        audio.onerror = function() {
            audio.onerror = null;
            console.warn('音频源加载失败，尝试下一个镜像:', src);
            tryNextSource(audio, urls, index + 1, name);
        };
        audio.src = src;
        audio.load();
    }

    function loadPresetSounds() {
        presetSounds.forEach(function(item) {
            var audio = new Audio();
            audio.preload = 'auto';
            audio.volume = volumeSlider.value;
            audioCache[item.name] = audio;
            tryNextSource(audio, item.urls, 0, item.name);
        });
    }

    function playSound(soundName, button) {
        var audio = audioCache[soundName];
        if (audio) {
            var playPauseIcon = button.querySelector('span');
            if (!audio.paused) {
                audio.pause();
                audio.currentTime = 0;
                button.querySelector('.progress-bar').style.width = '0%';
                playPauseIcon.textContent = '▶';
            } else {
                audio.play().catch(function(err) {
                    console.error('播放失败:', soundName, err);
                });
                audio.addEventListener('timeupdate', function() {
                    var progress = (audio.currentTime / audio.duration) * 100;
                    button.querySelector('.progress-bar').style.width = progress + '%';
                });
                audio.addEventListener('ended', function() {
                    button.querySelector('.progress-bar').style.width = '0%';
                    playPauseIcon.textContent = '▶';
                });
                playPauseIcon.textContent = '▐▐';
            }
        } else {
            console.error('Audio not found:', soundName);
        }
    }

    // 根据当前语言取得显示名；预设音频返回中文或英文，上传音频返回原名
    function getDisplayName(soundKey) {
        var info = presetNameMap[soundKey];
        if (info) {
            return currentLanguage === 'English' ? info.en : info.zh;
        }
        return soundKey;
    }

    // 取得双语悬浮提示：预设音频显示“中文 / English”，上传音频只显示原名
    function getBilingualTitle(soundKey) {
        var info = presetNameMap[soundKey];
        if (info) {
            return info.zh + ' / ' + info.en;
        }
        return soundKey;
    }

    // 构建单个声音卡片（保持与原版一致的选择器结构：第一个 span 为播放图标，.progress-bar 为进度条）
    function buildSoundCard(sound) {
        var button = document.createElement('button');
        button.className = 'gc-sound-btn';
        button.dataset.name = sound;
        button.title = getBilingualTitle(sound);

        var row = document.createElement('div');
        row.className = 'gc-sound-row';

        var playPauseIcon = document.createElement('span');
        playPauseIcon.className = 'gc-play-icon';
        playPauseIcon.textContent = '▶';
        row.appendChild(playPauseIcon);

        var nameLabel = document.createElement('span');
        nameLabel.className = 'gc-sound-name';
        nameLabel.textContent = getDisplayName(sound);
        row.appendChild(nameLabel);

        button.appendChild(row);

        var track = document.createElement('div');
        track.className = 'gc-progress-track';
        button.appendChild(track);

        var bar = document.createElement('div');
        bar.className = 'progress-bar';
        track.appendChild(bar);

        button.addEventListener('click', function() {
            playSound(sound, button);
        });

        return button;
    }

    function generateButtons() {
        soundList.innerHTML = '';
        sounds.forEach(function(sound) {
            soundList.appendChild(buildSoundCard(sound));
        });
        Object.keys(audioCache).forEach(function(sound) {
            if (!sounds.includes(sound)) {
                soundList.appendChild(buildSoundCard(sound));
            }
        });
    }

    // ========== 作者区域 ==========
    var visitAuthorSection = document.createElement('div');
    visitAuthorSection.id = 'visit-author-section';
    visitAuthorSection.className = 'gc-author-section';
    soundMenu.appendChild(visitAuthorSection);

    var visitAuthorTitle = document.createElement('h3');
    visitAuthorTitle.className = 'gc-author-title';
    visitAuthorSection.appendChild(visitAuthorTitle);

    var linksRow = document.createElement('div');
    linksRow.className = 'gc-links-row';
    visitAuthorSection.appendChild(linksRow);

    var bilibiliLink = document.createElement('img');
    bilibiliLink.src = 'https://i.ibb.co/WBXZKn9/bl.png';
    bilibiliLink.alt = 'Bilibili Link';
    bilibiliLink.className = 'gc-author-icon';
    bilibiliLink.addEventListener('click', function() {
        window.open('https://space.bilibili.com/3546746969917664?spm_id_from=333.1007.0.0', '_blank');
    });
    linksRow.appendChild(bilibiliLink);

    var XiaohongshuLink = document.createElement('img');
    XiaohongshuLink.src = 'https://bee-reg-ab.imagency.cn/mr/202610/21/6ad897f384999.png';
    XiaohongshuLink.alt = 'Xiaohongshu Link';
    XiaohongshuLink.className = 'gc-author-icon';
    XiaohongshuLink.addEventListener('click', function() {
        window.open('https://www.xiaohongshu.com/user/profile/67f26ec0000000000e011a93', '_blank');
    });
    linksRow.appendChild(XiaohongshuLink);

    var GithubLink = document.createElement('img');
    GithubLink.src = 'https://i.ibb.co/KxSPzsbb/Git-Hub-Link.png';
    GithubLink.alt = 'Github Link';
    GithubLink.className = 'gc-author-icon';
    GithubLink.addEventListener('click', function() {
        window.open('https://github.com/zssszscnplane', '_blank');
    });
    linksRow.appendChild(GithubLink);

    // ========== 初始化 ==========
    loadPresetSounds();
    generateButtons();
    updateUIText();

    soundButton.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        console.log('Sound button clicked');
        toggleMenu();
    });

    document.addEventListener('keydown', function(event) {
        if (event.altKey && event.key === 'y') {
            toggleMenu();
        }
    });
})();
