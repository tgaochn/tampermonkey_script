// ==UserScript==
// @name         wiki_btn
// @namespace    wiki_btn
// @version      0.1.1
// @description  wiki加入相关按钮
// @author       gtfish
// @match        https://indeed.atlassian.net/*
// @updateURL    https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/wiki_btn/wiki_btn.js
// @downloadURL  https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/wiki_btn/wiki_btn.js
// @grant        GM_xmlhttpRequest

// ==/UserScript==
// 0.1.1: 继续提取出外部函数
// 0.1.0: 使用外部函数的方式实现固定位置的按钮
// 0.0.1: init, btn with fixed position and internal functions

(async function () {
    'use strict';

    // !! Load the external functions
    const UtilsClass = await loadExternalScript('https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js');
    const utils = new UtilsClass();

    const inclusionPatterns = [
    ];

    const exclusionPatterns = [
    ];

    if (!utils.shouldRunScript(inclusionPatterns, exclusionPatterns, window.location.href)) {
        return;
    }

    // Check if the target element exists, if not, add the buttons
    const observeTarget = document.body;
    const targetElementId = "container_id";
    utils.observeDOM(observeTarget, () => {
        if (!document.getElementById(targetElementId)) {
            main();
        }
    });

    async function main() {
        // ! add button in the container and define click func
        const pageTitleElementSelectorStr = '[data-testid="title-text"] > span';
        const pageTitleElement = document.querySelector(pageTitleElementSelectorStr);
        const pageTitle = pageTitleElement.firstChild.textContent.trim();
        // const createBtnElementSelectorStr = '[data-testid="app-navigation-create"]';
        // const createBtnElement = document.querySelector(createBtnElementSelectorStr);

        const btnContainer = utils.createButtonContainer();
        btnContainer.id = "container_id";
        const curURL = window.location.href;

        btnContainer.append(
            utils.createTextNode('text: '),
            utils.createButtonCopyText('url', curURL),

            utils.createTextNode('\thref: '),
            utils.createButton('href: "wiki"', () => utils.copyHypertext('wiki', curURL)),

            utils.createTextNode('\tmd: '),
            utils.createButtonCopyText('md: ["wiki"](url)', `[wiki](${curURL})`),
            utils.createButtonCopyText('md: [{pageTitle}](url)', `[${pageTitle}](${curURL})`),
        );

        // ! add container to the page
        // createBtnElement.parentNode.insertBefore(btnContainer, createBtnElement.parentNode.nextSibling);
        utils.addFixedPosContainerToPage(btnContainer, { top: "10px", left: "1000px" });
    }

    function loadExternalScript(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: function (response) {
                    try {
                        // Create a function from the response text
                        const functionCode = response.responseText;
                        const module = { exports: {} };
                        const wrapper = Function('module', 'exports', functionCode);
                        wrapper(module, module.exports);
                        resolve(module.exports);
                    } catch (error) {
                        reject(error);
                    }
                },
                onerror: function (error) {
                    reject(error);
                }
            });
        });
    }

})();