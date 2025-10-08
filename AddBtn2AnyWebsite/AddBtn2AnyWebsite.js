// ==UserScript==
// @name         AddBtn2AnyWebsite
// @namespace    AddBtn2AnyWebsite
// @version      0.4.6
// @description  任意网站加入相关链接 (merged with wiki_btn functionality)
// @author       gtfish
// @match        https://teststats.sandbox.indeed.net/*
// @match        https://butterfly.sandbox.indeed.net/*
// @match        https://proctor.sandbox.indeed.net/*
// @match        https://proctor-v2.sandbox.indeed.net/*
// @match        https://code.corp.indeed.com/*
// @match        https://app.datadoghq.com/*
// @match        https://indeed.atlassian.net/wiki/*
// @match        https://app.monarchmoney.com/*
// @match        https://allocommunications.smarthub.coop/*
// @require      https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @updateURL    https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/AddBtn2AnyWebsite/AddBtn2AnyWebsite.js
// @downloadURL  https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/AddBtn2AnyWebsite/AddBtn2AnyWebsite.js

// ==/UserScript==
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
        CONTAINER_ID: "container_id",
        BUTTON_POSITION: { top: "-10px", left: "1200px" },
        REQUIRED_UTILS: [
            "observeDOM",
            "shouldRunScript",
            "createButtonContainer",
            "createButtonCopyText",
            "createTextNode",
            "createButtonCopyHypertext",
            "findBestMatch",
            "addFixedPosContainerToPage",
        ],
        DEFAULT_TITLE: "link",
        MAX_DISPLAY_LENGTH: 25, // Maximum length for button display text
        // MAX_DISPLAY_LENGTH: 10, // Maximum length for button display text
        WIKI_SELECTORS: {
            PAGE_TITLE: '[data-testid="title-text"] > span',
            CREATE_BTN: '[data-testid="app-navigation-create"]',
        },
    };

    // !! custom button config for specific URL patterns
    // When a URL matches a pattern here, these custom buttons will be used instead of the default ones
    const customButtonMappings = [
        // ! allocommunications: 网费报销
        {
            pattern: /^https:\/\/allocommunications\.smarthub\.coop\/.*$/,
            buttonPosition: { top: "-10px", left: "1000px" }, // Custom position
            customButtons: (url, utils) => {
                return [utils.createButtonOpenUrl("US Bank", "https://www.usbank.com/index.html")];
            },
        },

        // ! monarchmoney: 资产管理
        {
            pattern: /^https:\/\/app\.monarchmoney\.com\/.*$/,
            buttonPosition: { top: "-10px", left: "1000px" }, // Custom position
            customButtons: (url, utils) => {
                return [
                    utils.createButtonOpenUrl("BOA", "https://www.bankofamerica.com"),
                    utils.createButtonOpenUrl("Chase", "https://www.chase.com"),
                    utils.createButtonOpenUrl("Bilt(Wells Fargo)", "https://www.wellsfargo.com"),
                    utils.createButtonOpenUrl("Fidelity", "https://digital.fidelity.com/prgw/digital/login/full-page"),
                    utils.createButtonOpenUrl("Merrill Lynch", "https://www.ml.com"),
                ];
            },
        },

        // ! indeed wiki
        {
            pattern: /^https:\/\/indeed\.atlassian\.net\/wiki.*$/,
            buttonPosition: { top: "20px", left: "750px" }, // Custom position to avoid blocking content
            customButtons: (url, utils) => {
                // Get the matched config for wiki to reuse default logic
                const matchedConfig = url2title.find((config) => config.pattern.test(url));

                // Create default buttons first
                const defaultButtons = createDefaultButtons(url, utils, matchedConfig);

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

                        defaultButtons.push(
                            utils.createButtonCopyText(`[${displayTitle}](url)`, `[${formattedTitle}](${url})`)
                        );
                    }
                } catch (error) {
                    console.error("Error adding formatted wiki title button:", error);
                }

                return defaultButtons;
            },
        },
    ];

    // !! Jump button mappings for specific URL patterns
    // When a URL matches a pattern here, these jump buttons will be added to the default buttons
    const jumpButtonMappings = [
        // ! indeed websites: 跳转到相关indeed页面
        {
            pattern: /^https:\/\/((proctor)|(teststats))\.sandbox\.indeed\.net.*$/,
            jumpButtons: (url, utils, textColor, dynamicTitle) => {
                return [
                    utils.createButtonOpenUrl(
                        "Butterfly Proctor",
                        `https://butterfly.sandbox.indeed.net/proctor/jobsearch/${dynamicTitle}`
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
        // static title
        { pattern: /^https:\/\/code\.corp\.indeed\.com.*$/, title: "code" },
        { pattern: /^https:\/\/app\.datadoghq\.com.*$/, title: "datadog" },

        // dynamic title with both fixed and dynamic options

        // ! butterfly proctor
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

        // ! ruleSet
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

        // ! testStats
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

        // ! proctor
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

        // ! wiki
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

    // Helper function to create default button set for a given URL and config
    function createDefaultButtons(url, utils, matchedConfig) {
        const buttonElements = [
            // 按钮: copy url
            utils.createButtonCopyText("url", url),
        ];

        if (!matchedConfig) {
            return buttonElements;
        }

        let pageTitle = CONFIG.DEFAULT_TITLE;
        let fixedTitle = matchedConfig.title || CONFIG.DEFAULT_TITLE;
        let dynamicTitle = CONFIG.DEFAULT_TITLE;
        let rawSegment = null; // Store the original segment for jump buttons

        if (matchedConfig.dynamicTitle) {
            // Get the full result from custom parser or default logic
            let fullResult = null;
            if (matchedConfig.customParser && typeof matchedConfig.customParser === "function") {
                fullResult = matchedConfig.customParser(url);
            }

            if (fullResult && typeof fullResult === "object" && fullResult.displayTitle) {
                // New format: { displayTitle, rawSegment }
                dynamicTitle = fullResult.displayTitle;
                rawSegment = fullResult.rawSegment;
            } else {
                // Fall back to generateDynamicTitle for string results or default logic
                dynamicTitle = generateDynamicTitle(url, matchedConfig.title, matchedConfig.customParser);
            }
            pageTitle = dynamicTitle; // Default to dynamic title
        } else {
            pageTitle = fixedTitle;
            dynamicTitle = fixedTitle; // Fallback to fixed title
        }

        // Get text color for this URL
        const textColor = matchedConfig.textColor || null;

        // Check if dynamic title is too long for display (but keep full title for copying)
        const dynamicDisplayTitle =
            dynamicTitle && dynamicTitle.length <= CONFIG.MAX_DISPLAY_LENGTH ? dynamicTitle : "{title}";

        // ! Add title-based buttons
        if (matchedConfig.showBothTitles) {
            // Show both fixed and dynamic title buttons
            buttonElements.push(
                // Fixed title buttons
                utils.createTextNode("\thref: ", textColor),
                utils.createButtonCopyHypertext(`${fixedTitle}`, fixedTitle, url),
                utils.createButtonCopyHypertext(`${dynamicDisplayTitle}`, dynamicTitle, url),

                // Dynamic title buttons
                utils.createTextNode("\tmd: ", textColor),
                utils.createButtonCopyText(`[${fixedTitle}](url)`, `[${fixedTitle}](${url})`),
                utils.createButtonCopyText(`[${dynamicDisplayTitle}](url)`, `[${dynamicTitle}](${url})`)
            );
        } else {
            // Show single set of buttons with the determined title
            buttonElements.push(
                utils.createTextNode("\thref: ", textColor),
                utils.createButtonCopyHypertext(`${pageTitle}`, pageTitle, url),
                utils.createTextNode("\tmd: ", textColor),
                utils.createButtonCopyText(`[${pageTitle}](url)`, `[${pageTitle}](${url})`)
            );
        }

        // ! add jump button
        const jumpButtons = [utils.createTextNode("\tjump: ", textColor)];

        // Check for jump button mapping and add corresponding buttons
        const jumpMapping = jumpButtonMappings.find((mapping) => mapping.pattern.test(url));
        if (jumpMapping) {
            // Use rawSegment if available, otherwise fall back to dynamicTitle
            const segmentForJump = rawSegment || dynamicTitle;
            const additionalJumpButtons = jumpMapping.jumpButtons(url, utils, textColor, segmentForJump);
            jumpButtons.push(...additionalJumpButtons);
        }

        // Add jump buttons to the main button elements if any jump buttons exist
        if (jumpButtons.length > 1) {
            // More than just the text node
            buttonElements.push(...jumpButtons);
        }

        return buttonElements;
    }

    // Function to apply path segment mappings
    function applyPathSegmentMapping(pathSegment) {
        if (!pathSegment) return pathSegment;

        for (const mapping of PATH_SEGMENT_MAPPINGS) {
            if (mapping.regex.test(pathSegment)) {
                return mapping.replacement;
            }
        }

        return pathSegment; // Return original if no mapping found
    }

    // Function to extract path segment from URL (last segment before query params)
    function extractPathSegment(url) {
        try {
            const urlObj = new URL(url);
            const pathSegments = urlObj.pathname.split("/").filter((segment) => segment.length > 0);
            const lastSegment = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : null;
            return applyPathSegmentMapping(lastSegment);
        } catch (error) {
            console.error("Error parsing URL:", error);
            return null;
        }
    }

    // Function to generate dynamic title based on URL
    function generateDynamicTitle(url, baseTitle, customParser = null) {
        if (customParser && typeof customParser === "function") {
            const customResult = customParser(url);
            if (customResult) {
                // Handle both string and object returns from custom parsers
                if (typeof customResult === "object" && customResult.displayTitle) {
                    return customResult.displayTitle;
                } else if (typeof customResult === "string") {
                    return customResult;
                } else {
                    return `${customResult}`;
                }
            }
            return baseTitle;
        }

        const pathSegment = extractPathSegment(url);
        return pathSegment ? `${pathSegment}` : baseTitle;
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
            console.error("Failed to initialize:", error);
        }
    }

    async function main(utils) {
        const curURL = window.location.href;
        const btnContainer = utils.createButtonContainer();
        const btnSubContainer1 = utils.createButtonContainer();

        btnContainer.id = CONFIG.CONTAINER_ID;
        btnContainer.appendChild(btnSubContainer1);
        btnContainer.style.display = "flex";
        btnContainer.style.flexDirection = "column"; // contrainer 上下排列

        // Check for custom button mapping first
        const customMapping = customButtonMappings.find((mapping) => mapping.pattern.test(curURL));

        let buttonElements = [];
        let buttonPosition = CONFIG.BUTTON_POSITION;

        if (customMapping) {
            // Use custom buttons for this URL pattern
            console.log("Using custom button mapping for URL:", curURL);
            buttonElements = customMapping.customButtons(curURL, utils);
            buttonPosition = customMapping.buttonPosition || CONFIG.BUTTON_POSITION;
        } else {
            // Use default button logic
            console.log("Using default button logic for URL:", curURL);

            // Get matched URL config and generate titles
            let pageTitle = CONFIG.DEFAULT_TITLE;
            let fixedTitle = CONFIG.DEFAULT_TITLE;
            let dynamicTitle = CONFIG.DEFAULT_TITLE;
            const matchedConfig = url2title.find((config) => config.pattern.test(curURL));

            if (matchedConfig) {
                fixedTitle = matchedConfig.title;

                if (matchedConfig.dynamicTitle) {
                    dynamicTitle = generateDynamicTitle(curURL, matchedConfig.title, matchedConfig.customParser);
                    pageTitle = dynamicTitle; // Default to dynamic title
                } else {
                    pageTitle = fixedTitle;
                    dynamicTitle = fixedTitle; // Fallback to fixed title
                }
            }

            // Create default button elements
            buttonElements = createDefaultButtons(curURL, utils, matchedConfig);

            // Use custom position if specified in matchedConfig, otherwise use default position
            buttonPosition =
                matchedConfig && matchedConfig.buttonPosition ? matchedConfig.buttonPosition : CONFIG.BUTTON_POSITION;
        }

        // ! add buttons in the containers
        btnSubContainer1.append(...buttonElements);

        // Apply the determined button position
        utils.addFixedPosContainerToPage(btnContainer, buttonPosition);
    }

    initScript();
})();
