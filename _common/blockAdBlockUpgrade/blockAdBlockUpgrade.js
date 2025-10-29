// ==UserScript==
// @name         Block AdBlock Upgrade Pages
// @version      0.1.0
// @description  自动关闭 AdBlock 的升级和付费推广页面
// @author       gtfish
// @match        https://getadblock.com/en/update/*
// @grant        window.close
// @license      GNU General Public License v3.0
// @run-at       document-start
// @updateURL       https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_common/blockAdBlockUpgrade/blockAdBlockUpgrade.js
// @downloadURL     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_common/blockAdBlockUpgrade/blockAdBlockUpgrade.js

// ==/UserScript==
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

