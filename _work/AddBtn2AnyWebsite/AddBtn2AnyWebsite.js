// ==UserScript==
// @name         AddBtn2AnyWebsite
// @namespace    AddBtn2AnyWebsite
// @version      0.3.1
// @description  任意网站加入相关链接 (merged with wiki_btn functionality)
// @author       gtfish
// @match        https://teststats.sandbox.indeed.net/*
// @match        https://butterfly.sandbox.indeed.net/*
// @match        https://proctor.sandbox.indeed.net/*
// @match        https://proctor-v2.sandbox.indeed.net/*
// @match        https://code.corp.indeed.com/*
// @match        https://app.datadoghq.com/*
// @match        https://indeed.atlassian.net/wiki/*
// @require      https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @updateURL    https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/AddBtn2AnyWebsite/AddBtn2AnyWebsite.js
// @downloadURL  https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/AddBtn2AnyWebsite/AddBtn2AnyWebsite.js

// ==/UserScript== 
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
    'use strict';

    // Configuration constants
    const CONFIG = {
        UTILS_TIMEOUT: 10000,
        CONTAINER_ID: "container_id",
        BUTTON_POSITION: { top: "-10px", left: "1200px" },
        REQUIRED_UTILS: ["observeDOM", "shouldRunScript", "createButtonContainer", "createButtonCopyText", 
                        "createTextNode", "createButtonCopyHypertext", "findBestMatch", "addFixedPosContainerToPage"],
        DEFAULT_TITLE: "link",
        MAX_DISPLAY_LENGTH: 25, // Maximum length for button display text
        // MAX_DISPLAY_LENGTH: 10, // Maximum length for button display text
        WIKI_SELECTORS: {
            PAGE_TITLE: '[data-testid="title-text"] > span',
            CREATE_BTN: '[data-testid="app-navigation-create"]',
        }
    };

    // Path segment mapping rules
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

    const inclusionPatterns = [
    ];
    
    // https://indeed.atlassian.net/browse 
    const exclusionPatterns = [
        /^https:\/\/butterfly\.sandbox\.indeed\.net\/#\/model.*$/,
        /^https:\/\/indeed\.atlassian\.net\/browse.*$/,
    ];

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
            const pathSegments = urlObj.pathname.split('/').filter(segment => segment.length > 0);
            const lastSegment = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : null;
            return applyPathSegmentMapping(lastSegment);
        } catch (error) {
            console.error('Error parsing URL:', error);
            return null;
        }
    }

    // Function to generate dynamic title based on URL
    function generateDynamicTitle(url, baseTitle, customParser = null) {
        if (customParser && typeof customParser === 'function') {
            const customResult = customParser(url);
            return customResult ? `${customResult}` : baseTitle;
        }
        
        const pathSegment = extractPathSegment(url);
        return pathSegment ? `${pathSegment}` : baseTitle;
    }



    const url2title = [
        // static title
        { pattern: /^https:\/\/code\.corp\.indeed\.com.*$/, title: 'code' },
        { pattern: /^https:\/\/app\.datadoghq\.com.*$/, title: 'datadog' },
        
        // dynamic title with both fixed and dynamic options
        { 
            pattern: /^https:\/\/butterfly\.sandbox\.indeed\.net\/#\/proctor.*$/, 
            title: 'Butterfly traffic',
            dynamicTitle: true, // Enable dynamic title generation for this pattern
            showBothTitles: true, // Show both fixed and dynamic title buttons
            customParser: (url) => {
                // Extract model name from butterfly proctor URL
                try {
                    // For URLs like: #/proctor/jobsearch/idxbutterflyapplymodeltst?q=...
                    const hashPart = url.split('#')[1] || '';
                    const pathSegments = hashPart.split('/').filter(segment => segment.length > 0);
                    
                    // Look for the segment after 'proctor' and 'jobsearch'
                    const proctorIndex = pathSegments.indexOf('proctor');
                    if (proctorIndex >= 0 && proctorIndex + 2 < pathSegments.length) {
                        const modelSegment = pathSegments[proctorIndex + 2].split('?')[0]; // Remove query params
                        return applyPathSegmentMapping(modelSegment);
                    }
                    
                    return null;
                } catch (error) {
                    console.error('Error in butterfly proctor custom parser:', error);
                    return null;
                }
            }
        },
        { 
            pattern: /^https:\/\/butterfly\.sandbox\.indeed\.net\/#\/ruleSet.*$/, 
            title: 'RuleSet',
            dynamicTitle: true, // Enable dynamic title generation for this pattern
            showBothTitles: true, // Show both fixed and dynamic title buttons
            customParser: (url) => {
                // Extract rule name from butterfly ruleSet URL
                try {
                    // For URLs like: #/ruleSet/MODEL_CONFIG/JSS_RELEVANT_JOBS/
                    const hashPart = url.split('#')[1] || '';
                    const pathSegments = hashPart.split('/').filter(segment => segment.length > 0);
                    
                    // Look for the segment after 'ruleSet' and 'MODEL_CONFIG'
                    const ruleSetIndex = pathSegments.indexOf('ruleSet');
                    if (ruleSetIndex >= 0 && ruleSetIndex + 2 < pathSegments.length) {
                        const ruleSegment = pathSegments[ruleSetIndex + 2].split('?')[0]; // Remove query params
                        return ruleSegment; // Don't apply mapping for rule names, return as-is
                    }
                    
                    return null;
                } catch (error) {
                    console.error('Error in butterfly ruleSet custom parser:', error);
                    return null;
                }
            }
        },
        { 
            pattern: /^https:\/\/teststats\.sandbox\.indeed\.net.*$/, 
            title: 'testStats',
            dynamicTitle: true, // Enable dynamic title generation for this pattern
            showBothTitles: true, // Show both fixed and dynamic title buttons
            customParser: (url) => {
                // Extract model name from teststats URL
                try {
                    const urlObj = new URL(url);
                    const pathSegments = urlObj.pathname.split('/').filter(segment => segment.length > 0);
                    const lastSegment = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : null;
                    return applyPathSegmentMapping(lastSegment);
                } catch (error) {
                    console.error('Error in teststats custom parser:', error);
                    return null;
                }
            }
        },
        { 
            pattern: /^https:\/\/proctor(-v2)?\.sandbox\.indeed\.net.*$/, 
            title: 'proctor',
            dynamicTitle: true, // Enable dynamic title generation for this pattern
            showBothTitles: true, // Show both fixed and dynamic title buttons
            textColor: '#FFFFFF', // white color for proctor
            customParser: (url) => {
                // Extract model name from proctor URL
                try {
                    const urlObj = new URL(url);
                    const pathSegments = urlObj.pathname.split('/').filter(segment => segment.length > 0);
                    const lastSegment = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : null;
                    return applyPathSegmentMapping(lastSegment);
                } catch (error) {
                    console.error('Error in proctor custom parser:', error);
                    return null;
                }
            }
        },
        { 
            pattern: /^https:\/\/indeed\.atlassian\.net\/wiki.*$/, 
            title: 'wiki',
            dynamicTitle: true, // Enable dynamic title generation for this pattern
            showBothTitles: true, // Show both fixed and dynamic title buttons
            buttonPosition: { top: "20px", left: "750px" }, // Custom position to avoid blocking content
            customParser: (url) => {
                // Extract page title from wiki page DOM
                try {
                    const pageTitleElement = document.querySelector(CONFIG.WIKI_SELECTORS.PAGE_TITLE);
                    return pageTitleElement ? pageTitleElement.firstChild.textContent.trim() : null;
                } catch (error) {
                    console.error('Error in wiki custom parser:', error);
                    return null;
                }
            }
        },
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
        const curURL = window.location.href;
        const btnContainer = utils.createButtonContainer();
        const btnSubContainer1 = utils.createButtonContainer();

        btnContainer.id = CONFIG.CONTAINER_ID;
        btnContainer.appendChild(btnSubContainer1);
        btnContainer.style.display = 'flex';
        btnContainer.style.flexDirection = 'column'; // contrainer 上下排列

        // Get matched URL config and generate titles
        let pageTitle = CONFIG.DEFAULT_TITLE;
        let fixedTitle = CONFIG.DEFAULT_TITLE;
        let dynamicTitle = CONFIG.DEFAULT_TITLE;
        const matchedConfig = url2title.find(config => config.pattern.test(curURL));
        
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

        // Create button elements
        const buttonElements = [
            // 按钮: copy url
            utils.createButtonCopyText('url', curURL),
        ];

        // Get text color for this URL
        const textColor = matchedConfig && matchedConfig.textColor ? matchedConfig.textColor : null;

        // Check if dynamic title is too long for display (but keep full title for copying)
        const dynamicDisplayTitle = dynamicTitle && (dynamicTitle.length < CONFIG.MAX_DISPLAY_LENGTH) ? dynamicTitle : "{title}";

        // Add title-based buttons
        if (matchedConfig && matchedConfig.showBothTitles) {
            // Show both fixed and dynamic title buttons
            buttonElements.push(
                // Fixed title buttons
                utils.createTextNode('\thref: ', textColor),
                utils.createButtonCopyHypertext(`${fixedTitle}`, fixedTitle, curURL),
                utils.createButtonCopyHypertext(`${dynamicDisplayTitle}`, dynamicTitle, curURL),
                
                // Dynamic title buttons
                utils.createTextNode('\tmd: ', textColor),
                utils.createButtonCopyText(`[${fixedTitle}](url)`, `[${fixedTitle}](${curURL})`),
                utils.createButtonCopyText(`[${dynamicDisplayTitle}](url)`, `[${dynamicTitle}](${curURL})`)
            );
        } else {
            // Show single set of buttons with the determined title
            buttonElements.push(
                utils.createTextNode('\thref: ', textColor),
                utils.createButtonCopyHypertext(`${pageTitle}`, pageTitle, curURL),
                utils.createTextNode('\tmd: ', textColor),
                utils.createButtonCopyText(`[${pageTitle}](url)`, `[${pageTitle}](${curURL})`)
            );
        }

        // ! add buttons in the containers
        btnSubContainer1.append(...buttonElements);

        // Use custom position if specified, otherwise use default position
        const buttonPosition = (matchedConfig && matchedConfig.buttonPosition) 
            ? matchedConfig.buttonPosition 
            : CONFIG.BUTTON_POSITION;
        utils.addFixedPosContainerToPage(btnContainer, buttonPosition);
    }

    initScript();
})();
