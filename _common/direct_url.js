// ==UserScript==
// @name             0_外链确认页自动跳过
// @namespace        DirectUrl
// @version          0.2.0
// @description      自动跳过"您即将离开本站"这类外链确认页, 直接打开背后的真实 URL; 目前只对百度贴吧启用, 其它站点规则保留, 把对应 @match 加回来即可
// @author           gtfish
// @match            https://tieba.baidu.com/*
// @match            http://tieba.baidu.com/*
// @grant            GM_registerMenuCommand
// @grant            GM_getValue
// @grant            GM_setValue
// @grant            GM_setClipboard
// @run-at           document-start
// @noframes
// @license          GNU General Public License v3.0
// @updateURL        https://raw.githubusercontent.com/tgaochn/tampermonkey_script/refs/heads/master/_common/direct_url.js
// @downloadURL      https://raw.githubusercontent.com/tgaochn/tampermonkey_script/refs/heads/master/_common/direct_url.js
// ==/UserScript==
// 0.2.0: 只对百度贴吧启用 (原来 @match *://*/*), 正常网页上不再注入, 也就没有每页一次的
//        正文扫描开销; 其它站点的规则都还在, 想启用哪个就加一条 @match (或用回 *://*/*)。
//        通用识别只对 "URL/标题看起来像确认页" 的页面做文本扫描, 普通页面直接跳过。
// 0.1.0: 第一版: 站点规则 (贴吧/知乎/掘金/CSDN/简书/豆瓣/微博/QQ/Steam/Google/Facebook/Reddit/YouTube/Discord/Pinterest/VK/必应/领英/Slack)
//        + 未知站点通用识别 + 点击链接就地改写 + 右键菜单手动打开/复制
//
// 原理:
//   贴吧的 "您即将离开贴吧跳转到如下网址" 页 (tieba.baidu.com/mo/q/checkurl?url=...) 之类
//   的确认页, 真实地址本来就在页面里: 要么是 URL 参数 (url= / target= / u= / pfurl= ...),
//   要么是页面渲染用的配置 (贴吧是 window.TBCONFIG.jumpUrl), 要么就明晃晃写在正文里。
//   "继续访问" 按钮做的事也只是 location 跳过去, 所以脚本自己读出来直接 replace 即可,
//   等价于点按钮, 但不用等页面渲染、不用多点一次。
//
//   三层处理:
//     1. 站点规则: 看 URL 就知道是不是跳转器, 参数解出来就跳 (document-start 就能跳, 几乎无感)
//     2. 通用识别: 只有 URL/标题像确认页时才去扫正文, 按 "确认页" 特征 (即将离开 / 安全提示 /
//        继续访问 + 很短的正文) 评分, 再从 参数 / 正文 / 外链 里找目标地址
//     3. 兜底: 右键菜单手动打开 / 复制; 点击链接时也能就地把跳转器改写成真实地址
//
//   安全阀: 通用识别只认站外地址; 不跳当前页; 同一地址 2.5 秒内不重复跳, 8 秒内最多连跳 6 次
//          (防环); 正文超过 MAX_TEXT_LEN 的页面 (像文章) 不做通用识别, 避免误伤正常页面。
(function () {
    "use strict";

    /* !! -------------------------------------------------------------------------- */
    /*                                !! 可改的配置                                  */
    /* !! -------------------------------------------------------------------------- */

    // 自动跳转的默认值 (右键菜单里可以改, 改完存进 GM 存储, 刷新页面生效)
    var AUTO_DEFAULT = true;

    // 点击链接时就地改写: 把 .../checkurl?url=... 这类跳转器直接换成目标地址, 连确认页都不打开
    var REWRITE_LINKS = true;

    // 通用识别: 正文超过这么多字符就当成正常文章, 不自动跳
    var MAX_TEXT_LEN = 1200;

    // 通用识别的最低得分 (见 interstitialScore), 数值越大越保守
    var MIN_SCORE = 5;

    // 打印调试日志
    var DEBUG = false;

    /* !! -------------------------------------------------------------------------- */
    /*                                !! 日志 / 存储                                */
    /* !! -------------------------------------------------------------------------- */

    function log() {
        try {
            console.log.apply(console, ["[直达]"].concat(Array.prototype.slice.call(arguments)));
        } catch (e) {
            /* 忽略 */
        }
    }

    function dbg() {
        if (DEBUG) log.apply(null, arguments);
    }

    function readAuto() {
        try {
            var v = GM_getValue("auto");
            return typeof v === "boolean" ? v : AUTO_DEFAULT;
        } catch (e) {
            return AUTO_DEFAULT;
        }
    }

    function writeAuto(v) {
        try {
            GM_setValue("auto", v);
        } catch (e) {
            /* 忽略 */
        }
    }

    /* !! -------------------------------------------------------------------------- */
    /*                            !! URL / 编码 相关工具                            */
    /* !! -------------------------------------------------------------------------- */

    // decodeURIComponent 遇到坏编码 (例如用户的 URL 里有裸 %) 会抛异常, 这里兜底
    function tryDecodeURI(s) {
        try {
            return decodeURIComponent(s);
        } catch (e) {
            return s;
        }
    }

    function bytesToText(bytes) {
        try {
            return new TextDecoder("utf-8").decode(bytes);
        } catch (e) {
            var out = "";
            for (var i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
            return out;
        }
    }

    // 微博 sinaurl 的 u= 、必应 ck/a 的 u=a1... 都是 base64 / base64url
    function base64ToText(b64) {
        var s = String(b64).replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
        while (s.length % 4) s += "=";
        try {
            var bin = atob(s);
            var bytes = new Uint8Array(bin.length);
            for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            return bytesToText(bytes);
        } catch (e) {
            return "";
        }
    }

    // 百度跳转页有些场景给的是十六进制串
    function hexToText(hex) {
        if (hex.length % 2 !== 0) return "";
        var bytes = [];
        for (var i = 0; i < hex.length; i += 2) {
            var b = parseInt(hex.substr(i, 2), 16);
            if (isNaN(b)) return "";
            bytes.push(b);
        }
        return bytesToText(bytes);
    }

    var WRAPPER_PAIRS = {
        '"': '"', "'": "'", "`": "`", "(": ")", "（": "）", "[": "]", "【": "】", "「": "」", "《": "》", "<": ">",
    };

    // 去掉包裹整段地址的引号/括号, 例如 "https://a.com" 或 (https://a.com)
    function stripWrapper(s) {
        var open = s.charAt(0);
        if (!WRAPPER_PAIRS[open]) return s;
        if (s.charAt(s.length - 1) !== WRAPPER_PAIRS[open]) return s;
        return s.slice(1, -1).trim();
    }

    var HTTP_RE = /^https?:\/\//i;

    // 把一坨字符串整理成 URL 对象; 不是网址就返回 null
    function asTarget(raw) {
        if (!raw) return null;
        var s = stripWrapper(String(raw).trim());
        if (!s) return null;
        if (s.indexOf("://") < 0) {
            if (s.indexOf("//") === 0) {
                s = "https:" + s;
            } else if (/^[\w-]+(\.[\w-]+)+(:\d+)?([/?#]|$)/.test(s)) {
                s = "https://" + s;
            } else {
                return null;
            }
        }
        if (!HTTP_RE.test(s)) return null;
        try {
            return new URL(s);
        } catch (e) {
            return null;
        }
    }

    // 解析一个"可能是地址"的值: 明文 / 多层百分号编码 / base64 / hex 都试一遍
    function decodeToTarget(raw) {
        if (!raw) return null;
        var s = String(raw).trim();
        if (!s) return null;

        // 0. 还原可能存在的多层百分号编码 (?url=https%253A%252F%252F...);
        //    一旦已经是合法地址就停手, 否则会把目标路径里正常的 %2F 多解一层
        for (var i = 0; i < 3 && !asTarget(s) && /%[0-9a-f]{2}/i.test(s); i++) {
            var d = tryDecodeURI(s);
            if (d === s) break;
            s = d;
        }

        var direct = asTarget(s);
        if (direct) return direct;

        // 1. base64 / base64url
        if (/^[A-Za-z0-9+/_-]{8,}={0,2}$/.test(s)) {
            var t = asTarget(base64ToText(s));
            if (t) return t;
        }

        // 2. 必应的 u=a1<base64url>: 先按原样解 (上面已试), 再试试去掉 a1 前缀
        var b64 = s.replace(/^a1(?=[A-Za-z0-9_+/=-]{8,}$)/, "");
        if (b64 !== s && /^[A-Za-z0-9+/_-]{8,}={0,2}$/.test(b64)) {
            t = asTarget(base64ToText(b64));
            if (t) return t;
        }

        // 3. hex
        if (/^[0-9a-f]+$/i.test(s) && s.length % 2 === 0 && s.length >= 8) {
            var h = asTarget(hexToText(s));
            if (h) return h;
        }
        return null;
    }

    // 直接读原始 query, 不把 + 当空格 (目标地址里可能有 +), 只解百分号编码
    function rawParam(search, name) {
        var parts = String(search || "").replace(/^\?/, "").split("&");
        for (var i = 0; i < parts.length; i++) {
            var eq = parts[i].indexOf("=");
            if (eq < 0) continue;
            if (parts[i].slice(0, eq) !== name) continue;
            return tryDecodeURI(parts[i].slice(eq + 1));
        }
        return "";
    }

    // 按优先级取第一个非空参数
    function getParam(u, names) {
        for (var i = 0; i < names.length; i++) {
            var v = rawParam(u.search, names[i]);
            if (v) return v;
        }
        return "";
    }

    function isSelf(t) {
        try {
            if (t.href === location.href) return true;
            if (t.origin !== location.origin) return false;
            var strip = function (p) {
                return (p || "/").replace(/\/+$/, "") || "/";
            };
            return strip(t.pathname) === strip(location.pathname) && t.search === location.search;
        } catch (e) {
            return false;
        }
    }

    // 确认页跳的永远是站外地址; 用这一条过滤掉页面上的站内链接
    function isExternal(t) {
        try {
            return t.hostname !== location.hostname;
        } catch (e) {
            return false;
        }
    }

    /* !! -------------------------------------------------------------------------- */
    /*                                 !! 防环 / 跳转                               */
    /* !! -------------------------------------------------------------------------- */

    var GUARD_KEY = "direct_url_history";

    // 8 秒内的跳转历史: 同一个地址 2.5 秒内不重复跳, 且最多连跳 6 次,
    // 防止 A -> B -> A 这种互相跳。间隔久一点就放行, 用户按返回又回到确认页时还能自动跳。
    function guardAllows(target) {
        var now = Date.now();
        var hist = [];
        try {
            hist = JSON.parse(sessionStorage.getItem(GUARD_KEY) || "[]");
            if (!Array.isArray(hist)) hist = [];
        } catch (e) {
            hist = [];
        }
        hist = hist.filter(function (x) {
            return x && typeof x.t === "number" && now - x.t < 8000;
        });
        for (var i = 0; i < hist.length; i++) {
            if (hist[i].url === target && now - hist[i].t < 2500) return false;
        }
        if (hist.length >= 6) return false;
        hist.push({ url: target, t: now });
        try {
            sessionStorage.setItem(GUARD_KEY, JSON.stringify(hist));
        } catch (e) {
            /* 隐私模式等场景忽略 */
        }
        return true;
    }

    function go(target, why) {
        if (!target || isSelf(target)) return false;
        if (!guardAllows(target.href)) {
            dbg("防环: 刚刚跳过这个地址, 不再重复 ->", target.href);
            return false;
        }
        log("跳过确认页 ->", target.href, "[" + why + "]");
        try {
            location.replace(target.href);
        } catch (e) {
            location.href = target.href;
        }
        return true;
    }

    /* !! -------------------------------------------------------------------------- */
    /*                                 !! 站点规则                                  */
    /* !! -------------------------------------------------------------------------- */

    // test(u): 当前地址是不是该站的"外链确认页/跳转器"
    // resolve(u): 返回真实地址 (未解码的原始值也可以, 统一交给 decodeToTarget)
    // 只认站点自己的跳转路径, 不会把正常页面误判成确认页
    //
    // 注意: 现在 @match 只开了百度贴吧, 下面其它站点的规则在贴吧页面上永远不会命中;
    // 留着是为了以后想启用时只加 @match 就行, 不用回来改代码。
    var SITE_RULES = [
        {
            name: "百度贴吧",
            test: function (u) {
                return u.hostname === "tieba.baidu.com" && /^\/mo\/q\/checkurl/.test(u.pathname);
            },
            resolve: function (u) {
                // ?url= 是明文目标; 页面渲染后还会写一份 window.TBCONFIG.jumpUrl
                return getParam(u, ["url"]) || (window.TBCONFIG && window.TBCONFIG.jumpUrl) || "";
            },
        },
        {
            name: "百度跳转",
            test: function (u) {
                return /^jump\d*\.bdimg\.com$/.test(u.hostname);
            },
            resolve: function (u) {
                return getParam(u, ["url", "u"]);
            },
        },
        {
            name: "知乎",
            test: function (u) {
                return u.hostname === "link.zhihu.com";
            },
            resolve: function (u) {
                return getParam(u, ["target", "url"]);
            },
        },
        {
            name: "掘金",
            test: function (u) {
                return u.hostname === "link.juejin.cn";
            },
            resolve: function (u) {
                return getParam(u, ["target", "url"]);
            },
        },
        {
            name: "CSDN",
            test: function (u) {
                return u.hostname === "link.csdn.net";
            },
            resolve: function (u) {
                return getParam(u, ["target", "url"]);
            },
        },
        {
            name: "简书",
            test: function (u) {
                return /(^|\.)jianshu\.com$/.test(u.hostname) && /^\/go-wild/.test(u.pathname);
            },
            resolve: function (u) {
                return getParam(u, ["url"]);
            },
        },
        {
            name: "豆瓣",
            test: function (u) {
                return /(^|\.)douban\.com$/.test(u.hostname) && /^\/link2\//.test(u.pathname);
            },
            resolve: function (u) {
                return getParam(u, ["url"]);
            },
        },
        {
            name: "微博",
            test: function (u) {
                return /(^|\.)weibo\.cn$/.test(u.hostname) && /\/sinaurl$/.test(u.pathname);
            },
            resolve: function (u) {
                return getParam(u, ["u", "url"]);
            },
        },
        {
            name: "腾讯跳转",
            test: function (u) {
                return u.hostname === "c.pc.qq.com" && /^\/middle\.html/.test(u.pathname);
            },
            resolve: function (u) {
                return getParam(u, ["pfurl", "url"]);
            },
        },
        {
            name: "Steam",
            test: function (u) {
                return /(^|\.)steamcommunity\.com$/.test(u.hostname) && /^\/linkfilter\//.test(u.pathname);
            },
            resolve: function (u) {
                return getParam(u, ["url"]);
            },
        },
        {
            name: "Google",
            test: function (u) {
                return /(^|\.)google\.[a-z.]+$/.test(u.hostname) && /^\/url$/.test(u.pathname);
            },
            resolve: function (u) {
                return getParam(u, ["q", "url"]);
            },
        },
        {
            name: "Facebook",
            test: function (u) {
                return /(^|\.)facebook\.com$/.test(u.hostname) && /^\/l\.php$/.test(u.pathname);
            },
            resolve: function (u) {
                return getParam(u, ["u"]);
            },
        },
        {
            name: "Reddit",
            test: function (u) {
                return u.hostname === "out.reddit.com" || (/(^|\.)reddit\.com$/.test(u.hostname) && /^\/link\//.test(u.pathname));
            },
            resolve: function (u) {
                return getParam(u, ["url"]);
            },
        },
        {
            name: "YouTube",
            test: function (u) {
                return /(^|\.)youtube\.com$/.test(u.hostname) && /^\/redirect$/.test(u.pathname);
            },
            resolve: function (u) {
                return getParam(u, ["q"]);
            },
        },
        {
            name: "Discord",
            test: function (u) {
                return u.hostname === "l.discord.com";
            },
            resolve: function (u) {
                return getParam(u, ["url"]);
            },
        },
        {
            name: "Pinterest",
            test: function (u) {
                return /(^|\.)pinterest\.[a-z.]+$/.test(u.hostname) && /^\/offsite\//.test(u.pathname);
            },
            resolve: function (u) {
                return getParam(u, ["url"]);
            },
        },
        {
            name: "VK",
            test: function (u) {
                return /(^|\.)vk\.com$/.test(u.hostname) && /^\/away\.php$/.test(u.pathname);
            },
            resolve: function (u) {
                return getParam(u, ["to"]);
            },
        },
        {
            name: "必应",
            test: function (u) {
                return /(^|\.)bing\.com$/.test(u.hostname) && /^\/ck\/a/.test(u.pathname);
            },
            resolve: function (u) {
                return getParam(u, ["u", "url"]);
            },
        },
        {
            name: "领英",
            test: function (u) {
                return /(^|\.)linkedin\.com$/.test(u.hostname) && /^\/redir\/redirect/.test(u.pathname);
            },
            resolve: function (u) {
                return getParam(u, ["url"]);
            },
        },
        {
            name: "Slack",
            test: function (u) {
                return u.hostname === "slack-redir.net" && /\/link$/.test(u.pathname);
            },
            resolve: function (u) {
                return getParam(u, ["url"]);
            },
        },
    ];

    function safeResolve(rule, u) {
        try {
            return decodeToTarget(rule.resolve(u));
        } catch (e) {
            dbg(rule.name, "解析失败:", e);
            return null;
        }
    }

    function matchRule(u) {
        for (var i = 0; i < SITE_RULES.length; i++) {
            if (SITE_RULES[i].test(u)) return SITE_RULES[i];
        }
        return null;
    }

    // document-start 就能用的快路径: URL 里就带着目标地址的站点 (贴吧/知乎/必应 ...)
    function trySiteRules() {
        var u;
        try {
            u = new URL(location.href);
        } catch (e) {
            return false;
        }
        var rule = matchRule(u);
        if (!rule) return false;
        var target = safeResolve(rule, u);
        if (!target) {
            dbg(rule.name + ": 命中跳转器, 但目标地址还没出来, 稍后重试");
            return false;
        }
        return go(target, rule.name);
    }

    /* !! -------------------------------------------------------------------------- */
    /*                              !! 通用识别 (未知站点)                          */
    /* !! -------------------------------------------------------------------------- */

    var LEAVE_RE = /(即将|将要|马上|就要)\s*(离开|跳转|前往)|(离开|跳出)(本站|本网站|本页面|当前网站|当前页面|贴吧|论坛)|you(?:'re|’re| are) (?:about to |now )?(?:leave|leaving|be(?:ing)? redirected)|leaving (?:this|the|our) (?:site|website)/i;

    // 越像"外链确认页"得分越高; 正常文章里偶然出现一两个词是凑不到 MIN_SCORE 的
    function interstitialScore(text) {
        var score = 0;
        if (/(即将|将要|马上|就要)\s*(离开|跳转|前往)/.test(text)) score += 3;
        if (/(离开|跳出)(本站|本网站|本页面|当前网站|当前页面|贴吧|论坛)/.test(text)) score += 2;
        if (/未在.{0,20}安全范围|安全(提示|提醒|检查|确认)|跳转(提示|确认)/.test(text)) score += 1;
        if (/外部(网站|链接|网址)|站外|外链/.test(text)) score += 1;
        if (/(继续访问|继续前往|继续浏览|点击继续|确认访问|我已知晓|Continue|Proceed|I understand|Visit site)/i.test(text)) score += 2;
        if (/leaving (?:this|the|our) (?:site|website)|about to leave/i.test(text)) score += 1;
        if (/external (?:link|website)/i.test(text)) score += 1;
        if (text.length <= 300) score += 1;
        return score;
    }

    function pageText() {
        try {
            var body = document.body;
            if (!body) return "";
            var t = body.innerText;
            if (typeof t !== "string" || !t) t = body.textContent || "";
            return String(t).replace(/[\s\u00a0]+/g, " ").trim();
        } catch (e) {
            return "";
        }
    }

    var URL_IN_TEXT = /https?:\/\/[^\s<>"'`，。；：！？、（）【】「」《》]+/gi;

    function cleanTextUrl(s) {
        // 正文里的链接后面常跟标点, 从尾部一点点削掉
        return String(s).replace(/[.,;:!?)\]}>》」】]+$/, "");
    }

    // 页面上的地址可能是截断显示的 (https://github.com/...), 这种不能当目标用
    function looksTruncated(s) {
        return /[…]$/.test(s) || /\.\.\.$/.test(s);
    }

    function findTargetFromText(text) {
        var list = String(text || "").match(URL_IN_TEXT);
        if (!list) return null;
        for (var i = 0; i < list.length; i++) {
            if (looksTruncated(list[i])) continue;
            var t = decodeToTarget(cleanTextUrl(list[i]));
            if (t && !isSelf(t) && isExternal(t)) return t;
        }
        return null;
    }

    var PARAM_NAMES = [
        "url", "u", "target", "to", "pfurl", "q", "redirect", "redirect_url", "redirect_uri", "redirectUri",
        "dest", "destination", "goto", "jump", "jumpurl", "jumpUrl", "out", "link", "linkurl", "link_url",
        "returnurl", "return_url", "next",
    ];

    function targetFromParams(u) {
        for (var i = 0; i < PARAM_NAMES.length; i++) {
            var raw = getParam(u, [PARAM_NAMES[i]]);
            if (!raw) continue;
            var t = decodeToTarget(raw);
            if (t && !isSelf(t) && isExternal(t)) return t;
        }
        return null;
    }

    // 页面上的外链: 文字本身就是地址的最可信 (贴吧 safecheck 链接的可见文字就是目标地址)
    function findTargetFromLinks() {
        var nodes;
        try {
            nodes = document.querySelectorAll("a[href], [data-url], [data-href]");
        } catch (e) {
            return null;
        }
        var fallback = null;
        for (var i = 0; i < nodes.length; i++) {
            var el = nodes[i];
            var raw = el.getAttribute("href") || el.getAttribute("data-url") || el.getAttribute("data-href") || "";
            var t = decodeToTarget(raw);
            if (!t || isSelf(t) || !isExternal(t)) continue;
            var txt = String(el.textContent || "").trim();
            if (/^(https?:\/\/|www\.)/i.test(txt) && !looksTruncated(txt)) {
                var fromText = decodeToTarget(txt);
                if (fromText && !isSelf(fromText) && isExternal(fromText)) return fromText;
            }
            if (!fallback && HTTP_RE.test(raw)) fallback = t;
        }
        return fallback;
    }

    function findTargetFromPage(u) {
        var fromParams = targetFromParams(u);
        if (fromParams) return fromParams;
        var fromText = findTargetFromText(pageText());
        if (fromText) return fromText;
        return findTargetFromLinks();
    }

    var genericGaveUp = false;

    // 只有 URL 或标题看起来像确认页, 才值得去扫正文 (innerText 会触发排版, 是这里唯一的
    // 真正开销)。普通帖子页/首页连一次文本扫描都不会做, 所以常驻成本基本为零。
    var SUSPICIOUS_PATH_RE = /checkurl|safecheck|jump|redirect|linkfilter|link-filter|away|safety|confirm|leave|go-wild|sinaurl|middle\.html/i;
    var SUSPICIOUS_TITLE_RE = /提示|跳转|离开|安全|外链|confirm|redirect|leaving|safety|warning/i;
    var SUSPICIOUS_PARAM_RE = /[?&](url|u|target|to|pfurl|redirect|redirect_url|redirect_uri|jump|jumpurl|goto)=/i;

    function looksSuspicious() {
        try {
            if (SUSPICIOUS_PATH_RE.test(location.pathname)) return true;
            if (SUSPICIOUS_PARAM_RE.test(location.search)) return true;
            var title = String(document.title || "");
            return title ? SUSPICIOUS_TITLE_RE.test(title) : false;
        } catch (e) {
            return false;
        }
    }

    function tryGeneric(phase) {
        if (genericGaveUp) return false;
        if (!looksSuspicious()) return false;
        if (document.readyState === "loading" || !document.body) return false;

        var text = pageText();
        if (!text) return false;
        if (text.length > MAX_TEXT_LEN) {
            genericGaveUp = true; // 正文很长, 基本可以确定不是确认页
            return false;
        }
        if (!LEAVE_RE.test(text) || interstitialScore(text) < MIN_SCORE) {
            dbg(phase, "通用识别: 不像确认页, 得分", interstitialScore(text));
            return false;
        }

        var target;
        try {
            target = findTargetFromPage(new URL(location.href));
        } catch (e) {
            return false;
        }
        if (!target) {
            dbg(phase, "通用识别: 像确认页, 但还没找到目标地址");
            return false;
        }
        return go(target, "通用识别");
    }

    /* !! -------------------------------------------------------------------------- */
    /*                                 !! 自动执行                                  */
    /* !! -------------------------------------------------------------------------- */

    var autoOn = readAuto();
    var stopped = false;

    function attempt(phase) {
        if (stopped || !autoOn) return;
        if (trySiteRules()) {
            stopped = true;
            return;
        }
        if (tryGeneric(phase)) stopped = true;
    }

    // 先在 document-start 跑一次; 拿不到页面文本时 tryGeneric 会自己放弃, 等后面的重试
    attempt("start");

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            attempt("DOMContentLoaded");
        }, true);
    }
    window.addEventListener("load", function () {
        attempt("load");
    }, true);

    // 有些确认页是前端渲染出来的 (贴吧就是 TBCONFIG + 前端渲染), 多试几次
    [300, 1000, 2000, 4000].forEach(function (ms) {
        setTimeout(function () {
            attempt("retry " + ms + "ms");
        }, ms);
    });

    /* !! -------------------------------------------------------------------------- */
    /*                             !! 点击链接就地改写                              */
    /* !! -------------------------------------------------------------------------- */

    // 在帖子页里点到 .../checkurl?url=... 这类链接时, 直接把 href 换成目标地址,
    // 这样浏览器/新标签页打开的就已经是真实地址, 连确认页都不会出现。
    function setupLinkRewrite() {
        if (!REWRITE_LINKS) return;

        var handler = function (e) {
            if (e.type === "mousedown" && e.button !== 0 && e.button !== 1) return;
            var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
            if (!a) return;

            var href = a.href || a.getAttribute("href") || "";
            if (!HTTP_RE.test(href)) return;

            var u;
            try {
                u = new URL(href);
            } catch (err) {
                return;
            }
            var rule = matchRule(u);
            if (!rule) return;

            var target = safeResolve(rule, u);
            if (!target) {
                var txt = String(a.textContent || "").trim();
                if (/^(https?:\/\/|www\.)/i.test(txt) && !looksTruncated(txt)) target = decodeToTarget(txt);
            }
            if (!target || isSelf(target)) return;

            dbg("链接改写:", href, "->", target.href);
            a.href = target.href;
        };

        document.addEventListener("mousedown", handler, true);
        document.addEventListener("click", handler, true);
    }

    setupLinkRewrite();

    /* !! -------------------------------------------------------------------------- */
    /*                                 !! 右键菜单                                  */
    /* !! -------------------------------------------------------------------------- */

    function resolveCurrent() {
        var u;
        try {
            u = new URL(location.href);
        } catch (e) {
            return null;
        }
        var rule = matchRule(u);
        if (rule) {
            var t = safeResolve(rule, u);
            if (t) return t;
        }
        return findTargetFromPage(u);
    }

    function toast(msg) {
        try {
            var box = document.createElement("div");
            box.textContent = msg;
            box.style.cssText =
                "position:fixed;z-index:2147483647;left:50%;top:18%;transform:translateX(-50%);" +
                "background:rgba(0,0,0,.85);color:#fff;padding:10px 16px;border-radius:6px;" +
                "font:13px/1.5 Arial,sans-serif;max-width:80vw;white-space:pre-wrap;word-break:break-all;";
            (document.body || document.documentElement).appendChild(box);
            setTimeout(function () {
                if (box.parentNode) box.parentNode.removeChild(box);
            }, 2500);
        } catch (e) {
            /* 忽略 */
        }
    }

    function manualOpen() {
        var t = resolveCurrent();
        if (!t) {
            toast("没找到本页背后的真实链接");
            return;
        }
        location.href = t.href;
    }

    function manualCopy() {
        var t = resolveCurrent();
        if (!t) {
            toast("没找到本页背后的真实链接");
            return;
        }
        try {
            GM_setClipboard(t.href);
        } catch (e) {
            /* 忽略 */
        }
        toast("已复制:\n" + t.href);
    }

    function toggleAuto() {
        autoOn = !autoOn;
        writeAuto(autoOn);
        toast(autoOn ? "自动跳转: 开 (刷新页面生效)" : "自动跳转: 关 (刷新页面生效)");
    }

    try {
        GM_registerMenuCommand("打开本页背后的真实链接", manualOpen);
        GM_registerMenuCommand("复制本页背后的真实链接", manualCopy);
        GM_registerMenuCommand("自动跳转: " + (readAuto() ? "开" : "关") + " (点击切换, 刷新生效)", toggleAuto);
    } catch (e) {
        dbg("当前环境不支持菜单命令");
    }
})();
