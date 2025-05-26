// ==UserScript==
// @name            url_formatter
// @namespace       url_formatter
// @version         0.1.1
// @description     format URL and redirect to a new URL
// @author          gtfish
// @include         *://*.console.aws.amazon.com/*
// @include         *://teststats.sandbox.indeed.net/*
// @require         https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @updateURL       https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/url_formatter/url_formatter.js
// @downloadURL     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/url_formatter/url_formatter.js
// ==/UserScript==
// 0.1.1: enhance testStatsCleanup to reorder URL parameters, keeping allocationId and dateRangeFrom in first 2 positions
// 0.1.0: init the script, redirect to a new URL, add button to modify teststats URL

(function () {
    'use strict';

    // Configuration constants
    const CONFIG = {
        UTILS_TIMEOUT: 10000,
        CONTAINER_ID: "url_formatter_container",
        BUTTON_POSITION: { top: "5px", left: "1000px" },
        REQUIRED_UTILS: ["createButtonFromCallback", "createButtonContainer", "addFixedPosContainerToPage", "observeDOM"]
    };

    // URL processing rules configuration
    const urlRules = {
        awsConsoleRedirect: {
            // Match AWS urls in `us-east-1`
            urlRegex: /^https:\/\/us-east-1\.console\.aws\.amazon\.com\/console\/home\?region=us-east-1(#)?$/,
            action: 'redirect',
            targetUrl: 'https://us-east-2.console.aws.amazon.com/console/home?region=us-east-2#'
        },

        testStatsCleanup: {
            // Match teststats analyze URLs
            urlRegex: /^https:\/\/teststats\.sandbox\.indeed\.net\/analyze\/.*/,
            action: 'modify',
            buttonText: 'Remove dateRangeTo & Reorder',
            processor: function (url) {
                const urlObj = new URL(url);
                
                // Store all parameters
                const allParams = new Map();
                for (const [key, value] of urlObj.searchParams) {
                    allParams.set(key, value);
                }
                
                // Remove dateRangeTo parameter
                allParams.delete('dateRangeTo');
                
                // Clear existing search params
                urlObj.search = '';
                
                // Add parameters in desired order: allocationId and dateRangeFrom first
                const priorityParams = ['allocationId', 'dateRangeFrom'];
                
                // Add priority parameters first
                for (const param of priorityParams) {
                    if (allParams.has(param)) {
                        urlObj.searchParams.append(param, allParams.get(param));
                        allParams.delete(param);
                    }
                }
                
                // Add remaining parameters in their original order
                for (const [key, value] of allParams) {
                    urlObj.searchParams.append(key, value);
                }
                
                // Decode the result to preserve original parameter formatting
                return decodeURIComponent(urlObj.toString());
            }
        }
    };

    /**
     * Process URL based on matching rules
     */
    function processUrl() {
        const currentUrl = window.location.href;

        for (const [ruleName, rule] of Object.entries(urlRules)) {
            if (rule.urlRegex.test(currentUrl)) {
                console.log(`URL formatter: Matched rule '${ruleName}' for URL: ${currentUrl}`);

                switch (rule.action) {
                    case 'redirect':
                        console.log(`URL formatter: Redirecting to: ${rule.targetUrl}`);
                        window.location.href = rule.targetUrl;
                        return;

                    case 'modify':
                        // For modify actions, we'll add a button instead of immediate processing
                        return rule;
                }
            }
        }
        return null;
    }

    /**
     * Create button for URL modification
     */
    function createModifyButton(rule, utils) {
        const currentUrl = window.location.href;
        const newUrl = rule.processor(currentUrl);

        return utils.createButtonFromCallback(rule.buttonText, () => {
            console.log(`URL formatter: Modifying URL from: ${currentUrl} to: ${newUrl}`);
            window.location.href = newUrl;
        });
    }

    /**
     * Wait for utils to load
     */
    function waitForUtils(timeout = CONFIG.UTILS_TIMEOUT) {
        const requiredFunctions = CONFIG.REQUIRED_UTILS;

        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            function checkUtils() {
                if (window.utils && requiredFunctions.every((func) => typeof window.utils[func] === "function")) {
                    resolve(window.utils);
                } else if (Date.now() - startTime >= timeout) {
                    reject(new Error("Timeout waiting for utils"));
                } else {
                    setTimeout(checkUtils, 100);
                }
            }

            checkUtils();
        });
    }

    /**
     * Initialize script
     */
    async function initScript() {
        // First check for immediate redirects
        const matchedRule = processUrl();

        // If we have a modify rule, set up the button interface
        if (matchedRule && matchedRule.action === 'modify') {
            const utils = await waitForUtils();

            const targetElementId = CONFIG.CONTAINER_ID;
            const observeTarget = document.body;

            // Check if the target element exists, if not, add the buttons
            utils.observeDOM(observeTarget, () => {
                if (!document.getElementById(targetElementId)) {
                    addModifyButton(matchedRule, utils, targetElementId);
                }
            });
        }
    }

    /**
     * Add modify button to page
     */
    function addModifyButton(rule, utils, containerId) {
        const btnContainer = utils.createButtonContainer();
        btnContainer.id = containerId;

        const modifyButton = createModifyButton(rule, utils);
        if (modifyButton) {
            btnContainer.appendChild(modifyButton);
            utils.addFixedPosContainerToPage(btnContainer, CONFIG.BUTTON_POSITION);
        }
    }

    // Execute script initialization
    initScript();
})();