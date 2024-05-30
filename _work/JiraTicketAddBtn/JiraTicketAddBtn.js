// ==UserScript==
// @name         jira_add_buttons
// @description  Add buttons in JIRA
// @author       gtfish
// @version      0.3.2
// @match        http*://bugs.indeed.com/*
// @grant        GM_addStyle
// @updateURL           https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/JiraTicketAddBtn/JiraTicketAddBtn.js
// @downloadURL         https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/JiraTicketAddBtn/JiraTicketAddBtn.js
// ==/UserScript==
// 0.3.2: added more btn
// 0.3.0: deeply refactor
// 0.2.0: 把添加hypertext弄成函数了
// 0.1.0: 优化了copy hypertext
// 0.0.1: 修改部分btn

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

function createButton(title, callbackFunc) {
    const button = document.createElement('button');
    button.className = 'text-nowrap btn btn-warning btn-sm';
    setBtnStyle(button);
    button.innerHTML = title;
    button.onclick = callbackFunc;
    return button;
}

function createButtonCopyText(title, copyText) {
    return createButton(title, () => {
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

function main() {
    if (!document.getElementById('stalker')) return;
    
    const ticket_id = document.getElementById("key-val").childNodes[0].data;
    const summary = document.getElementById("summary-val").childNodes[0].data;
    const ticket_url = "https://bugs.indeed.com/browse/" + ticket_id

    const buttonContainer = createButtonContainer();
    buttonContainer.id = "container_id";

    buttonContainer.append(
        createTextNode('text: '),
        createButtonCopyText('ticket_id', ticket_id),
        createButtonCopyText('ticket_url', ticket_url),
        createButtonCopyText('summary', `${summary}`),
        createButtonCopyText('ticket: summary', `${ticket_id}: ${summary}`),

        createTextNode('\thref: '),
        createButton('href: (ticket)', () => copyHypertext(ticket_id, ticket_url, '(', ')')),
        createButton('href: ticket', () => copyHypertext(ticket_id, ticket_url)),
        createButton('href: (ticket): summary', () => copyHypertext(ticket_id, ticket_url, '(', `) ${summary}`)),

        createTextNode('\tmd: '),
        createButtonCopyText('md: [ticket](ticket_url)', `[${ticket_id}](${ticket_url})`),
        createButtonCopyText('md: [ticket|ticket_url]', `[${ticket_id}|${ticket_url}]`)        
    );

    document.getElementById("key-val").parentNode.parentNode.appendChild(document.createElement("li").appendChild(buttonContainer));
}

