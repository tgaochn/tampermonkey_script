// ==UserScript==
// @name         wide_zhihu
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Sets custom widths and hides specified elements on Zhihu
// @author       gtfish
// @match        http*://*.zhihu.com/*
// @grant        none
// @license MIT
// @run-at       document-start
// @downloadURL https://update.greasyfork.org/scripts/529684/%E7%9F%A5%E4%B9%8E%E4%BC%98%E5%8C%96.user.js
// @updateURL https://update.greasyfork.org/scripts/529684/%E7%9F%A5%E4%B9%8E%E4%BC%98%E5%8C%96.meta.js
// ==/UserScript==

// forked version from "https://greasyfork.org/zh-CN/scripts/529684-%E7%9F%A5%E4%B9%8E%E4%BC%98%E5%8C%96" by yz0812

(function() {
    'use strict';
    
    // 创建样式表
    const style = document.createElement('style');
    style.textContent = `
        .Topstory-mainColumn, .Question-mainColumn {
            width: 150% !important;
            max-width: none !important;
            margin: 0 auto !important;
            position: relative !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
        }
        
        .css-11p8nt5, .css-1kjxdzv {
            max-width: 1600px !important;
            min-width: 950px !important;
            margin: 0 auto !important;
        }
        
        .Question-sideColumn {
            display: none !important;
        }
        
        .css-1qyytj7 > div,
        .css-29q9fa,
        li.Tabs-item--noMeta.AppHeader-Tab.Tabs-item:nth-of-type(3),
        li.Tabs-item--noMeta.AppHeader-Tab.Tabs-item:nth-of-type(4),
        .css-18vqx7l > .fEPKGkUK5jyc4fUuT0QP.Button--plain.FEfUrdfMIKpQDJDqkjte.css-79elbk.Button {
            display: none !important;
        }
    `;
    
    // 在页面开始加载时就插入样式
    document.documentElement.appendChild(style);
})();