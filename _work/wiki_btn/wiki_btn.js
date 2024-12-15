// ==UserScript==
// @name         wiki_btn
// @namespace    wiki_btn
// @version      0.3.0
// @description  wiki加入相关按钮
// @author       gtfish
// @match        https://indeed.atlassian.net/wiki/*
// @require     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @updateURL    https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/wiki_btn/wiki_btn.js
// @downloadURL  https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/wiki_btn/wiki_btn.js

// ==/UserScript==
// 0.3.0: use @require to load external script
// 0.1.3: update matched url
// 0.1.2: 重构代码, btn位置不固定
// 0.1.1: 继续提取出外部函数
// 0.1.0: 使用外部函数的方式实现固定位置的按钮
// 0.0.1: init, btn with fixed position and internal functions

(async function () {
    'use strict';

    const inclusionPatterns = [
    ];

    const exclusionPatterns = [
    ];

    // Wait for utils to load
    function waitForUtils(timeout = 10000) {
        console.log('Starting to wait for utils...');
        const requiredFunctions = [
            'observeDOM',
            'shouldRunScript',
            'createTextNode',
            'createButtonCopyText',
            'addContainerNextToElement2',
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

    async function initScript() {
        try {
            const utils = await waitForUtils();

            if (!utils.shouldRunScript(inclusionPatterns, exclusionPatterns, window.location.href)) {
                return;
            }

            const observeTarget = document.body;
            const targetElementId = "container_id";

            // Check if the target element exists, if not, add the buttons
            utils.observeDOM(observeTarget, () => {
                if (!document.getElementById(targetElementId)) {
                    main(utils);
                }
            });

        } catch (error) {
            console.error('Failed to initialize:', error);
        }
    }

    async function main(utils) {
        // ! add button in the container and define click func
        const pageTitleElementSelectorStr = '[data-testid="title-text"] > span';
        const pageTitleElement = document.querySelector(pageTitleElementSelectorStr);
        const pageTitle = pageTitleElement.firstChild.textContent.trim();
        const createBtnElementSelectorStr = '[data-testid="app-navigation-create"]';
        const createBtnElement = document.querySelector(createBtnElementSelectorStr);

        const btnContainer = utils.createButtonContainer();
        btnContainer.id = "container_id";
        const curURL = window.location.href;

        btnContainer.append(
            utils.createTextNode('text: '),
            utils.createButtonCopyText('url', curURL),

            utils.createTextNode('\thref: '),
            utils.createButtonFromCallback('href: "wiki"', () => utils.copyHypertext('wiki', curURL)),

            utils.createTextNode('\tmd: '),
            utils.createButtonCopyText('md: ["wiki"](url)', `[wiki](${curURL})`),
            utils.createButtonCopyText('md: [{pageTitle}](url)', `[${pageTitle}](${curURL})`),
        );

        // ! add container to the page
        utils.addContainerNextToElement2(btnContainer, createBtnElement);
    }

    initScript();
})();
