// ==UserScript==
// @name         知乎宽屏显示与内容优化
// @namespace    http://tampermonkey.net/
// @version      0.2.9
// @description  Sets custom widths and hides specified elements on Zhihu
// @author       gtfish
// @match        http*://*.zhihu.com/*
// @grant        none
// @license MIT
// @run-at       document-start
// @updateURL       https://github.com/tgaochn/tampermonkey_script/raw/refs/heads/master/_common/%E7%9F%A5%E4%B9%8E%E5%AE%BD%E5%B1%8F%E6%98%BE%E7%A4%BA/wide_zhihu.js
// @downloadURL     https://github.com/tgaochn/tampermonkey_script/raw/refs/heads/master/_common/%E7%9F%A5%E4%B9%8E%E5%AE%BD%E5%B1%8F%E6%98%BE%E7%A4%BA/wide_zhihu.js
// ==/UserScript==
// 0.2.9: set content to 60% width centered (≈20% blank on each side) instead of full width
// 0.2.8: fix homepage container selector (Topstory -> Topstory-container) so left-align/full-width actually applies
// 0.2.7: left-align content and use full width (remove centering) so content extends further left
// 0.2.6: hide homepage feed composer box (WriteArea)
// 0.2.5: hide profile page right sidebar (RightSideBar module: creator card, ads, analytics, hot list, salt membership)
// 0.2.3: center the entire content container on homepage
// 0.2.2: use percentage width with auto margins to fix content alignment
// 0.2.1: increase width to 1500px
// 0.2.0: fix: remove transform property that breaks fixed positioning of bottom action bar
// 0.1.2: disable overly broad CSS selectors that hide answer action bar
// 0.1.1: move to _common folder

// forked version from "https://greasyfork.org/zh-CN/scripts/529684-%E7%9F%A5%E4%B9%8E%E4%BC%98%E5%8C%96" by yz0812

(function() {
    'use strict';
    
    // Create stylesheet
    const style = document.createElement('style');
    style.textContent = `
        /* Center the content container at full width */
        .Topstory, .Topstory-container, .App-main {
            max-width: none !important;
            width: 100% !important;
            display: flex !important;
            justify-content: center !important;
            margin: 0 !important;
        }

        /* Main content column: ~70% width, centered (≈15% blank on each side) */
        .Topstory-mainColumn, .Question-mainColumn {
            width: 70% !important;
            max-width: none !important;
            min-width: 0 !important;
            margin-left: auto !important;
            margin-right: auto !important;
        }

        /* Widen the homepage feed card wrapper to fill the column */
        .Topstory-mainColumnCard {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
        }
        
        .css-11p8nt5, .css-1kjxdzv {
            max-width: 1800px !important;
            min-width: 950px !important;
            margin: 0 auto !important;
        }
        
        /* Hide right sidebar */
        .Question-sideColumn, .Topstory-sideColumn,
        [data-za-detail-view-path-module="RightSideBar"] {
            display: none !important;
        }

        /* Hide homepage feed composer box (写想法/发内容) */
        .WriteArea {
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