// ==UserScript==
// @name         Jira Description disable 'click to Edit' with global enable button
// @version      0.1.3
// @description  禁用点击内容区域编辑，添加全局启用编辑按钮 (适用于新UI)
// @author       gtfish
// @match        http*://jira.*.com/*
// @match        http*://bugs.indeed.com/*
// @match        http*://indeed.atlassian.net/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/jiraTicketDisableClickToEdit/jiraTicketDisableClickToEdit.js
// @downloadURL  https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/jiraTicketDisableClickToEdit/jiraTicketDisableClickToEdit.js
// ==/UserScript==

IS_FIXED_POS = true;

(function () {
    "use strict";

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

    let editingEnabled = false;
    const ticketIdElementSelectorStr = '[data-testid="issue.views.issue-base.foundation.breadcrumbs.current-issue.item"]';

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

    function setClickToEdit(enabled) {
        contentAreasForDsiable.forEach(area => {
            const element = document.querySelector(area.selector);
            if (element) {
                element.style.pointerEvents = enabled ? 'auto' : 'none';
            }
        });
        editingEnabled = enabled;
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

    function attachFixedContainer(btn, { top, left }) {
        btn.style.position = 'fixed';
        btn.style.zIndex = '1000';  // Ensure it's above other elements
        btn.style.top = top;
        btn.style.left = left;
        document.body.appendChild(btn);
    }

    function createButton(title, callbackFunc) {
        const button = document.createElement('button');
        button.className = 'text-nowrap btn btn-warning btn-sm';
        setBtnStyle(button);
        button.textContent = title;
        button.onclick = callbackFunc;
        return button;
    }

    // Modify createGlobalEditButton to add an ID to the button
    function createGlobalEditButton() {
        const button = createButton('Enable Editing', () => {
            if (!editingEnabled) {
                setClickToEdit(true);
                button.textContent = 'Editing Enabled';
                button.style.backgroundColor = '#00875A'; // Change color to indicate enabled state
            }
        });

        button.id = 'global-edit-button'; // Add this line

        if (IS_FIXED_POS) {
            attachFixedContainer(button, { top: "200px", left: "500px" });
        } else {
            const ticketIdElement = document.querySelector(ticketIdElementSelectorStr);
            // const ticketIdElement = document.getElementById("createGlobalItem");
            
            if (ticketIdElement && ticketIdElement.parentNode) {
                ticketIdElement.parentNode.insertBefore(button, ticketIdElement.nextSibling);
            } else {
                document.body.appendChild(button);
            }
        }
    }

    function main() {
        setClickToEdit(false);

        // Function to add the button
        const addButton = () => {
            if (!document.querySelector('#global-edit-button')) {
                createGlobalEditButton();
            }
        };

        // Try to add the button immediately
        addButton();

        // If the button couldn't be added, observe the DOM for changes
        if (!document.querySelector('#global-edit-button')) {
            observeDOM(document.body, addButton);
        }

        // Re-apply disableClickToEdit when the page content changes, but only if editing is not enabled
        const observer = new MutationObserver((mutations) => {
            if (!editingEnabled) {
                for (let mutation of mutations) {
                    if (mutation.type === 'childList' &&
                        mutation.addedNodes.length > 0 &&
                        Array.from(mutation.addedNodes).some(node => node.nodeType === Node.ELEMENT_NODE)) {
                        setClickToEdit(false);
                        break;
                    }
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Run the main function when the page is fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }
})();