// ==UserScript==
// @name         磁力链接提取器
// @namespace    http://tampermonkey.net/
// @version      0.3.0
// @description  提取该网页的所有磁力链接
// @match        http*://www.w3schools.com/*
// @match        http*://nutbread.github.io/t2m/*
// @match        http*://www.javbus.com/*
// @include      /https?:\/\/www\.hacg\..*\/wp\/.*/
// @grant        none
// @license      GPL-3.0 License
// @updateURL       https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/GetMagnetLinks/GetMagnetLinks.js
// @downloadURL     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/GetMagnetLinks/GetMagnetLinks.js
// ==/UserScript==
// forked from:
// https://greasyfork.org/scripts/461157-%E7%A3%81%E5%8A%9B%E9%93%BE%E6%8E%A5%E6%8F%90%E5%8F%96%E5%99%A8/code/%E7%A3%81%E5%8A%9B%E9%93%BE%E6%8E%A5%E6%8F%90%E5%8F%96%E5%99%A8.user.js

// test the script in:
// https://www.w3schools.com/html/tryit.asp?filename=tryhtml_links_w3schools
// magnet:?xt=urn:btih:43d9faa3365df9b286d4c14c23b2e83a5e763f07&XXX
// magnet:?xt=urn:btih:NN7VYFLE2EDDM5YUYWVFAZNGSL3DPQ7H&dn=%5Bb

(function () {
    'use strict';

    // 提取磁力链接并显示在弹出窗口中
    function extractMagnetLinks() {
        const magnetLinks = [];
        const regex = /&.*/; // Match everything after "&"

        // Extracts and possibly trims a link or text starting with a specific prefix
        const processLinkOrText = (str, prefix) => {
            if (str.startsWith(prefix)) {
                if (prefix === 'magnet:') {
                    str = str.trim().slice(0, 60).replace(regex, "");
                }
                magnetLinks.push(str);
            }
        };

        // 遍历所有链接
        const linkElements = document.getElementsByTagName('a');
        for (const linkElement of linkElements) {
            const link = linkElement.href;
            processLinkOrText(link, 'magnet:');
            processLinkOrText(link, 'ed2k:');
        }

        // 遍历所有文本节点
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            const node = walker.currentNode;
            const text = node.textContent.trim();
            // 磁力链接 hash
            if(text.length == 40 && text.match(/[0-9a-zA-Z]+/)[0] == text){
                let magnetLink = 'magnet:?xt=urn:btih:' + text;
                magnetLinks.push(magnetLink);
            }
            else {
                processLinkOrText(text, 'magnet:');
                processLinkOrText(text, 'ed2k:');
            }
        }

        // 过滤太短的string, 去重
        const filteredMagnetLinks = magnetLinks.filter((link) => link.length >= 10 && !link.endsWith(":btih:"));
        return [...new Set(filteredMagnetLinks)];
    }

    function displayMagnetLinks(magnetLinks) {
        var popup = window.open('', 'magnetLinksPopup', 'width=800,height=600,scrollbars=yes,resizable=yes');
        var popupDoc = popup.document
        popupDoc.write('<html><head><title>磁力链接列表</title>');
        popupDoc.write('<style>body {font-family: Arial, sans-serif; font-size: 14px; margin: 0; padding: 20px;}');
        popupDoc.write('h1 {font-size: 24px; margin: 0 0 20px; padding: 0;}');
        popupDoc.write('ul {margin: 0; padding: 0;}');
        popupDoc.write('li {list-style-type: none; margin: 0 0 10px; padding: 0;}');
        popupDoc.write('a {text-decoration: none; color: #333; font-weight: bold;}');
        popupDoc.write('a:hover {color: #007bff;}</style>');
        popupDoc.write('</head><body>');
        // popupDoc.write('<h1>磁力链接列表</h1>');
        popupDoc.write('<ul>');

        magnetLinks.forEach(function (link) {
            popupDoc.write('<li><a href="' + link + '">' + link + '</a></li>');
        });
        popupDoc.write('</ul>');
        popupDoc.write('</body></html>');

        // 选择全部文本, 写入剪切板
        var range = popupDoc.createRange();
        range.selectNodeContents(popupDoc.body);
        var selection = popup.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        navigator.clipboard.writeText(popupDoc.body.innerText)      

        popupDoc.close();
    }

    // 创建提取磁力链接按钮
    var button = document.createElement('button');
    button.innerHTML = '提取磁力链接';
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

    // 提取磁力链接按钮点击事件
    button.addEventListener('click', function () {
        var magnetLinks = extractMagnetLinks();
        displayMagnetLinks(magnetLinks);
    });

    // 将按钮添加到页面中
    document.body.appendChild(button);
})();