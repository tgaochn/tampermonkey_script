// ==UserScript==
// @name         IQLAddBtn
// @namespace    IQLAddBtn
// @version      0.1.0
// @description  任意网站右边加入相关链接 - IQL 页面增加 link
// @author       gtfish
// @include      *://idash.sandbox.indeed.net/*
// @require      https://cdn.bootcss.com/jquery/3.4.1/jquery.min.js
// @updateURL       https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/iDash_add_btn/IQL.js
// @downloadURL     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/iDash_add_btn/IQL.js

// ==/UserScript==
// 0.1.0: 增加format IQL url的各种按钮
// 2024-02-06: IQL 增加 google sheet to md table 的网站链接

(async function () {
    'use strict';

    const delay = (ms) => new Promise((r) => setTimeout(r, ms));

    function createButtonContainer() {
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'inline-block';
        buttonContainer.style.justifyContent = 'center';
        buttonContainer.style.marginTop = '10px';
        buttonContainer.style.marginLeft = '10px';

        return buttonContainer;
    }

    function setBtnStyle(btn) {
        btn.style.backgroundColor = '#009688';
        btn.style.color = 'white';
        btn.style.padding = '5px 5px';
        btn.style.height = '30px';
        btn.style.fontSize = '14px';
        btn.style.border = '1px solid #ccc';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';
        btn.style.outline = 'none';
        btn.style.boxSizing = 'border-box';
    }

    function createButton(text, callbackFunc) {
        const button = document.createElement('button');
        setBtnStyle(button);
        button.innerHTML = text;
        button.onclick = callbackFunc;
        return button;
    }

    function copyHypertext(text, url, leftPart = '', rightPart = '') {
        // Create a new anchor element
        const hyperlinkElem = document.createElement('a');
        hyperlinkElem.textContent = text;
        hyperlinkElem.href = url;

        // 创建一个新的span元素,用于包裹超链接和括号
        const spanElem = document.createElement('span');
        spanElem.appendChild(document.createTextNode(leftPart));
        spanElem.appendChild(hyperlinkElem);
        spanElem.appendChild(document.createTextNode(rightPart));

        // 临时将span元素插入到页面中(隐藏不可见), 这样才能选中并复制
        spanElem.style.position = 'absolute';
        spanElem.style.left = '-9999px';
        document.body.appendChild(spanElem);

        // 选择临时元素并复制
        const range = document.createRange();
        range.selectNode(spanElem);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand('copy');
        selection.removeAllRanges();

        // 把临时的元素从页面中移除
        document.body.removeChild(spanElem);
    }

    // ! add buttons in the containers
    const buttonContainer1 = createButtonContainer();

    // 按钮1: 打开 google sheet 转 md table 的网站
    buttonContainer1.append(
        createButton('Gsheet2Md', () => {
            const targetUrl = 'https://tabletomarkdown.com/convert-spreadsheet-to-markdown/';
            window.open(targetUrl, '_blank');
        })
    );

    // 后面的按钮: 各种copy
    buttonContainer1.append(
        createButton('copy url', async () => {
            const btn = document.getElementById('share-query-verbatim');
            btn.click();
        })
    );

    buttonContainer1.append(
        createButton('copy href: IQL', async () => {
            const btn = document.getElementById('share-query-verbatim');
            btn.click();
            await delay(500);

            const clipboardContents = await navigator.clipboard.readText();
            copyHypertext('IQL', clipboardContents);
        })
    );

    buttonContainer1.append(
        createButton('copy href: (IQL)', async () => {
            const btn = document.getElementById('share-query-verbatim');
            btn.click();
            await delay(500);

            const clipboardContents = await navigator.clipboard.readText();
            copyHypertext('IQL', clipboardContents, '(', ')');
        })
    );

    buttonContainer1.append(
        createButton('copy md: [IQL|url]', async () => {
            const btn = document.getElementById('share-query-verbatim');
            btn.click();
            await delay(500);

            const clipboardContents = await navigator.clipboard.readText();
            navigator.clipboard.writeText(`[IQL|${clipboardContents}]`);
        })
    );

    buttonContainer1.append(
        createButton('copy md: [IQL](url)', async () => {
            const btn = document.getElementById('share-query-verbatim');
            btn.click();
            await delay(500);

            const clipboardContents = await navigator.clipboard.readText();
            navigator.clipboard.writeText(`[IQL](${clipboardContents})`);
        })
    );

    // ! add container to the table
    while (true) {
        await delay(100);
        const btnContainerPosId = 'undefined-nav-bar-navigation-container';
        const btnContainerPosElement = document.getElementById(btnContainerPosId);
        // const curBtn = btnContainerPosElement.firstElementChild.firstElementChild;
        if (btnContainerPosElement) {
            // contrainer 上下排列
            btnContainerPosElement.appendChild(buttonContainer1);
            btnContainerPosElement.parentNode.insertBefore(buttonContainer2, btnContainerPosElement.nextSibling);

            // contrainer 左右排列
            // btnContainerPosElement.insertAdjacentElement('afterend', buttonContainer);
            // btnContainerPosElement.insertAdjacentElement('afterend', buttonContainer2);
            break;
        }
    }
})();
