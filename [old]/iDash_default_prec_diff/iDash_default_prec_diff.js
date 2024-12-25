// ==UserScript==
// @name         iDash_default_prec_diff
// @namespace    iDash_default_prec_diff
// @version      0.0.2
// @description  自动开启iDash的precDiff
// @author       gtfish
// @include      *://idash.sandbox.indeed.net/queryshare/?query=*
// @updateURL       https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/iDash_default_prec_diff/iDash_default_prec_diff.js
// @downloadURL     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/iDash_default_prec_diff/iDash_default_prec_diff.js
// @run-at document-start

// ==/UserScript==
// TODO: still not working

(function () {
    'use strict';

    const urlObj = new URL(window.location.href);
    
    // 仅在 hasPercentDiff 参数不存在时才添加
    if (!urlObj.searchParams.has("hasPercentDiff")) {
        urlObj.searchParams.set("hasPercentDiff", "true");
        window.history.replaceState({}, "", urlObj.toString());
    }
})();