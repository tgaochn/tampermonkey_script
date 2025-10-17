// ==UserScript==
// @name         Make BiliBili Great Again
// @namespace    https://www.kookxiang.com/
// @version      0.1.0
// @description  useful tweaks for bilibili.com
// @author       kookxiang
// @match        https://*.bilibili.com/*
// @run-at       document-body
// @grant        unsafeWindow
// @grant        GM_addStyle
// @grant        GM_notification
// @updateURL       https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_common/MakeBiliBiliGreatAgain/MakeBiliBiliGreatAgain.js
// @downloadURL     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_common/MakeBiliBiliGreatAgain/MakeBiliBiliGreatAgain.js
// ==/UserScript==
// 0.1.0: move to _common folder

// personal forked version: changed the "去 P2P CDN" part according to:
// https://greasyfork.org/zh-CN/scripts/415714-make-bilibili-great-again/discussions/249082

// 去掉叔叔去世时的全站黑白效果
GM_addStyle("html, body { -webkit-filter: none !important; filter: none !important; }");

// 没用的 URL 参数
const uselessUrlParams = [
    'buvid',
    'is_story_h5',
    'launch_id',
    'live_from',
    'mid',
    'session_id',
    'timestamp',
    'up_id',
    'vd_source',
    /^share/,
    /^spm/,
];

// Block WebRTC，CNM 陈睿你就缺这点棺材钱？
try {
    Object.defineProperty(unsafeWindow, 'webkitRTCPeerConnection', { value: undefined, enumerable: false, writable: false });
} catch (e) { }

// 移除鸿蒙字体，系统自带它不香吗？
window.addEventListener('load', function () {
    document.body.classList.remove('harmony-font');
})

// 首页优化
if (location.host === "www.bilibili.com") {
    GM_addStyle('.feed2 .feed-card:has(a[href*="cm.bilibili.com"]) { display: none } .feed2 .container > * { margin-top: 0 !important }');
}

// 动态页面优化
if (location.host === "t.bilibili.com") {
    GM_addStyle("html[wide] #app { display: flex; } html[wide] .bili-dyn-home--member { box-sizing: border-box;padding: 0 10px;width: 100%;flex: 1; } html[wide] .bili-dyn-content { width: initial; } html[wide] main { margin: 0 8px;flex: 1;overflow: hidden;width: initial; } #wide-mode-switch { margin-left: 0;margin-right: 20px; } .bili-dyn-list__item:has(.bili-dyn-card-goods), .bili-dyn-list__item:has(.bili-rich-text-module.goods) { display: none !important }");
    if (!localStorage.WIDE_OPT_OUT) {
        document.documentElement.setAttribute('wide', 'wide');
    }
    window.addEventListener('load', function () {
        const tabContainer = document.querySelector('.bili-dyn-list-tabs__list');
        const placeHolder = document.createElement('div');
        placeHolder.style.flex = 1;
        const switchButton = document.createElement('a');
        switchButton.id = 'wide-mode-switch';
        switchButton.className = 'bili-dyn-list-tabs__item';
        switchButton.textContent = '宽屏模式';
        switchButton.addEventListener('click', function (e) {
            e.preventDefault();
            if (localStorage.WIDE_OPT_OUT) {
                localStorage.removeItem('WIDE_OPT_OUT');
                document.documentElement.setAttribute('wide', 'wide');
            } else {
                localStorage.setItem('WIDE_OPT_OUT', '1');
                document.documentElement.removeAttribute('wide');
            }
        })
        tabContainer.appendChild(placeHolder);
        tabContainer.appendChild(switchButton);
    })
}

// 去广告
GM_addStyle('.ad-report, a[href*="cm.bilibili.com"] { display: none !important; }');
if (unsafeWindow.__INITIAL_STATE__?.adData) {
    for (const key in unsafeWindow.__INITIAL_STATE__.adData) {
        if (!Array.isArray(unsafeWindow.__INITIAL_STATE__.adData[key])) continue;
        for (const item of unsafeWindow.__INITIAL_STATE__.adData[key]) {
            item.name = 'B 站未来有可能会倒闭，但绝不会变质';
            item.pic = 'https://static.hdslb.com/images/transparent.gif';
            item.url = 'https://space.bilibili.com/208259';
        }
    }
}

// 去充电列表（叔叔的跳过按钮越做越小了，就尼玛离谱）
if (unsafeWindow.__INITIAL_STATE__?.elecFullInfo) {
    delete unsafeWindow.__INITIAL_STATE__.elecFullInfo;
}

// 修复文章区复制
if (location.href.startsWith('https://www.bilibili.com/read/cv')) {
    unsafeWindow.original.reprint = "1";
    document.querySelector('.article-holder').classList.remove("unable-reprint");
    document.querySelector('.article-holder').addEventListener('copy', e => e.stopImmediatePropagation(), true);
}

// 去 P2P CDN
Object.defineProperty(unsafeWindow, 'PCDNLoader', { value: class { }, enumerable: false, writable: false });
Object.defineProperty(unsafeWindow, 'BPP2PSDK', { value: class { on() { } }, enumerable: false, writable: false });
Object.defineProperty(unsafeWindow, 'SeederSDK', { value: class { }, enumerable: false, writable: false });

if (location.href.startsWith('https://www.bilibili.com/video/') || location.href.startsWith('https://www.bilibili.com/bangumi/play/')) {
    let cdnDomain;

    function replaceP2PUrl(url) {
        cdnDomain ||= document.head.innerHTML.match(/up[\w-]+\.bilivideo\.com/)?.[0];

        try {
            const urlObj = new URL(url);
            const hostName = urlObj.hostname;
            const port = urlObj.port;

            // 如果是 P2P CDN 域名，替换为传统 CDN 域名并使用443端口
            if (urlObj.hostname.endsWith(".mcdn.bilivideo.cn") || urlObj.hostname.endsWith(".szbdyd.com")) {
                if (port && !['80', '443'].includes(port)) {
                    urlObj.port = '443'; // 强制使用443端口
                    console.warn(`更换视频源端口: ${port} -> ${urlObj.port}`);
                }
                urlObj.hostname = cdnDomain || 'upos-hz-mirrorakam.akamaized.net'; // 替换为传统 CDN 域名
                console.warn(`更换视频源: ${hostName} -> ${urlObj.hostname}`);
                return urlObj.toString();
            }

            return url;
        } catch (e) {
            console.error('URL 替换错误:', e);
            return url;
        }
    }

    function replaceP2PUrlDeep(obj) {
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                obj[key] = replaceP2PUrl(obj[key]);
            } else if (typeof obj[key] === 'object') {
                replaceP2PUrlDeep(obj[key]);
            }
        }
    }

    // 替换初始播放信息中的 P2P URL
    replaceP2PUrlDeep(unsafeWindow.__playinfo__);

    // 拦截 XMLHttpRequest，替换 P2P URL
    (function (open) {
        unsafeWindow.XMLHttpRequest.prototype.open = function () {
            try {
                arguments[1] = replaceP2PUrl(arguments[1]);
            } finally {
                return open.apply(this, arguments);
            }
        }
    })(unsafeWindow.XMLHttpRequest.prototype.open);

    // 拦截 fetch 请求，替换 P2P URL
    const originalFetch = unsafeWindow.fetch;
    unsafeWindow.fetch = function () {
        arguments[0] = replaceP2PUrl(arguments[0]);
        return originalFetch.apply(this, arguments);
    };
}

// 真·原画直播
if (location.href.startsWith('https://live.bilibili.com/')) {
    unsafeWindow.forceHighestQuality = true;
    let recentErrors = 0;
    setInterval(() => recentErrors > 0 ? recentErrors / 2 : null, 10000);

    const oldFetch = unsafeWindow.fetch;
    unsafeWindow.fetch = function (url) {
        try {
            const mcdnRegexp = /[xy0-9]+\.mcdn\.bilivideo\.cn:\d+/
            const qualityRegexp = /(live-bvc\/\d+\/live_\d+_\d+)_\w+/;
            if (mcdnRegexp.test(arguments[0]) && unsafeWindow.disableMcdn) {
                return Promise.reject();
            }
            if (qualityRegexp.test(arguments[0]) && unsafeWindow.forceHighestQuality) {
                arguments[0] = arguments[0]
                    .replace(qualityRegexp, '$1')
                    .replace(/(\d+)_(mini|pro)hevc/g, '$1');
            }
            const promise = oldFetch.apply(this, arguments);
            promise.then(response => {
                if (!url.match(/\.(m3u8|m4s)/)) return;
                if ([403, 404].includes(response.status)) recentErrors++;
                if (recentErrors >= 5 && unsafeWindow.forceHighestQuality) {
                    recentErrors = 0;
                    unsafeWindow.forceHighestQuality = false;
                    GM_notification({ title: '最高清晰度可能不可用', text: '已为您自动切换至播放器上选择的清晰度.', timeout: 3000, silent: true });
                }
            });
            return promise;
        } catch (e) { }
        return oldFetch.apply(this, arguments);
    }
}

// 视频裁切
if (location.href.startsWith('https://www.bilibili.com/video/')) {
    GM_addStyle("body[video-fit] #bilibili-player video { object-fit: cover; } .bpx-player-ctrl-setting-fit-mode { display: flex;width: 100%;height: 32px;line-height: 32px; } .bpx-player-ctrl-setting-box .bui-panel-wrap, .bpx-player-ctrl-setting-box .bui-panel-item { min-height: 172px !important; }");
    let timer;
    function toggleMode(enabled) {
        if (enabled) {
            document.body.setAttribute('video-fit', '');
        } else {
            document.body.removeAttribute('video-fit');
        }
    }
    function injectButton() {
        if (!document.querySelector('.bpx-player-ctrl-setting-menu-left')) {
            return;
        }
        clearInterval(timer);
        const parent = document.querySelector('.bpx-player-ctrl-setting-menu-left');
        const item = document.createElement('div');
        item.className = 'bpx-player-ctrl-setting-fit-mode bui bui-switch';
        item.innerHTML = '<input class="bui-switch-input" type="checkbox"><label class="bui-switch-label"><span class="bui-switch-name">裁切模式</span><span class="bui-switch-body"><span class="bui-switch-dot"><span></span></span></span></label>';
        parent.insertBefore(item, document.querySelector('.bpx-player-ctrl-setting-more'));
        document.querySelector('.bpx-player-ctrl-setting-fit-mode input').addEventListener('change', e => toggleMode(e.target.checked));
        document.querySelector('.bpx-player-ctrl-setting-box .bui-panel-item').style.height = '';
    }
    timer = setInterval(injectButton, 200);
}

// 去除地址栏多余参数
unsafeWindow.history.replaceState(undefined, undefined, removeTracking(location.href));
const pushState = unsafeWindow.history.pushState;
unsafeWindow.history.pushState = function (state, unused, url) {
    return pushState.apply(this, [state, unused, removeTracking(url)]);
}
const replaceState = unsafeWindow.history.replaceState;
unsafeWindow.history.replaceState = function (state, unused, url) {
    return replaceState.apply(this, [state, unused, removeTracking(url)]);
}

function removeTracking(url) {
    if (!url) return url;
    try {
        const [base, search] = url.split('?');
        if (!search) return url;
        const searchParams = new URLSearchParams('?' + search);
        const keys = Array.from(searchParams.keys());
        for (const key of keys) {
            uselessUrlParams.forEach(item => {
                if (typeof item === 'string') {
                    if (item === key) searchParams.delete(key);
                } else if (item instanceof RegExp) {
                    if (item.test(key)) searchParams.delete(key);
                }
            });
        }
        if (location.pathname === base && !searchParams.size) return;
        return [base, searchParams.toString()].filter(Boolean).join('?');
    } catch (e) {
        return url;
    }
}

// 去掉 B 站的傻逼上报
!function () {
    const oldFetch = unsafeWindow.fetch;
    unsafeWindow.fetch = function (url) {
        if (typeof url === 'string' && url.includes('data.bilibili.com'))
            return Promise.resolve(new Response());
        return oldFetch.apply(this, arguments);
    }
    const oldSend = unsafeWindow.XMLHttpRequest.prototype.open;
    unsafeWindow.XMLHttpRequest.prototype.open = function (method, url) {
        if (typeof url === 'string' && url.includes('data.bilibili.com')) {
            this.send = function () { };
            return;
        }
        return oldSend.apply(this, arguments);
    }
    unsafeWindow.navigator.sendBeacon = () => Promise.resolve();

    unsafeWindow.MReporter = function () { };
    unsafeWindow.MReporter.appear = function () { };
    unsafeWindow.MReporter.click = function () { };
    unsafeWindow.MReporter.tech = function () { };
    unsafeWindow.MReporter.pv = function () { };
    unsafeWindow.MReporter.import = { auto() { } };

    const sentryHub = class { bindClient() { } }
    const fakeSentry = {
        SDK_NAME: 'sentry.javascript.browser',
        SDK_VERSION: '0.0.0',
        BrowserClient: class { },
        Hub: sentryHub,
        Integrations: {
            Vue: class { },
            GlobalHandlers: class { },
            InboundFilters: class { },
        },
        init() { },
        configureScope() { },
        getCurrentHub: () => new sentryHub(),
        setContext() { },
        setExtra() { },
        setExtras() { },
        setTag() { },
        setTags() { },
        setUser() { },
        wrap() { },
    }
    if (!unsafeWindow.Sentry || unsafeWindow.Sentry.SDK_VERSION !== fakeSentry.SDK_VERSION) {
        if (unsafeWindow.Sentry) { delete unsafeWindow.Sentry }
        Object.defineProperty(unsafeWindow, 'Sentry', { value: fakeSentry, enumerable: false, writable: false });
    }
    Object.defineProperty(unsafeWindow, 'ReporterPb', { value: class { click() { } custom() { } exposure() { } report() { } tech() { } pv() { } }, enumerable: false, writable: false });

    Object.defineProperty(unsafeWindow, '__biliUserFp__', {
        get() { return { init() { }, queryUserLog() { return [] } } },
        set() { },
    });
    Object.defineProperty(unsafeWindow, '__USER_FP_CONFIG__', { get() { return undefined }, set() { } });
    Object.defineProperty(unsafeWindow, '__MIRROR_CONFIG__', { get() { return undefined }, set() { } });
}()