// ==UserScript==
// @name         AddBtn2AnyWebsite
// @namespace    AddBtn2AnyWebsite
// @version      0.2.1
// @description  任意网站加入相关链接
// @author       gtfish
// @match        https://teststats.sandbox.indeed.net/*
// @match        https://butterfly.sandbox.indeed.net/*
// @match        https://proctor-v2.sandbox.indeed.net/*
// @match        https://code.corp.indeed.com/*
// @match        https://app.datadoghq.com/*
// @require      https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @updateURL    https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/AddBtn2AnyWebsite/AddBtn2AnyWebsite.js
// @downloadURL  https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/AddBtn2AnyWebsite/AddBtn2AnyWebsite.js

// ==/UserScript==
// 0.2.1: extract CONFIG constants for better maintainability
// 0.2.0: use @require to load external script
// 0.1.1: bug fixed
// 0.1.0: 重构代码, 使用外部函数
// 0.0.9: aligned with the new version of jira 
// 0.0.8: bug fixed
// 0.0.7: added datadog, set default text to "link"
// 0.0.6: bug fixed
// 0.0.5: bug fixed
// 0.0.4: specify enabled sites for butterfly
// 0.0.2: adjust the btn position
// 0.0.1: init

// wiki page for debugging
// @match        https://indeed.atlassian.net/*

(async function () {
    'use strict';

    // Configuration constants
    const CONFIG = {
        UTILS_TIMEOUT: 10000,
        CONTAINER_ID: "container_id",
        BUTTON_POSITION: { top: "-10px", left: "1200px" },
        REQUIRED_UTILS: ["observeDOM", "shouldRunScript", "createButtonContainer", "createButtonCopyText", 
                        "createTextNode", "createButtonCopyHypertext", "findBestMatch", "addFixedPosContainerToPage"],
        DEFAULT_TITLE: "link"
    };

    const inclusionPatterns = [
    ];
    
    // https://indeed.atlassian.net/browse
    const exclusionPatterns = [
        /^https:\/\/butterfly\.sandbox\.indeed\.net\/#\/model.*$/,
        /^https:\/\/indeed\.atlassian\.net\/browse.*$/,
    ];

    const url2title = [
        // google for testing
        // @include      https://www.google.com/*
        // { pattern: /^https?:\/\/(www\.)?google\.com.*$/, title: 'Google' },

        { pattern: /^https:\/\/butterfly\.sandbox\.indeed\.net\/#\/proctor.*$/, title: 'Butterfly traffic' },
        { pattern: /^https:\/\/butterfly\.sandbox\.indeed\.net\/#\/ruleSet.*$/, title: 'RuleSet' },
        { pattern: /^https:\/\/proctor-v2\.sandbox\.indeed\.net.*$/, title: 'proctor' },
        { pattern: /^https:\/\/teststats\.sandbox\.indeed\.net.*$/, title: 'teststats' },
        { pattern: /^https:\/\/code\.corp\.indeed\.com.*$/, title: 'code' },
        { pattern: /^https:\/\/app\.datadoghq\.com.*$/, title: 'datadog' },
        { pattern: /^https:\/\/indeed\.atlassian\.net\/wiki.*$/, title: 'wiki' },
    ];

    // Wait for utils to load
    function waitForUtils(timeout = CONFIG.UTILS_TIMEOUT) {
        console.log('Starting to wait for utils...');
        const requiredFunctions = CONFIG.REQUIRED_UTILS;

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
            const targetElementId = CONFIG.CONTAINER_ID;

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
        const btnContainer = utils.createButtonContainer();
        const btnSubContainer1 = utils.createButtonContainer();
        // const btnSubContainer2 = utils.createButtonContainer();

        btnContainer.id = CONFIG.CONTAINER_ID;
        btnContainer.appendChild(btnSubContainer1);
        // btnContainer.appendChild(btnSubContainer2);
        btnContainer.style.display = 'flex';
        btnContainer.style.flexDirection = 'column'; // contrainer 上下排列
        // containerElement.style.flexDirection = 'row'; // contrainer 左右排列

        const curURL = window.location.href;
        const pageTitle = utils.findBestMatch(curURL, url2title) || CONFIG.DEFAULT_TITLE;

        // ! add buttons in the containers
        btnSubContainer1.append(
            // 按钮: copy url
            utils.createButtonCopyText('url', curURL),

            // 按钮: copy 超链接
            utils.createTextNode('\thref: '),
            utils.createButtonCopyHypertext(`href: ${pageTitle}`, pageTitle, curURL),

            // 按钮: copy md 形式的链接
            utils.createTextNode('\tmd: '),
            utils.createButtonCopyText(`md: [${pageTitle}](url)`, `[${pageTitle}](${curURL})`),

            // 按钮: 打开 link
            // utils.createTextNode('\tlink: '),
            // utils.createButtonOpenUrl('Gsheet2Md', 'https://tabletomarkdown.com/convert-spreadsheet-to-markdown'), // 打开 google sheet 转 md table 的网站
        );

        utils.addFixedPosContainerToPage(btnContainer, CONFIG.BUTTON_POSITION);
    }

    initScript();
})();
