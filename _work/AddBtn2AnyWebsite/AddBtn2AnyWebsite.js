// ==UserScript==
// @name         AddBtn2AnyWebsite
// @namespace    AddBtn2AnyWebsite
// @version      0.0.10
// @description  任意网站加入相关链接
// @author       gtfish
// @match        https://teststats.sandbox.indeed.net/*
// @match        https://butterfly.sandbox.indeed.net/*
// @match        https://proctor-v2.sandbox.indeed.net/*
// @match        https://code.corp.indeed.com/*
// @match        https://app.datadoghq.com/*
// @updateURL    https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/AddBtn2AnyWebsite/AddBtn2AnyWebsite.js
// @downloadURL  https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/AddBtn2AnyWebsite/AddBtn2AnyWebsite.js

// ==/UserScript==
// 0.1.0: 重构代码, 使用外部函数
// 0.0.9: aligned with the new version of jira 
// 0.0.8: bug fixed
// 0.0.7: added datadog, set default text to "link"
// 0.0.6: bug fixed
// 0.0.5: bug fixed
// 0.0.4: specify enabled sites for butterfly
// 0.0.2: adjust the btn position
// 0.0.1: init

(async function () {
    'use strict';
    const UtilsClass = await loadExternalScript('https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js');
    const utils = new UtilsClass();

    const inclusionPatterns = [
    ];
    // https://indeed.atlassian.net/browse
    const exclusionPatterns = [
        /^https:\/\/butterfly\.sandbox\.indeed\.net\/#\/model.*$/,
        /^https:\/\/indeed\.atlassian\.net\/browse.*$/,
    ];

    if (!utils.shouldRunScript(inclusionPatterns, exclusionPatterns, window.location.href)) {
        return;
    }

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

    ];

    // Check if the target element exists, if not, add the buttons
    const observeTarget = document.body;
    const targetElementId = "container_id";
    utils.observeDOM(observeTarget, () => {
        if (!document.getElementById(targetElementId)) {
            main(url2title);
        }
    });

    async function main() {
        const btnContainer = utils.createButtonContainer();
        const btnSubContainer1 = utils.createButtonContainer();
        // const btnSubContainer2 = utils.createButtonContainer();

        btnContainer.id = "container_id";
        btnContainer.appendChild(btnSubContainer1);
        // btnContainer.appendChild(btnSubContainer2);
        btnContainer.style.display = 'flex';
        btnContainer.style.flexDirection = 'column'; // contrainer 上下排列
        // containerElement.style.flexDirection = 'row'; // contrainer 左右排列
    
        const curURL = window.location.href;
        const pageTitle = utils.findBestMatch(curURL, url2title);
    
        // ! add buttons in the containers
        btnSubContainer1.append(
            // 按钮: copy url
            utils.createButton('url', async () => {
                navigator.clipboard.writeText(curURL);
                // navigator.clipboard.writeText(curHost);
            }),
    
            // 按钮: copy 超链接
            utils.createTextNode('\thref: '),
            utils.createButton(`href: ${pageTitle}`, async () => {
                utils.copyHypertext(pageTitle, curURL);
            }),
    
    
            // 按钮: copy md 形式的链接
            utils.createTextNode('\tmd: '),
            utils.createButton(`md: [${pageTitle}](url)`, async () => {
                navigator.clipboard.writeText(`[${pageTitle}](${curURL})`);
            }),
    
            // 按钮: 打开 link
            // utils.createTextNode('\tlink: '),
            // utils.createButtonOpenUrl('Gsheet2Md', 'https://tabletomarkdown.com/convert-spreadsheet-to-markdown'), // 打开 google sheet 转 md table 的网站
        );
    
        utils.addFixedPosContainerToPage(buttonContainer, { top: "-10px", left: "1200px" });
    }    
})();

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