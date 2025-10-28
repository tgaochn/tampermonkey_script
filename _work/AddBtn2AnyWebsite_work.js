// ==UserScript==
// @name         AddBtn2AnyWebsite_work
// @namespace    AddBtn2AnyWebsite_work
// @version      1.0.2
// @description  任意网站加入相关链接 (work-related sites)
// @author       gtfish
// @match        https://teststats.sandbox.indeed.net/*
// @match        https://butterfly.sandbox.indeed.net/*
// @match        https://proctor.sandbox.indeed.net/*
// @match        https://proctor-v2.sandbox.indeed.net/*
// @match        https://code.corp.indeed.com/*
// @match        https://app.datadoghq.com/*
// @match        https://indeed.atlassian.net/wiki/*
// @require      https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @updateURL    https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/AddBtn2AnyWebsite_work.js
// @downloadURL  https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/AddBtn2AnyWebsite_work.js

// ==/UserScript==
// 1.0.2: bug fixed
// 1.0.1: added jump button for butterfly proctor/testStats
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
        CONTAINER_ID: "container_id_work",
        BUTTON_POSITION: { top: "-10px", left: "1200px" },
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
        WIKI_SELECTORS: {
            PAGE_TITLE: '[data-testid="title-text"] > span',
            CREATE_BTN: '[data-testid="app-navigation-create"]',
        },
    };

    // !! custom button config for specific URL patterns
    // When a URL matches a pattern here, these custom buttons will be used instead of the default ones
    const customButtonMappings = [
        // ! indeed wiki
        {
            pattern: /^https:\/\/indeed\.atlassian\.net\/wiki.*$/,
            buttonPosition: { top: "20px", left: "750px" }, // Custom position to avoid blocking content
            customButtons: (url, utils) => {
                // Get the matched config for wiki to reuse default logic
                const matchedConfig = url2title.find((config) => config.pattern.test(url));

                // Create default buttons first - need to pass required parameters
                const buttonElements = [
                    utils.createButtonCopyText("url", url),
                ];

                if (matchedConfig) {
                    buttonElements.push(
                        utils.createTextNode("\thref: ", null),
                        utils.createButtonCopyHypertext(`${matchedConfig.title}`, matchedConfig.title, url),
                        utils.createTextNode("\tmd: ", null),
                        utils.createButtonCopyText(`[${matchedConfig.title}](url)`, `[${matchedConfig.title}](${url})`)
                    );
                }

                // Add formatted title button for wiki pages
                try {
                    const pageTitleElement = document.querySelector(CONFIG.WIKI_SELECTORS.PAGE_TITLE);
                    if (pageTitleElement && pageTitleElement.firstChild) {
                        const rawPageTitle = pageTitleElement.firstChild.textContent.trim();
                        const formattedTitle = rawPageTitle.replace(/\s+/g, "-");

                        // Apply cut off logic for display title (but keep full title for copying)
                        const displayTitle =
                            formattedTitle.length > CONFIG.MAX_DISPLAY_LENGTH
                                ? `{${formattedTitle.substring(0, CONFIG.MAX_DISPLAY_LENGTH / 2)}...}`
                                : formattedTitle;

                        buttonElements.push(
                            utils.createButtonCopyText(`[${displayTitle}](url)`, `[${formattedTitle}](${url})`)
                        );
                    }
                } catch (error) {
                    console.error("Error adding formatted wiki title button:", error);
                }

                return buttonElements;
            },
        },
    ];

    // !! Jump button mappings for specific URL patterns
    // When a URL matches a pattern here, these jump buttons will be added to the default buttons
    const jumpButtonMappings = [
        // ! indeed websites: jump to related indeed pages
        {
            pattern: /^https:\/\/((proctor)|(teststats)|(butterfly))\.sandbox\.indeed\.net.*$/,
            jumpButtons: (url, utils, textColor, dynamicTitle) => {
                return [
                    utils.createButtonOpenUrl(
                        "\"Butterfly Proctor\"",
                        `https://butterfly.sandbox.indeed.net/proctor/jobsearch/${dynamicTitle}`
                    ),
                    utils.createButtonOpenUrl(
                        `${dynamicTitle} (Butterfly)`,
                        `https://butterfly.sandbox.indeed.net/proctor/jobsearch/${dynamicTitle}`
                    ),
                    utils.createButtonOpenUrl(
                        `${dynamicTitle} (proctor)`,
                        `https://proctor.sandbox.indeed.net/proctor/toggles/view/${dynamicTitle}`
                    ),
                    utils.createButtonOpenUrl(
                        "testStats",
                        `https://teststats.sandbox.indeed.net/analyze/${dynamicTitle}`
                    ),
                ];
            },
        },
    ];

    // !! Path segment mapping rules for easy understanding
    const PATH_SEGMENT_MAPPINGS = [
        {
            regex: /^(onlineranking_preapply_shadow_tst)$/,
            replacement: "PreApply",
        },
        {
            regex: /^((idxbutterflyapplymodeltst)|(isbutterflyapplymodeltst))$/,
            replacement: "AsPerSeen",
        },
        {
            regex: /^((idxsjbutterflyctrmodeltst)|(isbutterflyctrmodeltst))$/,
            replacement: "CTR",
        },
        {
            regex: /^((idxsjbutterflyapplycompletemodeltst)|(issjbutterflyapplycompletemodeltst))$/,
            replacement: "AcPerClick",
        },
        {
            regex: /^((idxsjbutterflyapplyperclickedmodeltst)|(issjbutterflyapplyperclickedmodeltst))$/,
            replacement: "AsPerClick",
        },
        {
            regex: /^((idxorgbutterflyqualifiedmodeltst)|(isorgbutterflyqualifiedmodeltst))$/,
            replacement: "Attainability",
        },
        {
            regex: /^((idxbutterflyqualifiedmodeltst)|(isbpbutterflyqualifiedmodeltst))$/,
            replacement: "eQualified",
        },
    ];

    const inclusionPatterns = [];

    // https://indeed.atlassian.net/browse
    const exclusionPatterns = [
        /^https:\/\/butterfly\.sandbox\.indeed\.net\/(#\/)?model.*$/,
        /^https:\/\/indeed\.atlassian\.net\/browse.*$/,
    ];

    // !! custom url to title mapping
    const url2title = [
        // ! static title
        { pattern: /^https:\/\/code\.corp\.indeed\.com.*$/, title: "code" },
        { pattern: /^https:\/\/app\.datadoghq\.com.*$/, title: "datadog" },

        // ! dynamic title with both fixed and dynamic options
        // ruleSet
        {
            pattern: /^https:\/\/butterfly\.sandbox\.indeed\.net\/(#\/)?ruleSet.*$/,
            title: "RuleSet",
            dynamicTitle: true, // Enable dynamic title generation for this pattern
            showBothTitles: true, // Show both fixed and dynamic title buttons
            customParser: (url) => {
                // Extract rule name from butterfly ruleSet URL
                try {
                    // For URLs like: #/ruleSet/MODEL_CONFIG/JSS_RELEVANT_JOBS/
                    const hashPart = url.split("#")[1] || "";
                    const pathSegments = hashPart.split("/").filter((segment) => segment.length > 0);

                    // Look for the segment after 'ruleSet' and 'MODEL_CONFIG'
                    const ruleSetIndex = pathSegments.indexOf("ruleSet");
                    if (ruleSetIndex >= 0 && ruleSetIndex + 2 < pathSegments.length) {
                        const ruleSegment = pathSegments[ruleSetIndex + 2].split("?")[0]; // Remove query params
                        return ruleSegment; // Don't apply mapping for rule names, return as-is
                    }

                    return null;
                } catch (error) {
                    console.error("Error in butterfly ruleSet custom parser:", error);
                    return null;
                }
            },
        },

        // butterfly proctor
        {
            pattern: /^https:\/\/butterfly\.sandbox\.indeed\.net\/(#\/)?proctor.*$/,
            title: "Butterfly traffic",
            dynamicTitle: true, // Enable dynamic title generation for this pattern
            showBothTitles: true, // Show both fixed and dynamic title buttons
            customParser: (url) => {
                // Extract model name from butterfly proctor URL
                try {
                    // For URLs like: #/proctor/jobsearch/idxbutterflyapplymodeltst?q=...
                    const hashPart = url.split("#")[1] || "";
                    const pathSegments = hashPart.split("/").filter((segment) => segment.length > 0);

                    // Look for the segment after 'proctor'
                    const proctorIndex = pathSegments.indexOf("proctor");
                    if (proctorIndex >= 0 && proctorIndex + 2 < pathSegments.length) {
                        const rawModelSegment = pathSegments[proctorIndex + 2].split("?")[0]; // Remove query params
                        const mappedSegment = applyPathSegmentMapping(rawModelSegment);

                        // Return both raw and mapped segments
                        return {
                            displayTitle: mappedSegment,
                            rawSegment: rawModelSegment,
                        };
                    }

                    return null;
                } catch (error) {
                    console.error("Error in butterfly proctor custom parser:", error);
                    return null;
                }
            },
        },

        // testStats
        {
            pattern: /^https:\/\/teststats\.sandbox\.indeed\.net.*$/,
            title: "testStats",
            dynamicTitle: true, // Enable dynamic title generation for this pattern
            showBothTitles: true, // Show both fixed and dynamic title buttons
            customParser: (url) => {
                // Extract model name from teststats URL
                try {
                    const urlObj = new URL(url);
                    const pathSegments = urlObj.pathname.split("/").filter((segment) => segment.length > 0);
                    const rawSegment = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : null;
                    if (rawSegment) {
                        const mappedSegment = applyPathSegmentMapping(rawSegment);
                        return {
                            displayTitle: mappedSegment,
                            rawSegment: rawSegment,
                        };
                    }
                    return null;
                } catch (error) {
                    console.error("Error in teststats custom parser:", error);
                    return null;
                }
            },
        },

        // proctor
        {
            pattern: /^https:\/\/proctor(-v2)?\.sandbox\.indeed\.net.*$/,
            title: "proctor",
            dynamicTitle: true, // Enable dynamic title generation for this pattern
            showBothTitles: true, // Show both fixed and dynamic title buttons
            textColor: "#FFFFFF", // white color for proctor
            customParser: (url) => {
                // Extract model name from proctor URL
                try {
                    const urlObj = new URL(url);
                    const pathSegments = urlObj.pathname.split("/").filter((segment) => segment.length > 0);
                    const rawSegment = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : null;
                    if (rawSegment) {
                        const mappedSegment = applyPathSegmentMapping(rawSegment);
                        return {
                            displayTitle: mappedSegment,
                            rawSegment: rawSegment,
                        };
                    }
                    return null;
                } catch (error) {
                    console.error("Error in proctor custom parser:", error);
                    return null;
                }
            },
        },

        // wiki
        {
            pattern: /^https:\/\/indeed\.atlassian\.net\/wiki.*$/,
            title: "wiki",
            dynamicTitle: true, // Enable dynamic title generation for this pattern
            showBothTitles: true, // Show both fixed and dynamic title buttons
            buttonPosition: { top: "20px", left: "750px" }, // Custom position to avoid blocking content
            customParser: (url) => {
                // Extract page title from wiki page DOM
                try {
                    const pageTitleElement = document.querySelector(CONFIG.WIKI_SELECTORS.PAGE_TITLE);
                    return pageTitleElement ? pageTitleElement.firstChild.textContent.trim() : null;
                } catch (error) {
                    console.error("Error in wiki custom parser:", error);
                    return null;
                }
            },
        },
    ];

    // Helper function to apply path segment mappings (used in customParser functions)
    function applyPathSegmentMapping(pathSegment) {
        if (!pathSegment) return pathSegment;

        for (const mapping of PATH_SEGMENT_MAPPINGS) {
            if (mapping.regex.test(pathSegment)) {
                return mapping.replacement;
            }
        }

        return pathSegment; // Return original if no mapping found
    }

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
                pathSegmentMappings: PATH_SEGMENT_MAPPINGS,
                jumpButtonMappings,
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

