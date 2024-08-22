// ==UserScript==
// @name                Butterfly_webapp_btn
// @version             0.4.5
// @description         Add btn on Butterfly webapp
// @author              gtfish
// @license             MIT
// @match               https://butterfly.sandbox.indeed.net/*
// @run-at              document-idle
// @grant               GM_getValue
// @grant               GM_setValue
// @grant               GM_registerMenuCommand
// @updateURL           https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/Butterfly_webapp_btn/Butterfly_webapp_btn.js
// @downloadURL         https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/Butterfly_webapp_btn/Butterfly_webapp_btn.js
// ==/UserScript==
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

    if (!shouldRunScript(inclusionPatterns, exclusionPatterns)) {
        return;
    }

    const observeDOM = (function () {
        const MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
        const eventListenerSupported = window.addEventListener;

        return function (targetNode, onAddCallback, onRemoveCallback) {
            if (MutationObserver) {
                // Define a new observer
                const mutationObserver = new MutationObserver(function (mutations, observer) {
                    if (mutations[0].addedNodes.length && onAddCallback) {
                        onAddCallback();
                    }
                });

                // Have the observer observe target node for changes in children
                mutationObserver.observe(targetNode, {
                    childList: true,
                    subtree: true
                });
            } else if (eventListenerSupported) {
                targetNode.addEventListener('DOMNodeInserted', onAddCallback, { once: true });
            }
        };
    })();

    // Check if the target element exists, if not, add the buttons
    const observeTarget = document.body;
    const targetElementId = "container_id";
    observeDOM(observeTarget, () => {
        if (!document.getElementById(targetElementId)) {
            main();
        }
    });
})();

function shouldRunScript(inclusionPatterns, exclusionPatterns) {
    const url = window.location.href;

    // Check if the URL matches any inclusion pattern
    if (!inclusionPatterns.some(pattern => pattern.test(url))) {
        return false;
    }

    // Check if the URL matches any exclusion pattern
    if (exclusionPatterns.some(pattern => pattern.test(url))) {
        return false;
    }

    // Default behavior for other pages
    return true;
}

function main() {
    // ! add button in the container and define click func
    const modelInfoButtonContainer = createButtonContainer();
    const buildInfoButtonContainer = createButtonContainer();
    const buildsTagsSelector = 'span[class="row no-gutters justify-content-start"]';
    const modelLinkSelector = 'div[class="model-view--header-model-name-row"]';
    const modelNameElem = document.querySelector(modelLinkSelector).childNodes[0];
    const modelId = modelNameElem.childNodes[0].innerText;
    const modelUrl = 'https://butterfly.sandbox.indeed.net/#/model/' + modelId;
    const modelConfUrl = modelUrl + '/PUBLISHED/config';
    modelInfoButtonContainer.id = "container_id";

    modelInfoButtonContainer.append(
        createTextNode('text: '),
        createButtonCopyText('id', modelId),
        createButtonCopyText('model_url', modelUrl),
        createButtonCopyText('config_url', modelConfUrl),

        createTextNode('\thref: '),
        createButton('href: (model)', () => copyHypertext('model', modelUrl, '(', ')')),
        createButton('href: model', () => copyHypertext('model', modelUrl)),

        createTextNode('\tmd: '),
        createButtonCopyText('md: [model](url)', `[model](${modelUrl})`),
        createButtonCopyText('md: [id](url)', `[${modelId}](${modelUrl})`),
        // createButtonCopyText('md: [model|url]', `[model|${modelUrl}]`),
    );

    buildInfoButtonContainer.append(
        createTextNode('builds: '),
        createButton('last_build_id', () => {
            const buildsTags = document.querySelector(buildsTagsSelector).childNodes[0].childNodes;
            const lastBuildId = buildsTags[buildsTags.length - 1].id;
            navigator.clipboard.writeText(lastBuildId);
        }),
        createButton('all_build_id', () => {
            const buildsTags = document.querySelector(buildsTagsSelector).childNodes[0].childNodes;
            const buildIds = [];

            buildsTags.forEach((div) => {
                buildIds.push(div.id);
            });

            const textToCopy = buildIds.join("\n");
            navigator.clipboard.writeText(textToCopy);
        }),

        createTextNode('\tlinks: '),
        createButtonOpenUrl('IS promotion wiki', 'https://wiki.indeed.com/pages/viewpage.action?pageId=640792440'),
        createButtonOpenUrl('US Apply', 'https://butterfly.sandbox.indeed.net/#/proctor/jobsearch/idxbutterflyapplymodeltst?q=%24%7B%28adFormat%3D%3D%27hp%27+%7C%7C+adFormat%3D%3D%27hpd%27%29+%26%26+clientContext+%3D%3D+%27relevantJobs%27+%26%26+clientApplication+%3D%3D+%27ElephantInferenceServer%27+%26%26+country+%3D%3D+%27US%27%7D'),
        createButtonOpenUrl('US CTR', 'https://butterfly.sandbox.indeed.net/#/proctor/jobsearch/idxsjbutterflyctrmodeltst?q=%24%7B%28adFormat%3D%3D%27hp%27+%7C%7C+adFormat%3D%3D%27hpd%27%29+%26%26+clientContext+%3D%3D+%27relevantJobs%27+%26%26+clientApplication+%3D%3D+%27ElephantInferenceServer%27+%26%26+country+%3D%3D+%27US%27%7D'),
        createButtonOpenUrl('US dislike', 'https://butterfly.sandbox.indeed.net/#/proctor/jobsearch/idxbutterflydislikemodeltst'),
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

function setBtnStyle(btn) {
    btn.style.backgroundColor = '#009688';
    btn.style.color = 'white';
    btn.style.padding = '5px 5px';
    btn.style.height = '10px';
    btn.style.fontSize = '14px';
    btn.style.border = '1px solid #ccc';
    btn.style.borderRadius = '4px';
    btn.style.cursor = 'pointer';
    btn.style.outline = 'none';
    btn.style.boxSizing = 'border-box';
}

function createButton(text, callbackFunc) {
    const useBtnStyleFromPage = true;
    const button = document.createElement('button');

    if (useBtnStyleFromPage) {
        button.className = 'model-view--status-label badge bg-info';
    }
    else {
        button.className = 'text-nowrap btn btn-warning btn-sm';
        setBtnStyle(button);
    }

    button.innerHTML = text;
    button.onclick = callbackFunc;
    return button;
}

function createButtonOpenUrl(text, targetUrl) {
    return createButton(text, () => {
        window.open(targetUrl);
    })
}

function createButtonCopyText(text, copyText) {
    return createButton(text, () => {
        navigator.clipboard.writeText(copyText);
    });
}

function createTextNode(text) {
    return document.createTextNode(text);
}

function createButtonContainer() {
    const container = document.createElement('div');
    container.style.display = 'inline-block';
    container.style.marginTop = '10px';
    container.style.marginLeft = '10px';
    return container;
}

function copyHypertext(text, url, leftPart = '', rightPart = '') {
    // Create a new anchor element
    const hyperlinkElem = document.createElement('a');
    hyperlinkElem.textContent = text;
    hyperlinkElem.href = url;

    // 创建一个新的span元素,用于包裹超链接和括号
    const tempContainerElem = document.createElement('span');
    tempContainerElem.appendChild(document.createTextNode(leftPart));
    tempContainerElem.appendChild(hyperlinkElem);
    tempContainerElem.appendChild(document.createTextNode(rightPart));

    // 临时将span元素插入到页面中(隐藏不可见), 这样才能选中并复制
    tempContainerElem.style.position = 'absolute';
    tempContainerElem.style.left = '-9999px';
    document.body.appendChild(tempContainerElem);

    // 选择临时元素并复制
    const range = document.createRange();
    range.selectNode(tempContainerElem);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand('copy');
    selection.removeAllRanges();

    // 把临时的元素从页面中移除
    document.body.removeChild(tempContainerElem);
}