// ==UserScript==
// @name        Claude_wide_content
// @namespace   https://claude.ai/
// @version     0.0.1
// @description Make the contents in Claude wider 
// @author      gtfish
// @match       https://claude.ai/*
// @grant        GM_addStyle
// @grant        GM_log
// @license     GPL
// @updateURL       https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/LLM_wide_cont/Claude_wide_cont.js
// @downloadURL     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/LLM_wide_cont/Claude_wide_cont.js
// ==/UserScript==
// 修改自 Claude Content Max-Width, author: shawn-wxn, https://update.greasyfork.org/scripts/470711/Claude%20Content%20Max-Width.user.js
// 0.0.1: 只保留claude, 把claude文本框中的输入div宽度设置更宽

(async function () {
    'use strict';
    
    // 创建一个<style>标签
    var styleTag = document.createElement('style');

    // 将 CSS 样式添加到<style>标签中
    var cssStyles = `
                .max-w-3xl {
                  max-width: ${Math.floor(window.innerWidth * 0.05)}rem;
                }
                .max-w-\\[75ch\\] {
                  max-width: ${Math.floor(window.innerWidth * 0.1)}ch;
                }
                /* additional text input div */
                .max-w-\\[60ch\\] {
                  max-width: ${Math.floor(window.innerWidth * 0.1)}ch;
                }
            `;

    // 设置<style>标签的内容为 CSS 样式
    styleTag.innerHTML = cssStyles;

    // 将<style>标签添加到<head>标签中
    document.head.appendChild(styleTag);

})();