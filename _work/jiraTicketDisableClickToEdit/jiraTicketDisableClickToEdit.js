// ==UserScript==
// @name         Jira Description disable 'click to Edit' with global enable button
// @version      0.1.2
// @description  禁用点击内容区域编辑，添加全局启用编辑按钮 (适用于新UI)
// @author       gtfish
// @match        http*://jira.*.com/*
// @match        http*://bugs.indeed.com/*
// @match        http*://indeed.atlassian.net/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/jiraTicketDisableClickToEdit/jiraTicketDisableClickToEdit.js
// @downloadURL  https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/jiraTicketDisableClickToEdit/jiraTicketDisableClickToEdit.js
// ==/UserScript==

(function () {
    "use strict";

    const contentAreas = [
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

    function disableClickToEdit() {
        contentAreas.forEach(area => {
            const element = document.querySelector(area.selector);
            if (element) {
                element.style.pointerEvents = 'none';
            }
        });
    }

    function enableClickToEdit() {
        contentAreas.forEach(area => {
            const element = document.querySelector(area.selector);
            if (element) {
                element.style.pointerEvents = 'auto';
            }
        });
    }

    function createGlobalEditButton() {
        const button = document.createElement('button');
        button.textContent = 'Enable Editing';
        button.id = 'global-edit-button';
        button.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 10000;
            padding: 5px 10px;
            background-color: #0052CC;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
        `;
        button.addEventListener('click', () => {
            enableClickToEdit();
            button.textContent = 'Editing Enabled';
            button.disabled = true;
            // setTimeout(() => {
            //     disableClickToEdit();
            //     button.textContent = 'Enable Editing';
            //     button.disabled = false;
            // }, 30000); // Disable editing after 30 seconds
        });
        document.body.appendChild(button);
    }

    function main() {
        disableClickToEdit();
        createGlobalEditButton();

        // Re-apply disableClickToEdit when the page content changes
        const observer = new MutationObserver((mutations) => {
            for (let mutation of mutations) {
                if (mutation.type === 'childList' && 
                    mutation.addedNodes.length > 0 &&
                    Array.from(mutation.addedNodes).some(node => node.nodeType === Node.ELEMENT_NODE)) {
                    disableClickToEdit();
                    break;
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