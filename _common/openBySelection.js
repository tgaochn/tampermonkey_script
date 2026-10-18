// ==UserScript==
// @name            0_选中文本快捷打开
// @namespace       http://tampermonkey.net/
// @description     选中文字 → 右键 → 脚本菜单: 补全蓝奏云链接 / 补全百度盘链接(含提取码) / 谷歌翻译 / 知乎搜索
// @version         1.1.0
// @author          gtfish
// @include         *
// @grant           GM_openInTab
// @grant           GM_registerMenuCommand
// @grant           GM_getValue
// @grant           GM_setValue
// @run-at          document-end
// @noframes
// @updateURL       https://raw.githubusercontent.com/tgaochn/tampermonkey_script/refs/heads/master/_common/openBySelection.js
// @downloadURL     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/refs/heads/master/_common/openBySelection.js
// ==/UserScript==

// 合并自 openInLanzouyun.js / openInBaiduPan.js / openInGoogleTrans.js / openInZhihuSearch.js
// 这四个脚本做的是同一件事: 拿当前选区拼一个 URL 打开。合并后
//   - 每个页面只注入一次, 只需要一套 selectionchange/mouseup 监听(原来要 4 套)
//   - 脚本列表里从 4 项变成 1 项, 菜单命令各自独立, 用起来没有区别
// 每个功能都有独立开关, 见下面"功能开关"一节; 没开的功能代码保留, 改回 true 即恢复
(function () {
    "use strict";

    // ---------------- 功能开关 ----------------

    // true = 注册到右键菜单; false = 不注册。函数代码都还在, 想用时改回 true 即可
    var ENABLE_BAIDU_PAN = true;        // 补全百度盘链接(含提取码)
    var ENABLE_LANZOU = false;          // 补全蓝奏云链接
    var ENABLE_GOOGLE_TRANS = false;    // 谷歌翻译
    var ENABLE_ZHIHU = false;           // 知乎搜索

    // ---------------- 可改的常量 ----------------

    // 蓝奏云域名: 只写域名, 不要带路径和结尾斜杠。
    // 蓝奏云的分发域名一直在换(lanzoux / lanzoue / lanzoui / lanzoum ...), 打不开时改这一行
    var LANZOU_HOST = "https://www.lanzoux.com";

    // 谷歌翻译的目标语言: 翻成英文用 en, 想翻成中文改成 zh-CN
    var TRANS_TL = "en";

    // ---------------- 选区 ----------------

    // 记住最近一次"非空选区": 点菜单时页面可能已经失焦或把选区清掉了
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

    // ---------------- 打开(带去重) ----------------

    // 兜底去重: 万一脚本被重复注入/安装了多份, 1.5 秒内同一个 URL 只开一次
    function openOnce(url, tag) {
        var now = Date.now();
        var last = GM_getValue("lastUrl", "");
        var lastTime = Number(GM_getValue("lastTime", 0)) || 0;
        if (last === url && now - lastTime < 1500) {
            console.log(tag + " 重复触发, 已忽略:", url);
            return;
        }
        GM_setValue("lastUrl", url);
        GM_setValue("lastTime", now);
        console.log(tag + " 打开:", url);
        GM_openInTab(url);
    }

    function noSelection(tag) {
        console.log(tag + " 没有可用选区");
    }

    // ---------------- 百度盘 ----------------

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
    function extractBaiduCode(raw) {
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

        // 先切掉 URL 后缀(?pwd=... / #list/path=...): 分享码里不可能有 ? 和 #
        // 这一步必须放在下面"去空格数长度"之前, 否则 #list/path=%2F 会被清洗成
        // listpath2F 拼进分享码(短码 + 这段字符数正好凑成 23 时就会被误当成完整分享码)
        text = text.split(/[?#]/)[0];

        // 切掉 "提取码 / 密码 / pwd / 链接" 之类的说明文字
        text = text.split(/(?:提取码|提取碼|访问码|訪問碼|密码|密碼|pwd|pass(?:word)?|链接|鏈接|网址|網址)/i)[0];

        // 空格/换行也可能被用来"防和谐": 拼起来正好是分享码长度就采用拼接结果
        var joined = normalizeCode(text.replace(/\s+/g, ""));
        if (joined.length === CODE_LEN) return joined;

        // 否则只取第一段, 避免把后面的英文说明粘进来
        return normalizeCode(text.split(/\s/)[0]);
    }

    function openBaiduPan() {
        var sel = usableSel();
        if (!sel) return noSelection("[百度盘]");

        var code = extractBaiduCode(sel);
        if (code.length < 4) {
            console.log("[百度盘] 选区里没找到分享码:", sel, "->", code);
            return;
        }
        if (code.length !== CODE_LEN) {
            console.log("[百度盘] 分享码长度 " + code.length + " (常见 " + CODE_LEN + "), 请确认:", code);
        }

        // 提取码有两个来源, 分开找: URL 里的 ?pwd=xxxx, 和正文里的 "提取码: xxxx"
        var sel2 = sel.normalize("NFKC");

        var urlM = sel2.match(/[?&]pwd=([A-Za-z0-9]{4})/i);
        var urlPwd = urlM ? urlM[1] : null;

        // 先把 URL 里的 ?pwd=xxxx 挖掉, 免得被下面的正文标签再命中一次
        var textM = sel2
            .replace(/[?&]pwd=[A-Za-z0-9]{4}/gi, " ")
            .match(/(?:pwd|pass(?:word)?|code|提取码|提取碼|访问码|訪問碼|密码|密碼)\s*[:：=]?\s*([A-Za-z0-9]{4})/i);
        var textPwd = textM ? textM[1] : null;

        // 两边不一致时以正文里的提取码为准(那是发帖人最终写下的值), 并明确告警
        if (textPwd && urlPwd && textPwd !== urlPwd) {
            console.warn("[百度盘] 提取码不一致: 正文=" + textPwd + " / URL=" + urlPwd + " -> 采用正文的 " + textPwd);
        }
        var pwd = textPwd || urlPwd;

        var gotoSite = "https://pan.baidu.com/s/" + code;
        if (pwd) gotoSite += "?pwd=" + pwd;

        openOnce(gotoSite, "[百度盘]");
    }

    // ---------------- 蓝奏云 ----------------

    // 蓝奏云的分发域名一直在换(lanzoux/lanzoue/lanzoui/lanzoum ...),
    // 所以只认 "lanzou 开头" 的域名, 取域名后面的分享码
    var LANZOU_URL = /(?:https?:\/\/)?(?:[A-Za-z0-9-]+\.)*(?:lanzou[a-z]{0,2}|lanzn)\.[a-z]{2,6}\/(?:s\/)?([A-Za-z0-9]+)/i;

    // 从选中文本里取出蓝奏云分享码: 支持完整链接, 也支持只选了裸码
    function extractLanzouCode(raw) {
        var text = String(raw).normalize("NFKC").replace(INVISIBLE, "").trim();

        // 选中的是完整链接(最常见): 直接取域名后面的那一截
        var m = text.match(LANZOU_URL);
        if (m) return m[1];

        // 裸码: 取第一段连续字母数字, 前面带 "蓝奏云:/链接:" 之类前缀也没关系
        m = text.match(/[A-Za-z0-9]{4,}/);
        return m ? m[0] : "";
    }

    function openLanzouyun() {
        var sel = usableSel();
        if (!sel) return noSelection("[蓝奏云]");

        var code = extractLanzouCode(sel);
        if (code.length < 4) {
            console.log("[蓝奏云] 选区里没找到分享码:", sel, "->", code);
            return;
        }

        openOnce(LANZOU_HOST + "/" + code, "[蓝奏云]");
    }

    // ---------------- 谷歌翻译 / 知乎搜索 ----------------

    function openGoogleTrans() {
        var sel = usableSel();
        if (!sel) return noSelection("[谷歌翻译]");
        // 当前正式参数格式; 老的 #view=home&op=translate 片段格式已废弃
        // 必须 encodeURIComponent: 选区里的 & # ? 空格会截断/污染 URL
        openOnce("https://translate.google.com/?sl=auto&tl=" + TRANS_TL + "&op=translate&text=" + encodeURIComponent(sel), "[谷歌翻译]");
    }

    function openZhihuSearch() {
        var sel = usableSel();
        if (!sel) return noSelection("[知乎搜索]");
        // 必须 encodeURIComponent: 选区里的 & # ? 空格会截断/污染 URL
        openOnce("https://www.zhihu.com/search?type=content&q=" + encodeURIComponent(sel), "[知乎搜索]");
    }

    // ---------------- 绑定 ----------------

    document.addEventListener("selectionchange", rememberSelection, true);
    document.addEventListener("mouseup", rememberSelection, true);
    rememberSelection();    // 启动时先记一次, 以防注入前用户就已经选好了文字

    // 菜单由脚本自己注册: 一次注册长期有效, 可以反复点,
    // 不像 @run-at context-menu 那样"点一次就没了, 要刷新页面才回来"
    if (ENABLE_LANZOU) GM_registerMenuCommand("补全蓝奏云链接(用当前选区)", openLanzouyun);
    if (ENABLE_BAIDU_PAN) GM_registerMenuCommand("补全百度盘链接(用当前选区)", openBaiduPan);
    if (ENABLE_GOOGLE_TRANS) GM_registerMenuCommand("谷歌翻译(用当前选区)", openGoogleTrans);
    if (ENABLE_ZHIHU) GM_registerMenuCommand("知乎搜索(用当前选区)", openZhihuSearch);
})();
