// ==UserScript==
// @name         jira_add_buttons
// @description  Add buttons in JIRA
// @author       gtfish
// @version      0.9.0
// @match        http*://indeed.atlassian.net/browse/*
// @grant        GM_addStyle
// @require     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @updateURL    https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/JiraTicketAddBtn/JiraTicketAddBtn.js
// @downloadURL  https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/JiraTicketAddBtn/JiraTicketAddBtn.js

// ==/UserScript==
// 0.9.0: 重构代码, use utils from external script
// 0.8.0: 重构代码, 提取函数
// 0.7.3: change the disable btn tex
// 0.7.1: fix the bug which cause the links not clickable
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

(async function () {
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

    const utils = await waitForUtils();

    // Wait for the DOM to be fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', observeDOM);
    } else {
        observeDOM();
    }

    // run main
    setTimeout(processChanges, 1000);

    function processChanges() {
        if (isProcessing) return;
        isProcessing = true;

        try {
            // !! new UI (2024-09-29)
            const ticketIdElement = document.querySelector(ticketIdElementSelectorStr);

            if (ticketIdElement) {
                const currentTicketId = ticketIdElement.textContent.trim();
                if (currentTicketId && currentTicketId !== lastProcessedTicketId) {
                    lastProcessedTicketId = currentTicketId;
                    console.log('Ticket ID changed to:', currentTicketId);

                    // Add a small delay before fetching the summary
                    setTimeout(() => {
                        // !! new UI (2024-09-29)
                        const summaryElement = document.querySelector(summaryElementSelectorStr);
                        const currentSummary = summaryElement ? summaryElement.textContent.trim() : '';

                        console.log('Fetched summary:', currentSummary);

                        main(currentTicketId, currentSummary, ticketIdElementSelectorStr, contentAreasForDsiable, utils);
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

    // Wait for utils to load
    function waitForUtils(timeout = 10000) {
        console.log('Starting to wait for utils...');
        const requiredFunctions = [
            'createButtonContainerFromJson',
            'observeDOM'
        ];

        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            function checkUtils() {
                console.log('Checking utils:', window.utils);
                console.log('Available functions:', window.utils ? Object.keys(window.utils) : 'none');

                if (window.utils && requiredFunctions.every(func => {
                    const hasFunc = typeof window.utils[func] === 'function';
                    console.log(`Checking function ${func}:`, hasFunc);
                    return hasFunc;
                })) {
                    console.log('All required functions found');
                    resolve(window.utils);
                } else if (Date.now() - startTime >= timeout) {
                    const missingFunctions = requiredFunctions.filter(func =>
                        !window.utils || typeof window.utils[func] !== 'function'
                    );
                    console.log('Timeout reached. Missing functions:', missingFunctions);
                    reject(new Error(`Timeout waiting for utils. Missing functions: ${missingFunctions.join(', ')}`));
                } else {
                    console.log('Not all functions available yet, checking again in 100ms');
                    setTimeout(checkUtils, 100);
                }
            }

            checkUtils();
        });
    }    

    async function main(ticketId, summary, contrainerLocSelectorStr, contentAreasForDsiable, utils) {
        // setup the disabled editing and the btn to enable it
        setClickToEdit(false, contentAreasForDsiable);
        const enableEditBtn = createEnableEditingBtn(contentAreasForDsiable, utils);

        // Remove existing container if any
        const containerId = 'container_id';
        const existingContainer = document.getElementById(containerId);
        if (existingContainer) {
            existingContainer.remove();
        }

        const ticket_url = "https://indeed.atlassian.net/browse/" + ticketId;

        const buttonContainer = utils.createButtonContainer();
        buttonContainer.id = containerId;

        buttonContainer.append(
            enableEditBtn,

            utils.createTextNode('text: '),
            utils.createButtonCopyText('ticketId', ticketId),
            utils.createButtonCopyText('ticket_url', ticket_url),
            utils.createButtonCopyText('summary', `${summary}`),

            utils.createTextNode('\thref: '),
            utils.createButtonCopyHypertext('href: ticket', ticketId, ticket_url),
            utils.createButtonFromCallback('href: (ticket) summary', () => utils.copyHypertext(ticketId, ticket_url, '(', `) ${summary}`)),

            utils.createTextNode('\tmd: '),
            utils.createButtonCopyText('md: [ticket](ticket_url)', `[${ticketId}](${ticket_url})`),
        );

        if (IS_FIXED_POS) {
            utils.addFixedPosContainerToPage(buttonContainer, { top: "50px", left: "650px" });
        }
        else {
            const ticketIdElement = document.querySelector(contrainerLocSelectorStr);
            utils.addContainerNextToElement1(buttonContainer, ticketIdElement);
        }
    }
})();

function setClickToEdit(enabled, contentAreasForDsiable) {
    contentAreasForDsiable.forEach(area => {
        const element = document.querySelector(area.selector);
        if (element) {
            if (enabled) {
                element.style.pointerEvents = 'auto';
            } else {
                // ! disable all except some elements below
                element.style.pointerEvents = 'none';

                // Enable regular links
                element.querySelectorAll('a').forEach(link => {
                    link.style.pointerEvents = 'auto';
                    link.style.cursor = 'pointer';
                });

                // Enable inline card structures (ticket)
                element.querySelectorAll('[data-inline-card="true"]').forEach(card => {
                    card.style.pointerEvents = 'auto';
                    let link = card.querySelector('a[data-testid="inline-card-resolved-view"]');
                    if (link) {
                        link.style.pointerEvents = 'auto';
                        link.style.cursor = 'pointer';
                    }
                });

                // Enable name tags 
                element.querySelectorAll('[data-testid="mention-with-profilecard-trigger"]').forEach(mention => {
                    mention.style.pointerEvents = 'auto';
                    mention.style.cursor = 'pointer';
                });
            }
        }
    });
    editingEnabled = enabled;
}

function createEnableEditingBtn(contentAreasForDsiable, utils) {
    let enableEditBtn = document.createElement('button');
    enableEditBtn.className = 'text-nowrap btn btn-warning btn-sm';
    enableEditBtn.textContent = 'Editing Disabled';
    enableEditBtn = utils.setBtnStyle(enableEditBtn);
    enableEditBtn.style.backgroundColor = '#ff991f';

    enableEditBtn.onclick = () => {
        setClickToEdit(true, contentAreasForDsiable);
        enableEditBtn.textContent = 'Editing Enabled';
        enableEditBtn.style.backgroundColor = '#00875A'; // Change color to indicate enabled state
    };

    return enableEditBtn;
}