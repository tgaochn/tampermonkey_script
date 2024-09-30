// ==UserScript==
// @name         Jira Description disable 'click to Edit' and add custom edit buttons for new UI
// @version      0.0.9
// @description  禁用点击内容区域编辑，添加可用的自定义编辑按钮 (适用于新UI)
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

    // Define content areas to be managed
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
            selector: '[data-testid="issue.views.field.rich-text.customfield_11768"]',
            label: 'Implementation Details'
        }
    ];

    // Check if an element is within a content area
    function isInContentArea(element) {
        return contentAreas.some(area => element.closest(area.selector));
    }

    // Create a custom edit button
    function createEditButton(label) {
        const button = document.createElement('button');
        button.textContent = 'Edit ' + label;
        button.className = 'custom-edit-button';
        button.style.cssText = `
            margin-left: 10px;
            padding: 5px 10px;
            background-color: #0052CC;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
        `;
        return button;
    }

    // Add edit buttons to content areas
    function addEditButtons() {
        contentAreas.forEach(area => {
            const contentElement = document.querySelector(area.selector);
            if (contentElement && !document.querySelector(`${area.selector} + .custom-edit-button`)) {
                const button = createEditButton(area.label);
                button.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    
                    // Try to find and click the edit button
                    const editButton = contentElement.querySelector('button[aria-label*="Edit"]');
                    if (editButton) {
                        editButton.click();
                    } else {
                        // If edit button not found, try to trigger edit mode programmatically
                        const editEvent = new CustomEvent('jira.issue.editable.trigger', { bubbles: true });
                        contentElement.dispatchEvent(editEvent);
                    }
                    console.log('Edit attempted for', area.label);
                });
                contentElement.parentNode.insertBefore(button, contentElement.nextSibling);
            }
        });
    }

    // Debounce function to limit frequency of function calls
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Main function to set up the script
    function main() {
        // Debounced version of addEditButtons
        const debouncedAddEditButtons = debounce(addEditButtons, 300);

        // Set up MutationObserver to watch for DOM changes
        const observer = new MutationObserver((mutations) => {
            let shouldAddButtons = false;
            for (let mutation of mutations) {
                if (mutation.type === 'childList' && 
                    mutation.addedNodes.length > 0 &&
                    Array.from(mutation.addedNodes).some(node => node.nodeType === Node.ELEMENT_NODE)) {
                    shouldAddButtons = true;
                    break;
                }
            }
            if (shouldAddButtons) {
                debouncedAddEditButtons();
            }
        });

        // Start observing the document body for changes
        observer.observe(document.body, { childList: true, subtree: true });

        // Initial addition of edit buttons
        setTimeout(addEditButtons, 1000);

        // Add click event listener to prevent unwanted edits
        document.body.addEventListener('click', event => {
            const targetEle = event.target;
            
            // Allow clicks on links, images, and custom edit buttons
            if (["a", "img"].includes(targetEle.tagName.toLowerCase()) || 
                targetEle.classList.contains('custom-edit-button')) {
                return true;
            }

            // Prevent edits when clicking directly on content areas
            if (isInContentArea(targetEle)) {
                event.preventDefault();
                event.stopPropagation();
                return false;
            }
        }, true);
    }

    // Run the main function
    main();
})();