// ==UserScript==
// @name         知乎宽屏显示与内容优化
// @namespace    http://tampermonkey.net/
// @version      0.2.12
// @description  Sets custom widths and hides specified elements on Zhihu
// @author       gtfish
// @match        http*://*.zhihu.com/*
// @grant        none
// @license MIT
// @run-at       document-start
// @updateURL       https://github.com/tgaochn/tampermonkey_script/raw/refs/heads/master/_common/%E7%9F%A5%E4%B9%8E%E5%AE%BD%E5%B1%8F%E6%98%BE%E7%A4%BA/wide_zhihu.js
// @downloadURL     https://github.com/tgaochn/tampermonkey_script/raw/refs/heads/master/_common/%E7%9F%A5%E4%B9%8E%E5%AE%BD%E5%B1%8F%E6%98%BE%E7%A4%BA/wide_zhihu.js
// ==/UserScript==
// 0.2.12: widen every ancestor container on question detail page (not just the immediate parent)
// 0.2.11: add console diagnostic + JS fallback for question detail page layout
// 0.2.10: apply centering/width to question detail page (its container is the parent of .Question-mainColumn)
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
        /* Center the content container at full width
           (homepage: .Topstory-container; question page: the parent of .Question-mainColumn, currently .css-6b8m40) */
        .Topstory, .Topstory-container, .App-main,
        div:has(> .Question-mainColumn) {
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
            flex: 0 0 auto !important;
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

    // --- Diagnostic + JS fallback for the question detail page ---
    // The question page's container is a hashed class (currently .css-6b8m40) with no
    // stable selector, so we also fix it via JS and log the ancestor chain for debugging.
    function setImportant(el, prop, value) {
        el.style.setProperty(prop, value, 'important');
    }

    function inspectAndFix() {
        const qCol = document.querySelector('.Question-mainColumn');
        if (!qCol) return;

        // Log the ancestor chain once so we can see which element holds the max-width
        if (!inspectAndFix.didLog) {
            inspectAndFix.didLog = true;
            console.group('%c[知乎宽屏] 详情页布局诊断', 'color:#0af;font-weight:bold');
            let el = qCol;
            for (let i = 0; i <= 6 && el; i++, el = el.parentElement) {
                const cs = getComputedStyle(el);
                const cls = (typeof el.className === 'string')
                    ? el.className.trim().replace(/\s+/g, '.')
                    : '';
                console.log(
                    (i === 0 ? '主列  ' : '祖先' + i + ' ') +
                    '<' + el.tagName.toLowerCase() + (cls ? '.' + cls : '') + '>' +
                    ' maxWidth=' + cs.maxWidth +
                    ' width=' + cs.width +
                    ' display=' + cs.display +
                    ' justify=' + cs.justifyContent +
                    ' margin=' + cs.margin +
                    ' flex=' + cs.flex
                );
            }
            console.groupEnd();
        }

        // JS fallback: widen/center the container chain, then size the column.
        // The width constraint lives a few ancestors up (per log: .css-1gl8cva, ~1032px
        // centered), so force full width on every ancestor, then center the column itself.
        let ancestor = qCol.parentElement;
        for (let i = 0; i < 4 && ancestor; i++, ancestor = ancestor.parentElement) {
            setImportant(ancestor, 'max-width', 'none');
            setImportant(ancestor, 'width', '100%');
            setImportant(ancestor, 'margin-left', '0');
            setImportant(ancestor, 'margin-right', '0');
            if (i === 0) {
                setImportant(ancestor, 'display', 'flex');
                setImportant(ancestor, 'justify-content', 'center');
            }
        }
        setImportant(qCol, 'width', '70%');
        setImportant(qCol, 'max-width', 'none');
        setImportant(qCol, 'min-width', '0');
        setImportant(qCol, 'margin-left', 'auto');
        setImportant(qCol, 'margin-right', 'auto');
        setImportant(qCol, 'flex', '0 0 auto');
    }

    window.addEventListener('DOMContentLoaded', inspectAndFix);
    window.addEventListener('load', inspectAndFix);
    setInterval(inspectAndFix, 1500); // keep re-applying across SPA navigation / React re-render
})();