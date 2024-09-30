// ==UserScript==
// @name         Jira Description disable 'click to Edit' for new UI
// @version      0.0.1
// @description  禁用点击内容区域编辑，保留编辑按钮功能 (适用于新UI)
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

    function getParents(elem, selector) {
        for (; elem && elem !== document; elem = elem.parentNode) {
            if (elem.matches(selector)) return elem;
        }
        return null;
    }

    function isInContentArea(element) {
        const contentAreas = [
            // Description
            '[data-testid="issue.views.field.rich-text.description"]',
            // Planning Notes
            '[data-testid="issue.views.field.rich-text.customfield_11767"]',
            // Implementation Details (assuming it's customfield_11768, adjust if different)
            '[data-testid="issue.views.field.rich-text.customfield_11768"]'
        ];

        for (let selector of contentAreas) {
            if (getParents(element, selector)) {
                return true;
            }
        }
        return false;
    }

    function isEditButton(element) {
        return element.tagName.toLowerCase() === 'button' && 
               element.getAttribute('aria-label') && 
               element.getAttribute('aria-label').includes('Edit');
    }

    const $body = document.querySelector("body");

    $body.addEventListener(
        "click",
        event => {
            const targetEle = event.target;
            
            // 允许点击链接和图片
            if (["a", "img"].includes(targetEle.tagName.toLowerCase())) {
                return true;
            }

            // 允许点击编辑按钮
            if (isEditButton(targetEle) || getParents(targetEle, 'button[aria-label*="Edit"]')) {
                return true;
            }

            // 检查是否在内容区域内
            if (isInContentArea(targetEle)) {
                // 阻止编辑
                event.preventDefault();
                event.stopPropagation();
                return false;
            }
        },
        true
    );
})();