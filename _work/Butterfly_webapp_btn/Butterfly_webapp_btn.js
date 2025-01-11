// ==UserScript==
// @name                Butterfly_webapp_btn
// @version             0.6.1
// @description         Add btn on Butterfly webapp
// @author              gtfish
// @license             MIT
// @match               https://butterfly.sandbox.indeed.net/*
// @run-at              document-idle
// @grant               GM_getValue
// @grant               GM_setValue
// @grant               GM_registerMenuCommand
// @require             https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @updateURL           https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/Butterfly_webapp_btn/Butterfly_webapp_btn.js
// @downloadURL         https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/Butterfly_webapp_btn/Butterfly_webapp_btn.js

// ==/UserScript==
// 0.6.1: add btn to fetch model version
// 0.6.0: use @require to load external script
// 0.5.1: bug fixed
// 0.5.0: 重构代码, 使用外部函数
// 0.4.7: improve the btn text
// 0.4.5: bug fixed
// 0.4.4: bug fixed
// 0.4.3: add more btn
// 0.4.2: remove jira link
// 0.4.0: add btn to open links
// 0.3.5: use mutationObserver instead of await
// 0.3.2: improved code
// 0.3.0: improved the layout and added text desc
// 0.2.5: reorder button positions and revise desc
// 0.2.4: Added copy build ID and copy hypertext functionality
// 0.2.0: 增加copy build id
// 0.1.0: 优化了hypertext的复制逻辑
// 0.0.1: init, 添加若干按钮

(async function () {
    'use strict';

    const inclusionPatterns = [
        /^https:\/\/butterfly\.sandbox\.indeed\.net\/#\/model.*$/,
    ];

    const exclusionPatterns = [
    ];

    // Wait for utils to load
    function waitForUtils(timeout = 10000) {
        console.log('Starting to wait for utils...');
        const requiredFunctions = [
            'observeDOM',
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
        const modelInfoButtonContainer = utils.createButtonContainer();
        const buildInfoButtonContainer = utils.createButtonContainer();
        const buildsTagsSelector = 'span[class="row no-gutters justify-content-start"]';
        const modelLinkSelector = 'div[class="model-view--header-model-name-row"]';
        const modelNameElem = document.querySelector(modelLinkSelector).childNodes[0];
        const modelId = modelNameElem.childNodes[0].innerText;
        const modelUrl = 'https://butterfly.sandbox.indeed.net/#/model/' + modelId;
        const modelConfUrl = modelUrl + '/PUBLISHED/config';

        modelInfoButtonContainer.id = "container_id";

        modelInfoButtonContainer.append(
            utils.createTextNode('text: '),
            utils.createButtonCopyText('id', modelId),
            utils.createButtonCopyText('model_url', modelUrl),
            utils.createButtonCopyText('config_url', modelConfUrl),

            utils.createTextNode('\thref: '),
            utils.createButtonCopyHypertext('href: "model"', 'model', modelUrl),
            utils.createButtonCopyHypertext('href: {model_id}', modelId, modelUrl),

            utils.createTextNode('\tmd: '),
            utils.createButtonCopyText('md: ["model"](url)', `[model](${modelUrl})`),
            utils.createButtonCopyText('md: [{model_id}](url)', `[${modelId}](${modelUrl})`),
        );

        buildInfoButtonContainer.append(
            utils.createTextNode('builds: '),
            utils.createButtonFromCallback('current_version', () => {
                const modelVersionSelector = 'div[class="model-version-selector-option-title"]';
                const modelVersion = document.querySelector(modelVersionSelector).childNodes[0].textContent;
                navigator.clipboard.writeText(modelVersion);
            }),

            utils.createButtonFromCallback('last_build_id', () => {
                const buildsTags = document.querySelector(buildsTagsSelector).childNodes[0].childNodes;
                const lastBuildId = buildsTags[buildsTags.length - 1].id;
                navigator.clipboard.writeText(lastBuildId);
            }),

            utils.createButtonFromCallback('all_build_id', () => {
                const buildsTags = document.querySelector(buildsTagsSelector).childNodes[0].childNodes;
                const buildIds = [];

                buildsTags.forEach((div) => {
                    buildIds.push(div.id);
                });

                const textToCopy = buildIds.join("\n");
                navigator.clipboard.writeText(textToCopy);
            }),

            utils.createTextNode('\tlinks: '),
            utils.createButtonOpenUrl('IS promotion wiki', 'https://wiki.indeed.com/pages/viewpage.action?pageId=640792440'),
            utils.createButtonOpenUrl('US Apply', 'https://butterfly.sandbox.indeed.net/#/proctor/jobsearch/idxbutterflyapplymodeltst?q=%24%7B%28adFormat%3D%3D%27hp%27+%7C%7C+adFormat%3D%3D%27hpd%27%29+%26%26+clientContext+%3D%3D+%27relevantJobs%27+%26%26+clientApplication+%3D%3D+%27ElephantInferenceServer%27+%26%26+country+%3D%3D+%27US%27%7D'),
            utils.createButtonOpenUrl('US CTR', 'https://butterfly.sandbox.indeed.net/#/proctor/jobsearch/idxsjbutterflyctrmodeltst?q=%24%7B%28adFormat%3D%3D%27hp%27+%7C%7C+adFormat%3D%3D%27hpd%27%29+%26%26+clientContext+%3D%3D+%27relevantJobs%27+%26%26+clientApplication+%3D%3D+%27ElephantInferenceServer%27+%26%26+country+%3D%3D+%27US%27%7D'),
            utils.createButtonOpenUrl('US dislike', 'https://butterfly.sandbox.indeed.net/#/proctor/jobsearch/idxbutterflydislikemodeltst'),
        );

        // ! add container to the table
        const table = document.querySelector('.table.table-sm.model-view--table');
        const newRow = document.createElement('tr');
        const cell11 = document.createElement('td');
        const cell12 = document.createElement('td');

        cell11.textContent = 'My Btn to copy';
        cell12.style.display = 'flex';
        cell12.style.flexDirection = 'column'; // contrainer 上下排列
        // containerElement.style.flexDirection = 'row'; // contrainer 左右排列

        cell12.appendChild(modelInfoButtonContainer);
        cell12.appendChild(buildInfoButtonContainer);
        newRow.appendChild(cell11);
        newRow.appendChild(cell12);
        table.appendChild(newRow);
    }

    initScript();
})();