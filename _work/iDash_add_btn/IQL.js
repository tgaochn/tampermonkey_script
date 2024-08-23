// ==UserScript==
// @name         IQLAddBtn
// @namespace    IQLAddBtn
// @version      0.3.1
// @description  任意网站右边加入相关链接 - IQL 页面增加 link
// @author       gtfish
// @include      *://idash.sandbox.indeed.net/*
// @require      https://cdn.bootcss.com/jquery/3.4.1/jquery.min.js
// @updateURL       https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/iDash_add_btn/IQL.js
// @downloadURL     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/iDash_add_btn/IQL.js

// ==/UserScript==
// 0.3.1: added new links
// 0.3.0: fixed the btn position and remove jira link
// 0.2.1: fixed the btn position and add links
// 0.2.0: improved the layout, added clipboard content detection and added MutationObserver
// 0.1.2: clean up code
// 0.1.1: MutationObserver methods
// 0.1.0: 增加format IQL url的各种按钮
// 2024-02-06: IQL 增加 google sheet to md table 的网站链接

IS_FIXED_POS = true;

(function () {
    'use strict';

    const observeDOM = (function () {
        const MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
        const eventListenerSupported = window.addEventListener;

        return function (targetNode, onAddCallback, onRemoveCallback) {
            if (MutationObserver) {
                // Define a new observer
                const mutationObserver = new MutationObserver(function (mutations, observer) {
                    if (mutations[0].addedNodes.length && onAddCallback) {
                        onAddCallback();
                    }
                });

                // Have the observer observe target node for changes in children
                mutationObserver.observe(targetNode, {
                    childList: true,
                    subtree: true
                });
            } else if (eventListenerSupported) {
                targetNode.addEventListener('DOMNodeInserted', onAddCallback, { once: true });
            }
        };
    })();

    // Check if the target element exists, if not, add the buttons
    const observeTarget = document.body;
    const targetElementId = "container_id";
    observeDOM(observeTarget, () => {
        if (!document.getElementById(targetElementId)) {
            main();
        }
    });
})();

function main() {
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
    async function get_IQL_link() {
        const btn = document.getElementById('share-query-verbatim');
        const initialClipboardContents = await navigator.clipboard.readText();

        btn.click();
        const timeoutDuration = 3000;
        const pollingInterval = 500;
        let elapsedTime = 0;

        // Poll the clipboard contents until the timeout is reached or the contents change
        while (elapsedTime < timeoutDuration) {
            await delay(pollingInterval);
            elapsedTime += pollingInterval;

            const currentClipboardContents = await navigator.clipboard.readText();

            // Check if the clipboard contents have changed
            if (currentClipboardContents !== initialClipboardContents) {
                return currentClipboardContents;
            }
        }

        // If the timeout is reached and the clipboard contents haven't changed, return null or throw an error
        return null; // or throw new Error('Clipboard contents did not change before timeout');
    }

    const btnContainer = createButtonContainer();
    const btnSubContainer1 = createButtonContainer();
    // const btnSubContainer2 = createButtonContainer();
    btnContainer.id = "container_id";
    btnContainer.appendChild(btnSubContainer1);
    // btnContainer.appendChild(btnSubContainer2);
    btnContainer.style.display = 'flex';
    btnContainer.style.flexDirection = 'column'; // contrainer 上下排列
    // containerElement.style.flexDirection = 'row'; // contrainer 左右排列

    // ! add buttons in the containers
    btnSubContainer1.append(
        // 按钮: copy url
        createButton('url', async () => {
            await get_IQL_link();
        }),

        // 按钮: copy 超链接
        createTextNode('\thref: '),
        createButton('href: IQL', async () => {
            const clipboardContents = await get_IQL_link();
            copyHypertext('IQL', clipboardContents);
        }),
        createButton('href: (IQL)', async () => {
            const clipboardContents = await get_IQL_link();
            copyHypertext('IQL', clipboardContents, '(', ')');
        }),

        // 按钮: copy md 形式的链接
        createTextNode('\tmd: '),
        createButton('md: [IQL](url)', async () => {
            const clipboardContents = await get_IQL_link();
            navigator.clipboard.writeText(`[IQL](${clipboardContents})`);
        }),
        // createButton('md: [IQL|url]', async () => {
        //     const clipboardContents = await get_IQL_link();
        //     // navigator.clipboard.writeText(`[IQL|${clipboardContents}]`);
        // }),

        // 按钮: 打开 link
        createTextNode('\tlink: '),
        createButtonOpenUrl('search_iql', 'https://app.glean.com/search?q=type%3Aiqlindex+type%3Aiqlquery+type%3Areusablequery+type%3Abusinessmetric+ctr&tab=all&hcp=1'),
        createButtonOpenUrl('Gsheet2Md', 'https://tabletomarkdown.com/convert-spreadsheet-to-markdown'), // 打开 google sheet 转 md table 的网站
        createButtonOpenUrl('iql_formatter', 'https://codebeautify.org/sqlformatter'),
        createButtonOpenUrl('sql_formatter', 'https://nene.github.io/prettier-sql-playground/'),
    );

    if (IS_FIXED_POS) {
        attachFixedContainer(btnContainer, top="-10px", left="650px");
    }
    else {
        // const existingContainerId = 'undefined-nav-bar-navigation-container';
        const existingContainerId = 'undefined-button-container';
        const existingContainer = document.getElementById(existingContainerId);
        existingContainer.appendChild(btnContainer);
    }
}

function createButtonContainerFixedPosition(top, left) {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.zIndex = '1000';  // Ensure it's above other elements
    container.style.top = top;
    container.style.left = left;

    return container;
}

function attachFixedContainer(container, top, left) {
    document.body.appendChild(container);
    container.style.position = 'fixed';
    container.style.zIndex = '1000';  // Ensure it's above other elements
    container.style.top = top;
    container.style.left = left;
}

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

function createButtonCopyText(title, copyText) {
    return createButton(title, () => {
        navigator.clipboard.writeText(copyText);
    });
}

function createTextNode(text) {
    const textElement = document.createElement('span');
    const textNode = document.createTextNode(text);
    textElement.appendChild(textNode);
    textElement.style.color = 'black';
    return textElement;
}

function createButtonOpenUrl(text, targetUrl) {
    return createButton(text, () => {
        window.open(targetUrl);
    })
}

function copyHypertext(text, url, leftPart = '', rightPart = '') {
    // Create a new anchor element
    const hyperlinkElem = document.createElement('a');
    hyperlinkElem.textContent = text;
    hyperlinkElem.href = url;

    // 创建一个新的span元素,用于包裹超链接和括号
    const tempContainerElem = document.createElement('span');
    tempContainerElem.appendChild(document.createTextNode(leftPart));
    tempContainerElem.appendChild(hyperlinkElem);
    tempContainerElem.appendChild(document.createTextNode(rightPart));

    // 临时将span元素插入到页面中(隐藏不可见), 这样才能选中并复制
    tempContainerElem.style.position = 'absolute';
    tempContainerElem.style.left = '-9999px';
    document.body.appendChild(tempContainerElem);

    // 选择临时元素并复制
    const range = document.createRange();
    range.selectNode(tempContainerElem);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand('copy');
    selection.removeAllRanges();

    // 把临时的元素从页面中移除
    document.body.removeChild(tempContainerElem);
}
