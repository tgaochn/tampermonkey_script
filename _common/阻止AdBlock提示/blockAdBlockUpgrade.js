// ==UserScript==
// @name         Block AdBlock Upgrade Pages
// @version      0.1.1
// @description  自动关闭 AdBlock 的升级和付费推广页面
// @author       gtfish
// @match        https://getadblock.com/en/update/*
// @match        https://getadblock.com/zh_CN/update/*
// @grant        window.close
// @license      GNU General Public License v3.0
// @run-at       document-start
// @updateURL       https://github.com/tgaochn/tampermonkey_script/raw/refs/heads/master/_common/%E9%98%BB%E6%AD%A2AdBlock%E6%8F%90%E7%A4%BA/blockAdBlockUpgrade.js
// @downloadURL     https://github.com/tgaochn/tampermonkey_script/raw/refs/heads/master/_common/%E9%98%BB%E6%AD%A2AdBlock%E6%8F%90%E7%A4%BA/blockAdBlockUpgrade.js

// ==/UserScript==
// 0.1.1: add match for getadblock.com
// 0.1.0: initial version, 关闭 AdBlock 的升级和付费推广页面

(function () {
    "use strict";

    console.log("[Block AdBlock Upgrade] Detected AdBlock upgrade page, closing...");

    // Method 1: Try to close the window directly
    // This works if the page was opened by JavaScript
    window.close();

    // Method 2: If window.close() doesn't work, redirect to Google.com
    // This will at least prevent the content from loading
    setTimeout(() => {
        if (!window.closed) {
            console.log("[Block AdBlock Upgrade] window.close() failed, redirecting to Google.com...");
            window.location.href = "https://www.google.com/";
        }
    }, 100);

})();

