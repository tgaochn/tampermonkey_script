// ==UserScript==
// @name         wide_zhihu
// @namespace    http://tampermonkey.net/
// @version      0.2.0
// @description  Sets custom widths and hides specified elements on Zhihu
// @author       gtfish
// @match        http*://*.zhihu.com/*
// @grant        none
// @license MIT
// @run-at       document-start
// @updateURL       https://raw.githubusercontent.com/tgaochn/tampermonkey_script/refs/heads/master/_common/wide_zhihu/wide_zhihu.js
// @downloadURL     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/refs/heads/master/_common/wide_zhihu/wide_zhihu.js
// ==/UserScript==
// 0.2.0: fix: remove transform property that breaks fixed positioning of bottom action bar
// 0.1.2: disable overly broad CSS selectors that hide answer action bar
// 0.1.1: move to _common folder

// forked version from "https://greasyfork.org/zh-CN/scripts/529684-%E7%9F%A5%E4%B9%8E%E4%BC%98%E5%8C%96" by yz0812

(function() {
    'use strict';
    
    // Create stylesheet
    const style = document.createElement('style');
    style.textContent = `
        /* Widen main content columns without using transform to avoid breaking fixed positioning */
        .Topstory-mainColumn, .Question-mainColumn {
            width: 1200px !important;
            max-width: 1200px !important;
            margin: 0 auto !important;
        }
        
        .css-11p8nt5, .css-1kjxdzv {
            max-width: 1600px !important;
            min-width: 950px !important;
            margin: 0 auto !important;
        }
        
        /* Hide right sidebar */
        .Question-sideColumn {
            display: none !important;
        }
        
        /* Disabled: overly broad selectors that may hide unintended elements
        .css-1qyytj7 > div,
        .css-29q9fa,
        li.Tabs-item--noMeta.AppHeader-Tab.Tabs-item:nth-of-type(3),
        li.Tabs-item--noMeta.AppHeader-Tab.Tabs-item:nth-of-type(4),
        .css-18vqx7l > .fEPKGkUK5jyc4fUuT0QP.Button--plain.FEfUrdfMIKpQDJDqkjte.css-79elbk.Button {
            display: none !important;
        }
        */
    `;
    
    // Inject styles at document start
    document.documentElement.appendChild(style);
})();