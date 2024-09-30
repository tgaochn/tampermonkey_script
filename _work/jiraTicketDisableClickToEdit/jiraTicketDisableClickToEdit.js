// ==UserScript==
// @name         Jira Description disable 'click to Edit' for new UI (forked from xianghongai/Tampermonkey-UserScript)
// @version      0.0.1
// @description  禁用点击编辑
// @author       gtfish
// @match        http*://jira.*.com/*
// @match        http*://bugs.indeed.com/*
// @match        http*://indeed.atlassian.net/*
// @grant        none
// @updateURL           https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/jiraTicketDisableClickToEdit/jiraTicketDisableClickToEdit.js
// @downloadURL         https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/jiraTicketDisableClickToEdit/jiraTicketDisableClickToEdit.js

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
            selector: '[data-testid="issue.views.field.rich-text.customfield_11768"]',
            label: 'Implementation Details'
        }
    ];

    function isInContentArea(element) {
        return contentAreas.some(area => getParents(element, area.selector));
    }

    function getParents(elem, selector) {
        for (; elem && elem !== document; elem = elem.parentNode) {
            if (elem.matches(selector)) return elem;
        }
        return null;
    }

    function createEditButton(label) {
        const button = document.createElement('button');
        button.textContent = 'Edit ' + label;
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

    function addEditButtons() {
        contentAreas.forEach(area => {
            const contentElement = document.querySelector(area.selector);
            if (contentElement && !contentElement.querySelector('.custom-edit-button')) {
                const button = createEditButton(area.label);
                button.classList.add('custom-edit-button');
                button.addEventListener('click', () => {
                    // 模拟双击以进入编辑模式
                    const event = new MouseEvent('dblclick', {
                        'view': window,
                        'bubbles': true,
                        'cancelable': true
                    });
                    contentElement.dispatchEvent(event);
                });
                // 将按钮插入到内容区域的前面
                contentElement.parentNode.insertBefore(button, contentElement);
            }
        });
    }

    // 监听DOM变化，为新加载的内容添加编辑按钮
    const observer = new MutationObserver(mutations => {
        for (let mutation of mutations) {
            if (mutation.type === 'childList') {
                addEditButtons();
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // 初始添加编辑按钮
    addEditButtons();

    // 禁用内容区域的点击编辑
    document.body.addEventListener('click', event => {
        const targetEle = event.target;
        
        // 允许点击链接和图片
        if (["a", "img"].includes(targetEle.tagName.toLowerCase())) {
            return true;
        }

        // 允许点击自定义编辑按钮
        if (targetEle.classList.contains('custom-edit-button')) {
            return true;
        }

        // 检查是否在内容区域内
        if (isInContentArea(targetEle)) {
            // 阻止编辑
            event.preventDefault();
            event.stopPropagation();
            return false;
        }
    }, true);
})();