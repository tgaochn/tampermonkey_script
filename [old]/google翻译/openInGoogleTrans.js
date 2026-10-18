// ==UserScript==
// @name            0_3_google翻译
// @namespace       http://tampermonkey.net/
// @description     打开google翻译, 借用了 桃源隐叟 的代码
// @version         0.2.0
// @author          gtfish
// @include         *
// @grant           GM_openInTab
// @grant           GM_registerMenuCommand
// @run-at            document-end
// @noframes
// @updateURL           https://raw.githubusercontent.com/tgaochn/tampermonkey_script/refs/heads/master/_common/%E5%8F%B3%E9%94%AE%E5%BF%AB%E6%8D%B7%E6%89%93%E5%BC%80%E7%99%BE%E5%BA%A6%E7%9B%98%E7%AD%89/openInGoogleTrans.js
// @downloadURL         https://raw.githubusercontent.com/tgaochn/tampermonkey_script/refs/heads/master/_common/%E5%8F%B3%E9%94%AE%E5%BF%AB%E6%8D%B7%E6%89%93%E5%BC%80%E7%99%BE%E5%BA%A6%E7%9B%98%E7%AD%89/openInGoogleTrans.js
// ==/UserScript==

(function () {
    "use strict";

    // 记住最近一次"非空选区": 点菜单时页面可能已经失焦或把选区清掉了
    var lastSel = "";
    function rememberSelection() {
        var s = window.getSelection() ? String(window.getSelection()) : "";
        if (s.trim()) lastSel = s;
    }
    document.addEventListener("selectionchange", rememberSelection, true);
    document.addEventListener("mouseup", rememberSelection, true);
    rememberSelection();    // 启动时先记一次, 以防注入前用户就已经选好了文字

    function openSelected() {
        // 没有选区的 frame 直接退出; 配合 @noframes, 一次点击只会打开一个窗口
        var selection = (window.getSelection() ? window.getSelection().toString() : "").trim() || lastSel.trim();
        if (!selection) {
            console.log("[谷歌翻译] 没有可用选区");
            return;
        }
        console.log(selection);
        var gotoSite = `https://translate.google.cn/#view=home&op=translate&sl=auto&tl=en&text=${selection}`;
        GM_openInTab(gotoSite);
    }

    // 菜单由脚本自己注册: 一次注册长期有效, 可以反复点,
    // 不像 @run-at context-menu 那样"点一次就没了, 要刷新页面才回来"
    GM_registerMenuCommand("谷歌翻译(用当前选区)", openSelected);
})();
