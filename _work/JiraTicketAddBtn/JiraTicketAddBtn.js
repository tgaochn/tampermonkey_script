// ==UserScript==
// @name         jira_add_buttons
// @description  Add buttons in JIRA
// @author       gtfish
// @version      0.7.0
// @match        http*://indeed.atlassian.net/browse/*
// @grant        GM_addStyle
// @updateURL           https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/JiraTicketAddBtn/JiraTicketAddBtn.js
// @downloadURL         https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/JiraTicketAddBtn/JiraTicketAddBtn.js
// ==/UserScript==

// 0.7.0: add the function to disable the click to edit and the button to enable it
// 0.6.0: improve the layout and fixed the bug with in-page links
// 0.5.0: align the script with the new jira version
// 0.4.0: added function to fix the position of the button
// 0.3.2: added more btn
// 0.3.0: deeply refactor
// 0.2.0: 把添加hypertext弄成函数了
// 0.1.0: 优化了copy hypertext
// 0.0.1: 修改部分btn

IS_FIXED_POS = false;

(function () {
    'use strict';

    let lastProcessedTicketId = null;
    let isProcessing = false;
    const ticketIdElementSelectorStr = '[data-testid="issue.views.issue-base.foundation.breadcrumbs.current-issue.item"]';
    const summaryElementSelectorStr = '[data-testid="issue.views.issue-base.foundation.summary.heading"]';
    const contentAreasForDsiable = [
        {
            selector: '[data-testid="issue.views.field.rich-text.description"]',
            label: 'Description'
        },
        {
            selector: '[data-testid="issue.views.field.rich-text.customfield_11767"]',
            label: 'Planning Notes'
        },
        {
            selector: '[data-testid="issue.views.field.rich-text.customfield_11694"]',
            label: 'Implementation Details'
        }
    ];


    function processChanges() {
        if (isProcessing) return;
        isProcessing = true;

        try {
            // !! new UI (2024-09-29)
            const ticketIdElement = safeQuerySelector(ticketIdElementSelectorStr);

            if (ticketIdElement) {
                const currentTicketId = ticketIdElement.textContent.trim();
                if (currentTicketId && currentTicketId !== lastProcessedTicketId) {
                    lastProcessedTicketId = currentTicketId;
                    console.log('Ticket ID changed to:', currentTicketId);

                    // Add a small delay before fetching the summary
                    setTimeout(() => {
                        // !! new UI (2024-09-29)
                        const summaryElement = safeQuerySelector(summaryElementSelectorStr);
                        const currentSummary = summaryElement ? summaryElement.textContent.trim() : '';

                        console.log('Fetched summary:', currentSummary);

                        main(currentTicketId, currentSummary, ticketIdElementSelectorStr, contentAreasForDsiable);
                    }, 1000); // 1000ms delay, adjust if needed
                }
            }
        } catch (error) {
            console.error('Error in processChanges:', error);
        } finally {
            isProcessing = false;
        }
    }

    function observeDOM() {
        const targetNode = document.body;
        const config = { childList: true, subtree: true };

        const callback = function (mutationsList, observer) {
            processChanges();
        };

        const observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
    }

    // Wait for the DOM to be fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', observeDOM);
    } else {
        observeDOM();
    }

    // Initial call
    setTimeout(processChanges, 1000);
})();

function safeQuerySelector(selector) {
    try {
        return document.querySelector(selector);
    } catch (error) {
        console.error('Error in querySelector:', error);
        return null;
    }
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

function createButtonWithFunc(title, callbackFunc) {
    const button = document.createElement('button');
    button.className = 'text-nowrap btn btn-warning btn-sm';
    setBtnStyle(button);
    button.innerHTML = title;
    button.onclick = callbackFunc;
    return button;
}

function createButtonCopyText(title, copyText) {
    return createButtonWithFunc(title, () => {
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
    container.style.marginLeft = '100px';
    return container;
}

function createButtonContainerFixedPosition(top, left) {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.zIndex = '1000';  // Ensure it's above other elements
    container.style.top = top;
    container.style.left = left;

    return container;
}

// function attachFixedContainer(container, top, left) {
function attachFixedContainer(container, { top, left }) {

    document.body.appendChild(container);
    container.style.position = 'fixed';
    container.style.zIndex = '1000';  // Ensure it's above other elements
    container.style.top = top;
    container.style.left = left;
}

function extractId(url) {
    const match = url.match(/\/browse\/(.+)$/);
    return match ? match[1] : null;
}

function setClickToEdit(enabled, contentAreasForDsiable) {
    contentAreasForDsiable.forEach(area => {
        const element = document.querySelector(area.selector);
        if (element) {
            if (enabled) {
                element.style.pointerEvents = 'auto';
                element.querySelectorAll('a').forEach(link => {
                    link.style.pointerEvents = 'auto';
                });
            } else {
                element.style.pointerEvents = 'none';
                element.querySelectorAll('a').forEach(link => {
                    link.style.pointerEvents = 'auto';
                });
            }
        }
    });
    editingEnabled = enabled;
}

function createEnableEditingBtn(contentAreasForDsiable) {
    const enableEditBtn = document.createElement('button');
    enableEditBtn.className = 'text-nowrap btn btn-warning btn-sm';
    enableEditBtn.textContent = 'Enable Editing';
    setBtnStyle(enableEditBtn);

    enableEditBtn.onclick = () => {
        setClickToEdit(true, contentAreasForDsiable);
        enableEditBtn.textContent = 'Editing Enabled';
        enableEditBtn.style.backgroundColor = '#00875A'; // Change color to indicate enabled state
    };

    return enableEditBtn;
}

function main(ticketId, summary, contrainerLocSelectorStr, contentAreasForDsiable) {
    // old UI
    // const ticketId = document.getElementById("key-val").childNodes[0].data; 
    // const summary = document.getElementById("summary-val").childNodes[0].data;

    // setup the disabled editing and the btn to enable it
    setClickToEdit(false, contentAreasForDsiable);
    const enableEditBtn = createEnableEditingBtn(contentAreasForDsiable);

    // Remove existing container if any
    const containerId = 'container_id';
    const existingContainer = document.getElementById(containerId);
    if (existingContainer) {
        existingContainer.remove();
    }

    const ticket_url = "https://indeed.atlassian.net/browse/" + ticketId;

    const buttonContainer = createButtonContainer();
    buttonContainer.id = containerId;

    buttonContainer.append(
        enableEditBtn,

        createTextNode('text: '),
        createButtonCopyText('ticketId', ticketId),
        createButtonCopyText('ticket_url', ticket_url),
        createButtonCopyText('summary', `${summary}`),
        // createButtonCopyText('ticket: summary', `${ticketId}: ${summary}`),

        createTextNode('\thref: '),
        createButtonWithFunc('href: ticket', () => copyHypertext(ticketId, ticket_url)),
        // createButtonWithFunc('href: (ticket)', () => copyHypertext(ticketId, ticket_url, '(', ')')),
        createButtonWithFunc('href: (ticket) summary', () => copyHypertext(ticketId, ticket_url, '(', `) ${summary}`)),

        createTextNode('\tmd: '),
        createButtonCopyText('md: [ticket](ticket_url)', `[${ticketId}](${ticket_url})`),
    );

    if (IS_FIXED_POS) {
        // attachFixedContainer(buttonContainer, top = "50px", left = "650px");
        attachFixedContainer(buttonContainer, { top: "50px", left: "650px" });
    }
    else {
        const ticketIdElement = document.querySelector(contrainerLocSelectorStr);
        ticketIdElement.parentNode.insertBefore(buttonContainer, ticketIdElement.parentNode.nextSibling);
    }

}

