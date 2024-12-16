// ==UserScript==
// @name         IQLAddBtn
// @namespace    IQLAddBtn
// @version      0.4.0
// @description  任意网站右边加入相关链接 - IQL 页面增加 link
// @author       gtfish
// @include      *://idash.sandbox.indeed.net/*
// @require      https://cdn.bootcss.com/jquery/3.4.1/jquery.min.js
// @require     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @updateURL       https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/iDash_add_btn/IQL.js
// @downloadURL     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/iDash_add_btn/IQL.js

// ==/UserScript==
// 0.4.0: use utils from external script
// 0.3.1: added new links
// 0.3.0: fixed the btn position and remove jira link
// 0.2.1: fixed the btn position and add links
// 0.2.0: improved the layout, added clipboard content detection and added MutationObserver
// 0.1.2: clean up code
// 0.1.1: MutationObserver methods
// 0.1.0: 增加format IQL url的各种按钮
// 2024-02-06: IQL 增加 google sheet to md table 的网站链接

const IS_FIXED_POS = true;

(async function () {
    'use strict';

    function waitForUtils(timeout = 10000) {
        console.log('Starting to wait for utils...');
        const requiredFunctions = [
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

    async function initScript() {
        try {
            const utils = await waitForUtils();

            const observeTarget = document.body;
            const targetElementId = "container_id";

            utils.observeDOM(observeTarget, () => {
                if (!document.getElementById(targetElementId)) {
                    main(utils);
                }
            });

        } catch (error) {
            console.error('Failed to initialize:', error);
        }
    }

    initScript();
})();

async function main(utils) {
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
    
    async function get_IQL_link() {
        const btn = document.getElementById('share-query-verbatim');
        const initialClipboardContents = await navigator.clipboard.readText();

        btn.click();
        const timeoutDuration = 3000;
        const pollingInterval = 500;
        let elapsedTime = 0;

        while (elapsedTime < timeoutDuration) {
            await delay(pollingInterval);
            elapsedTime += pollingInterval;

            const currentClipboardContents = await navigator.clipboard.readText();
            if (currentClipboardContents !== initialClipboardContents) {
                return currentClipboardContents;
            }
        }
        return null;
    }

    const btnContainer = utils.createButtonContainer();
    const btnSubContainer1 = utils.createButtonContainer();
    btnContainer.id = "container_id";
    btnContainer.appendChild(btnSubContainer1);
    btnContainer.style.display = 'flex';
    btnContainer.style.flexDirection = 'column';

    btnSubContainer1.append(
        // Copy URL button
        utils.createButtonFromCallback('url', async () => {
            await get_IQL_link();
        }),

        // Hyperlink buttons
        utils.createTextNode('\thref: '),
        utils.createButtonFromCallback('href: IQL', async () => {
            const clipboardContents = await get_IQL_link();
            utils.copyHypertext('IQL', clipboardContents);
        }),
        utils.createButtonFromCallback('href: (IQL)', async () => {
            const clipboardContents = await get_IQL_link();
            utils.copyHypertext('IQL', clipboardContents, '(', ')');
        }),

        // Markdown buttons
        utils.createTextNode('\tmd: '),
        utils.createButtonFromCallback('md: [IQL](url)', async () => {
            const clipboardContents = await get_IQL_link();
            navigator.clipboard.writeText(`[IQL](${clipboardContents})`);
        }),

        // External links
        utils.createTextNode('\tlink: '),
        utils.createButtonOpenUrl('search_iql', 'https://app.glean.com/search?q=type%3Aiqlindex+type%3Aiqlquery+type%3Areusablequery+type%3Abusinessmetric+ctr&tab=all&hcp=1'),
        utils.createButtonOpenUrl('Gsheet2Md', 'https://tabletomarkdown.com/convert-spreadsheet-to-markdown'),
        utils.createButtonOpenUrl('iql_formatter', 'https://codebeautify.org/sqlformatter'),
        utils.createButtonOpenUrl('sql_formatter', 'https://nene.github.io/prettier-sql-playground/')
    );

    if (IS_FIXED_POS) {
        utils.addFixedPosContainerToPage(btnContainer, { top: "-10px", left: "650px" });
    } else {
        const existingContainerId = 'undefined-button-container';
        const existingContainer = document.getElementById(existingContainerId);
        existingContainer.appendChild(btnContainer);
    }
}