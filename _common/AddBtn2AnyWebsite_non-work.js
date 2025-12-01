// ==UserScript==
// @name         AddBtn2AnyWebsite_non-work
// @namespace    AddBtn2AnyWebsite_non-work
// @version      1.0.3
// @description  任意网站加入相关链接 (non-work sites)
// @author       gtfish
// @match        https://app.monarchmoney.com/*
// @match        https://app.monarch.com/*
// @match        https://allocommunications.smarthub.coop/*
// @match        https://frontier.com/*
// @match        https://www.atmosenergy.com/*
// @match        https://www.energyogre.com/*
// @match        https://www.amazon.com/gp/*
// @require      https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @updateURL    https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_common/AddBtn2AnyWebsite_non-work.js
// @downloadURL  https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_common/AddBtn2AnyWebsite_non-work.js

// ==/UserScript==
// 1.0.2: adjusted button positions for amazon
// 1.0.1: added Citi button
// 1.0.0: init, split from AddBtn2AnyWebsite.js
// 0.4.7: added new url pattern for monarchmoney
// 0.4.6: added new url pattern for butterfly
// 0.4.5: added Bilt(Wells Fargo) button
// 0.4.4: added jump button
// 0.4.3: added US Bank button
// 0.4.2: refactored to use customButtonMappings for wiki with helper function - better separation of concerns
// 0.4.0: added custom button mapping system - allows defining completely custom buttons for specific URL patterns
// 0.3.1: merged wiki_btn functionality - added wiki page support with page title extraction and relative positioning
// 0.2.2: add dynamic title generation based on URL parsing
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
    "use strict";

    // Configuration constants
    const CONFIG = {
        UTILS_TIMEOUT: 10000,
        CONTAINER_ID: "container_id_non_work",
        BUTTON_POSITION: { top: "-10px", left: "1000px" },
        REQUIRED_UTILS: [
            "observeDOM",
            "shouldRunScript",
            "createButtonContainer",
            "createButtonCopyText",
            "createTextNode",
            "createButtonCopyHypertext",
            "createButtonOpenUrl",
            "addFixedPosContainerToPage",
            "initAddBtn2AnyWebsite",
        ],
        DEFAULT_TITLE: "link",
        MAX_DISPLAY_LENGTH: 25, // Maximum length for button display text
    };

    // !! custom button config for specific URL patterns
    // When a URL matches a pattern here, these custom buttons will be used instead of the default ones
    const customButtonMappings = [
        // ! amazon: 订单页面 -> 联系客服
        // https://www.amazon.com/gp/css/order-history
        {
            pattern: /^https:\/\/www\.amazon\.com\/gp\/css\/order-history.*$/,
            // buttonPosition: { top: "100px", left: "800px" }, // Custom position
            buttonPosition: { top: "100px", left: "0px" }, // Custom position
            customButtons: (url, utils) => {
                return [utils.createButtonOpenUrl("联系客服", "https://www.amazon.com/hz/contact-us")];
            },
        },

        // ! amazon: 取消所有订阅
        {
            pattern: /^https:\/\/www\.amazon\.com\/gp\/subscribe-and-save\/manager\/viewsubscriptions.*$/,
            // buttonPosition: { top: "100px", left: "800px" }, // Custom position
            buttonPosition: { top: "220px", left: "0px" }, // Custom position
            customButtons: (url, utils) => {
                return [utils.createButtonOpenUrl("管理页面<br>取消所有", "https://www.amazon.com/auto-deliveries/subscriptionList")];
            },
        },

        // ! allocommunications: 网费报销
        {
            pattern: /^https:\/\/allocommunications\.smarthub\.coop\/.*$/,
            buttonPosition: { top: "-10px", left: "1000px" }, // Custom position
            customButtons: (url, utils) => {
                return [utils.createButtonOpenUrl("US Bank", "https://www.usbank.com/index.html")];
            },
        },

        // ! frontier: 网费报销
        {
            pattern: /^https:\/\/frontier\.com\/.*$/,
            buttonPosition: { top: "-10px", left: "1000px" }, // Custom position
            customButtons: (url, utils) => {
                return [utils.createButtonOpenUrl("US Bank", "https://www.usbank.com/index.html")];
            },
        },

        // ! atmosenergy: 燃气费

        {
            pattern: /^https:\/\/www\.atmosenergy\.com\/.*$/,
            buttonPosition: { top: "-10px", left: "1000px" }, // Custom position
            customButtons: (url, utils) => {
                return [utils.createButtonOpenUrl("US Bank", "https://www.usbank.com/index.html")];
            },
        },

        // ! energyogre: 电费
        {
            pattern: /^https:\/\/www\.energyogre\.com\/.*$/,
            buttonPosition: { top: "-10px", left: "1000px" }, // Custom position
            customButtons: (url, utils) => {
                return [utils.createButtonOpenUrl("US Bank", "https://www.usbank.com/index.html")];
            },
        },

        // ! monarchmoney: 资产管理
        {
            pattern: /^https:\/\/app\.(monarchmoney|monarch)\.com\/.*$/,
            buttonPosition: { top: "-10px", left: "1000px" }, // Custom position
            customButtons: (url, utils) => {
                return [
                    utils.createButtonOpenUrl("BOA", "https://www.bankofamerica.com"),
                    utils.createButtonOpenUrl("Chase", "https://www.chase.com"),
                    utils.createButtonOpenUrl("Citi", "https://www.citi.com"),
                    utils.createButtonOpenUrl("Bilt(Wells Fargo)", "https://www.wellsfargo.com"),
                    utils.createButtonOpenUrl("Fidelity", "https://digital.fidelity.com/prgw/digital/login/full-page"),
                    utils.createButtonOpenUrl("Merrill Lynch", "https://www.ml.com"),
                ];
            },
        },
    ];

    const inclusionPatterns = [];
    const exclusionPatterns = [];

    // !! custom url to title mapping (empty for non-work, all use custom buttons)
    const url2title = [];

    // Wait for utils to load
    function waitForUtils(timeout = CONFIG.UTILS_TIMEOUT) {
        console.log("Starting to wait for utils...");
        const requiredFunctions = CONFIG.REQUIRED_UTILS;

        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            function checkUtils() {
                console.log("Checking utils:", window.utils);
                console.log("Available functions:", window.utils ? Object.keys(window.utils) : "none");

                if (
                    window.utils &&
                    requiredFunctions.every((func) => {
                        const hasFunc = typeof window.utils[func] === "function";
                        console.log(`Checking function ${func}:`, hasFunc);
                        return hasFunc;
                    })
                ) {
                    console.log("All required functions found");
                    resolve(window.utils);
                } else if (Date.now() - startTime >= timeout) {
                    const missingFunctions = requiredFunctions.filter(
                        (func) => !window.utils || typeof window.utils[func] !== "function"
                    );
                    console.log("Timeout reached. Missing functions:", missingFunctions);
                    reject(new Error(`Timeout waiting for utils. Missing functions: ${missingFunctions.join(", ")}`));
                } else {
                    console.log("Not all functions available yet, checking again in 100ms");
                    setTimeout(checkUtils, 100);
                }
            }

            checkUtils();
        });
    }

    async function initScript() {
        try {
            const utils = await waitForUtils();
            
            const scriptConfig = {
                CONFIG,
                customButtonMappings,
                url2title,
                pathSegmentMappings: null, // No path segment mappings for non-work
                jumpButtonMappings: null,  // No jump buttons for non-work
                inclusionPatterns,
                exclusionPatterns,
            };

            utils.initAddBtn2AnyWebsite(scriptConfig);
        } catch (error) {
            console.error("Failed to initialize:", error);
        }
    }

    initScript();
})();

