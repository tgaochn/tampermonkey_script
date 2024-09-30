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

(function () {
    "use strict";

    let editingEnabled = false;

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

    function setClickToEdit(enabled) {
        contentAreas.forEach(area => {
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

    function createGlobalEditButton() {
        const button = document.createElement('button');
        button.className = 'text-nowrap btn btn-warning btn-sm';
        button.id = 'global-edit-button';
        button.textContent = 'Enable Editing';
        // setBtnStyle(button);

        button.style.cssText = `
            position: fixed;
            top: 10px;
            left: 1000px;
            z-index: 10000;
            padding: 5px 10px;
            background-color: #0052CC;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
        `;

        button.addEventListener('click', () => {
            if (!editingEnabled) {
                setClickToEdit(true);
                button.textContent = 'Editing Enabled';
                button.style.backgroundColor = '#00875A'; // Change color to indicate enabled state
            }
        });
        document.body.appendChild(button);
    }

    function main() {
        setClickToEdit(false);
        createGlobalEditButton();

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