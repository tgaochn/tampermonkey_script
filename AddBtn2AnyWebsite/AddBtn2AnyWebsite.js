// ==UserScript==
// @name         AddBtn2AnyWebsite
// @namespace    AddBtn2AnyWebsite
// @version      0.0.1
// @description  任意网站加入相关链接
// @author       gtfish
// @include      https://teststats.sandbox.indeed.net/*
// @include      https://butterfly.sandbox.indeed.net/*
// @include      https://proctor-v2.sandbox.indeed.net/*
// @include      https://indeed.atlassian.net/*
// @include      https://code.corp.indeed.com/*
// @updateURL       https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/AddBtn2AnyWebsite/AddBtn2AnyWebsite.js
// @downloadURL     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/AddBtn2AnyWebsite/AddBtn2AnyWebsite.js

// ==/UserScript==
// 0.0.1: init



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
    const URL2TITLE = [
        // google for testing
        // @include      https://www.google.com/*
        // { pattern: /^https?:\/\/(www\.)?google\.com.*$/, title: 'Google' },

        { pattern: /^https:\/\/butterfly\.sandbox\.indeed\.net\/#\/proctor.*$/, title: 'Butterfly traffic' },
        { pattern: /^https:\/\/butterfly\.sandbox\.indeed\.net\/#\/ruleSet.*$/, title: 'RuleSet' },
        { pattern: /^https:\/\/proctor-v2\.sandbox\.indeed\.net.*$/, title: 'proctor' },
        { pattern: /^https:\/\/teststats\.sandbox\.indeed\.net.*$/, title: 'teststats' },
        { pattern: /^https:\/\/indeed\.atlassian\.net\/wiki.*$/, title: 'wiki' },
        { pattern: /^https:\/\/code\.corp\.indeed\.com.*$/, title: 'code' },

    ];

    const btnContainer = createButtonContainer();
    const btnSubContainer1 = createButtonContainer();
    // const btnSubContainer2 = createButtonContainer();
    btnContainer.id = "container_id";
    btnContainer.appendChild(btnSubContainer1);
    // btnContainer.appendChild(btnSubContainer2);
    btnContainer.style.display = 'flex';
    btnContainer.style.flexDirection = 'column'; // contrainer 上下排列
    // containerElement.style.flexDirection = 'row'; // contrainer 左右排列

    const curURL = window.location.href;
    const pageTitle = findBestMatch(curURL, URL2TITLE);

    // ! add buttons in the containers
    btnSubContainer1.append(
        // 按钮: copy url
        createButton('url', async () => {
            navigator.clipboard.writeText(curURL);
            // navigator.clipboard.writeText(curHost);
        }),

        // 按钮: copy 超链接
        createTextNode('\thref: '),
        createButton(`href: ${pageTitle}`, async () => {
            copyHypertext(pageTitle, curURL);
        }),


        // 按钮: copy md 形式的链接
        createTextNode('\tmd: '),
        createButton(`md: [${pageTitle}](url)`, async () => {
            navigator.clipboard.writeText(`[${pageTitle}](${curURL})`);
        }),

        // 按钮: 打开 link
        // createTextNode('\tlink: '),
        // createButtonOpenUrl('Gsheet2Md', 'https://tabletomarkdown.com/convert-spreadsheet-to-markdown'), // 打开 google sheet 转 md table 的网站
    );

    attachFixedContainer(btnContainer, top = "-10px", left = "650px");
}

function findBestMatch(url, patterns) {
    // console.log("Finding best match for:", url); // Debugging line
    for (const { pattern, title } of patterns) {
        // console.log("Checking pattern:", pattern); // Debugging line
        if (pattern.test(url)) {
            // console.log("Match found:", title); // Debugging line
            return title;
        }
    }
    // console.log("No match found, returning URL"); // Debugging line
    return new URL(url).hostname; // Default to the hostname if no match found
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
