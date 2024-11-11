// ==UserScript==
// @name         wiki_btn
// @namespace    wiki_btn
// @version      0.0.1
// @description  wiki加入相关按钮
// @author       gtfish
// @match        https://indeed.atlassian.net/*
// @updateURL    https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/wiki_btn/wiki_btn.js
// @downloadURL  https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/wiki_btn/wiki_btn.js

// ==/UserScript==
// 0.0.1: init, btn with fixed position and internal functions

(async function () {
    'use strict';

    const inclusionPatterns = [
    ];

    const exclusionPatterns = [
    ];

    if (!shouldRunScript(inclusionPatterns, exclusionPatterns)) {
        return;
    }

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

function shouldRunScript(inclusionPatterns, exclusionPatterns) {
    const url = window.location.href;

    // Check if the URL matches any inclusion pattern
    if (inclusionPatterns.length > 0 && !inclusionPatterns.some(pattern => pattern.test(url))) {
        return false;
    }

    // Check if the URL matches any exclusion pattern
    if (exclusionPatterns.length > 0 && exclusionPatterns.some(pattern => pattern.test(url))) {
        return false;
    }

    // Default behavior for other pages
    return true;
}

function main() {
    // ! add button in the container and define click func
    const pageTitleElementSelectorStr = '[data-testid="title-text"] > span';
    const pageTitleElement = document.querySelector(pageTitleElementSelectorStr);
    const pageTitle = pageTitleElement.firstChild.textContent.trim();
    const createBtnElementSelectorStr = '[data-testid="app-navigation-create"]';
    const createBtnElement = document.querySelector(createBtnElementSelectorStr);

    const btnContainer = createButtonContainer();
    btnContainer.id = "container_id";
    const curURL = window.location.href;


    btnContainer.append(
        createTextNode('text: '),
        createButtonCopyText('url', curURL),

        createTextNode('\thref: '),
        createButton('href: "wiki"', () => copyHypertext('wiki', curURL)),

        createTextNode('\tmd: '),
        createButtonCopyText('md: ["wiki"](url)', `[wiki](${curURL})`),
        createButtonCopyText('md: [{pageTitle}](url)', `[${pageTitle}](${curURL})`),
    );

    // ! add container to the page
    // createBtnElement.parentNode.insertBefore(btnContainer, createBtnElement.parentNode.nextSibling);
    attachFixedContainer(btnContainer, { top: "10px", left: "1000px" });
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

    return btn;
}

function createButton(text, callbackFunc) {
    var button = document.createElement('button');
    button = setBtnStyle(button);
    button.innerHTML = text;
    button.onclick = callbackFunc;
    return button;
}

function createButtonOpenUrl(text, targetUrl) {
    return createButton(text, () => {
        window.open(targetUrl);
    })
}

function createButtonCopyText(text, copyText) {
    return createButton(text, () => {
        navigator.clipboard.writeText(copyText);
    });
}

function createTextNode(text) {
    return document.createTextNode(text);
}

function createButtonContainer() {
    const container = document.createElement('div');
    container.style.display = 'inline-block';
    container.style.marginTop = '10px';
    container.style.marginLeft = '10px';
    return container;
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

function attachFixedContainer(container, { top, left }) {

    document.body.appendChild(container);
    container.style.position = 'fixed';
    container.style.zIndex = '1000';  // Ensure it's above other elements
    container.style.top = top;
    container.style.left = left;
}