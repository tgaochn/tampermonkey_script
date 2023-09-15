// ==UserScript==
// @name         关键词提取器
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  提取该网页的指定关键词
// @match        http*://www.gamer520.com/*
// @match        http*://xxxxx520.cam/*
// @grant        none
// @license      GPL-3.0 License
// @updateURL       https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/fetch_keyword/fetch_keyword.js
// @downloadURL     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/fetch_keyword/fetch_keyword.js
// ==/UserScript==

(function () {
    'use strict';

    // 提取关键词并显示在弹出窗口中
    function extractKeywords() {
        const keywords = [];

        // Extracts and possibly trims a link or text starting with a specific prefix
        const processLinkOrText = (str, prefix) => {
            if (str.startsWith(prefix)) {
                keywords.push(str.trim().slice(prefix.length));
            }
        };

        // 遍历所有文本节点
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            const node = walker.currentNode;
            const text = node.textContent.trim();
            processLinkOrText(text, '解压密码:');
        }

        // 去重
        return [...new Set(keywords)];
    }

    function displayKeywords(keywords) {
        var popup = window.open('', 'KeywordsPopup', 'width=800,height=600,scrollbars=yes,resizable=yes');
        popup.document.write('<html><head><title>关键词列表</title>');
        popup.document.write('<style>body {font-family: Arial, sans-serif; font-size: 14px; margin: 0; padding: 20px;}');
        popup.document.write('h1 {font-size: 24px; margin: 0 0 20px; padding: 0;}');
        popup.document.write('ul {margin: 0; padding: 0;}');
        popup.document.write('li {list-style-type: none; margin: 0 0 10px; padding: 0;}');
        popup.document.write('a {text-decoration: none; color: #333; font-weight: bold;}');
        popup.document.write('a:hover {color: #007bff;}</style>');
        popup.document.write('</head><body>');
        // popup.document.write('<h1>关键词列表</h1>');
        popup.document.write('<ul>');

        keywords.forEach(function (link) {
            // popup.document.write('<li><a href="' + link + '">' + link + '</a></li>');
            popup.document.write(link);
        });
        popup.document.write('</ul>');
        popup.document.write('</body></html>');
        popup.document.close();
    }

    // 创建提取关键词按钮
    var button = document.createElement('button');
    button.innerHTML = '提取关键词';
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.zIndex = 9999;
    button.style.padding = '10px';
    button.style.borderRadius = '50%';
    button.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    button.style.backgroundColor = '#007bff';
    button.style.color = '#fff';
    button.style.fontFamily = 'Arial, sans-serif';
    button.style.fontSize = '14px';
    button.style.fontWeight = 'bold';
    button.style.cursor = 'pointer';

    // 提取关键词按钮点击事件
    button.addEventListener('click', function () {
        var keywords = extractKeywords();
        displayKeywords(keywords);
    });

    // 将按钮添加到页面中
    document.body.appendChild(button);
})();