// ==UserScript==
// @name            0_2_补全百度盘链接
// @namespace       http://tampermonkey.net/
// @description     补全贴吧的百度盘链接并打开 (自动清理中文/表情/同形字等混淆字符)
// @version         0.5.0
// @author          gtfish
// @include         *
// @grant           GM_openInTab
// @grant           GM_registerMenuCommand
// @grant           GM_getValue
// @grant           GM_setValue
// @run-at          document-end
// @noframes
// @updateURL           https://raw.githubusercontent.com/tgaochn/tampermonkey_script/refs/heads/master/_common/%E5%8F%B3%E9%94%AE%E5%BF%AB%E6%8D%B7%E6%89%93%E5%BC%80%E7%99%BE%E5%BA%A6%E7%9B%98%E7%AD%89/openInBaiduPan.js
// @downloadURL         https://raw.githubusercontent.com/tgaochn/tampermonkey_script/refs/heads/master/_common/%E5%8F%B3%E9%94%AE%E5%BF%AB%E6%8D%B7%E6%89%93%E5%BC%80%E7%99%BE%E5%BA%A6%E7%9B%98%E7%AD%89/openInBaiduPan.js
// ==/UserScript==

(function () {
    "use strict";

    // 快捷键: Alt + 这个字母 (想换键位只改这里)
    var HOTKEY = "b";

    // 百度分享码的常见长度(1 + 22), 只用来判断"空格切段"型混淆
    var CODE_LEN = 23;

    // 不可见字符: 零宽空格/连接符、双向控制符、词连接符、软连字符、BOM
    var INVISIBLE = /[\u00ad\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/g;

    // 常见"同形字": 西里尔/希腊字母长得像拉丁字母, NFKC 处理不了, 只能手工映射
    var HOMOGLYPH = {
        // 西里尔
        "А": "A", "В": "B", "Е": "E", "К": "K", "М": "M", "Н": "H", "О": "O",
        "Р": "P", "С": "C", "Т": "T", "У": "Y", "Х": "X", "Ѕ": "S", "І": "I", "Ј": "J",
        "а": "a", "в": "b", "е": "e", "к": "k", "м": "m", "н": "h", "о": "o",
        "р": "p", "с": "c", "т": "t", "у": "y", "х": "x", "ѕ": "s", "і": "i", "ј": "j",

        // 希腊
        "Α": "A", "Β": "B", "Ε": "E", "Ζ": "Z", "Η": "H", "Ι": "I", "Κ": "K",
        "Μ": "M", "Ν": "N", "Ο": "O", "Ρ": "P", "Τ": "T", "Υ": "Y", "Χ": "X",
        "α": "a", "ε": "e", "ι": "i", "κ": "k", "ο": "o", "ρ": "p", "τ": "t",
        "υ": "u", "χ": "x", "ν": "v"
    };

    // 把一段文本洗成"只可能属于分享码"的字符
    function normalizeCode(str) {
        var s = String(str)
            // NFKC: 全角转半角(／→/、１→1、Ａ→A), ①→1, Ⓐ→A, 𝐀→A, ²→2 ...
            .normalize("NFKC")
            // 零宽字符、方向控制符、变体选择符等不可见字符
            .replace(INVISIBLE, "")
            // 其余非 ASCII: 能对上同形字的换成 ASCII, 中文/表情/生僻符号一律丢掉
            .replace(/[^\x20-\x7e]/g, function (ch) {
                return HOMOGLYPH[ch] || "";
            })
            // 只保留分享码的合法字符集
            .replace(/[^A-Za-z0-9_-]/g, "");
        // 百度短链的分享码固定以 1 开头, 被混淆成 l/I/i 的还原回去
        return s.length === CODE_LEN ? s.replace(/^[lIi]/, "1") : s;
    }

    // 从选中文本里定位并取出分享码
    function extractCode(raw) {
        var text = String(raw).normalize("NFKC").replace(INVISIBLE, "");

        // 老式 .../share/init?surl=xxxx
        var m = text.match(/surl=([^\s&#]+)/i);
        if (m) return normalizeCode(m[1]);

        // 定位 "https://pan.baidu.com/s/xxxx" / "/s/xxxx" / "s/xxxx", 只取它后面的部分
        var i = text.indexOf("/s/");
        if (i >= 0) {
            text = text.slice(i + 3);
        } else {
            m = text.match(/s\/(\S*)/i);
            text = m ? m[1] : text;
        }

        // 切掉 "提取码 / 密码 / pwd / 链接" 之类的说明文字
        text = text.split(/(?:提取码|提取碼|访问码|訪問碼|密码|密碼|pwd|pass(?:word)?|链接|鏈接|网址|網址)/i)[0];

        // 空格/换行也可能被用来"防和谐": 拼起来正好是分享码长度就采用拼接结果
        var joined = normalizeCode(text.replace(/\s+/g, ""));
        if (joined.length === CODE_LEN) return joined;

        // 否则只取第一段, 避免把后面的英文说明粘进来
        return normalizeCode(text.split(/[\s?#]/)[0]);
    }

    // ---------------- 选区 ----------------

    // 记住最近一次"非空选区": 点按钮/按快捷键时页面可能已经失焦或把选区清掉了
    var lastSel = "";

    function liveSel() {
        var s = window.getSelection ? window.getSelection() : null;
        return s && typeof s.toString === "function" ? String(s) : "";
    }

    function usableSel() {
        return liveSel().trim() || lastSel.trim();
    }

    function rememberSelection() {
        var s = liveSel();
        if (s.trim()) lastSel = s;
    }

    // 选区在屏幕上的位置; 没有非空选区、或选区已滚出视野时返回 null
    function selectionRect() {
        var s = window.getSelection ? window.getSelection() : null;
        if (!s || typeof s.getRangeAt !== "function" || s.rangeCount === 0 || s.isCollapsed) return null;
        var r = s.getRangeAt(0).getBoundingClientRect();
        if (!r || (!r.width && !r.height)) return null;
        if (r.bottom < 0 || r.top > window.innerHeight) return null;
        return r;
    }

    // ---------------- 打开 ----------------

    function openSelected() {
        var sel = usableSel();
        if (!sel) {
            console.log("[百度盘] 没有可用选区");
            return;
        }

        var code = extractCode(sel);
        if (code.length < 4) {
            console.log("[百度盘] 选区里没找到分享码:", sel, "->", code);
            return;
        }
        if (code.length !== CODE_LEN) {
            console.log("[百度盘] 分享码长度 " + code.length + " (常见 " + CODE_LEN + "), 请确认:", code);
        }

        // 提取码: ?pwd=1234 / 提取码: 1234 / 密码：1234 / code=1234 ...
        var pwdM = sel
            .normalize("NFKC")
            .match(/(?:pwd|pass(?:word)?|code|提取码|提取碼|访问码|訪問碼|密码|密碼)\s*[:：=]?\s*([A-Za-z0-9]{4})/i);

        var gotoSite = "https://pan.baidu.com/s/" + code;
        if (pwdM) gotoSite += "?pwd=" + pwdM[1];

        // 兜底去重: 万一脚本被重复注入/安装了多份, 1.5 秒内同一个 URL 只开一次
        var now = Date.now();
        if (GM_getValue("lastUrl", "") === gotoSite && now - GM_getValue("lastTime", 0) < 1500) {
            console.log("[百度盘] 重复触发, 已忽略:", gotoSite);
            return;
        }
        GM_setValue("lastUrl", gotoSite);
        GM_setValue("lastTime", now);

        console.log("[百度盘] 打开:", gotoSite);
        GM_openInTab(gotoSite);
    }

    // ---------------- 页面内入口 1: 选区旁的小按钮 ----------------
    // 用 Shadow DOM 装按钮, 免得被站点的 CSS 影响; 而且是"选中文字后才创建", 平时零 DOM 开销

    var btnHost = null;
    var btn = null;
    var btnShown = false;

    function ensureButton() {
        if (btnHost) {
            // 有些 SPA 会重建 body, 顺手挂回去
            if (btnHost.isConnected === false && document.body) document.body.appendChild(btnHost);
            return true;
        }
        if (!document.createElement || !document.body) return false;

        btnHost = document.createElement("div");
        var root = btnHost.attachShadow ? btnHost.attachShadow({ mode: "open" }) : btnHost;

        btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = "百度盘";
        btn.title = "补全并打开选中的百度盘链接 (Alt+" + HOTKEY.toUpperCase() + ")";
        btn.style.cssText = [
            "all: initial",
            "position: fixed",
            "z-index: 2147483647",
            "display: none",
            "padding: 3px 8px",
            "border: 0",
            "border-radius: 4px",
            "background: #06a7ff",
            "color: #fff",
            "font: 12px/1.6 system-ui, -apple-system, 'Microsoft YaHei', sans-serif",
            "cursor: pointer",
            "box-shadow: 0 1px 4px rgba(0, 0, 0, .35)",
            "user-select: none",
            "white-space: nowrap"
        ].join(";");

        // 关键: 按下时 preventDefault, 否则浏览器会先清掉选区/挪走焦点
        btn.addEventListener("mousedown", function (e) {
            e.preventDefault();
            e.stopPropagation();
        }, true);
        btn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            hideButton();
            openSelected();
        }, true);

        root.appendChild(btn);
        document.body.appendChild(btnHost);
        return true;
    }

    function showButton(rect) {
        if (!ensureButton()) return;
        var top = rect.bottom + 6;
        if (top + 26 > window.innerHeight) top = Math.max(4, rect.top - 26);   // 下面放不下就放上面
        var left = Math.min(Math.max(4, rect.right - 34), Math.max(4, window.innerWidth - 84));
        btn.style.top = top + "px";
        btn.style.left = left + "px";
        btn.style.display = "block";
        btnShown = true;
    }

    function hideButton() {
        if (btn && btnShown) {
            btn.style.display = "none";
            btnShown = false;
        }
    }

    function syncButton() {
        var rect = selectionRect();
        if (!rect) {
            hideButton();
            return;
        }
        showButton(rect);
    }

    // ---------------- 页面内入口 2: 快捷键 ----------------

    function onKeyDown(e) {
        if (e.key === "Escape") {
            hideButton();
            return;
        }
        if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        var key = String(e.key || "").toLowerCase();
        if (key !== HOTKEY && e.code !== "Key" + HOTKEY.toUpperCase()) return;
        if (!usableSel()) return;       // 没选中东西就不吞按键, 让站点照常处理
        e.preventDefault();
        e.stopPropagation();
        hideButton();
        openSelected();
    }

    // ---------------- 事件绑定 ----------------

    document.addEventListener("selectionchange", function () {
        rememberSelection();
        if (!selectionRect()) hideButton();
    }, true);

    document.addEventListener("mouseup", function () {
        rememberSelection();
        syncButton();
    }, true);

    document.addEventListener("keyup", function () {
        rememberSelection();
        syncButton();
    }, true);

    // 点别处就把按钮收起来(点按钮本身不算; Shadow DOM 里的事件会被重定向到 host)
    document.addEventListener("mousedown", function (e) {
        var path = e.composedPath ? e.composedPath() : [];
        if (path.indexOf(btn) < 0 && e.target !== btnHost) hideButton();
    }, true);

    document.addEventListener("keydown", onKeyDown, true);

    // 滚动/缩放时重新定位, 选区滚出视野就收起来(用 rAF 节流, 避免滚动时频繁重排)
    var scrollPending = false;
    function onScrollOrResize() {
        if (!btnShown || scrollPending) {
            if (!btnShown) hideButton();
            return;
        }
        scrollPending = true;
        var raf = window.requestAnimationFrame || function (fn) { return setTimeout(fn, 16); };
        raf(function () {
            scrollPending = false;
            syncButton();
        });
    }
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize, true);

    rememberSelection();    // 启动时先记一次, 以防注入前用户就已经选好了文字

    // ---------------- 页面内入口 3(兼容): 油猴自己的菜单 ----------------
    // 右键 → Tampermonkey → 本项; 或者打开油猴弹窗后按 accessKey(这里也是 b)
    GM_registerMenuCommand("补全百度盘链接(用当前选区)", openSelected, HOTKEY);
})();
