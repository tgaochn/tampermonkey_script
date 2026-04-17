// ==UserScript==
// @name         Gamer520 关键词提取器
// @namespace    http://tampermonkey.net/
// @version      0.2.0
// @description  提取该网页的指定关键词
// @match        http*://*.gamer520.net/*
// @match        http*://*.game520.net/*
// @match        http*://*.gamer520.com/*
// @match        http*://*.game520.com/*
// @match        http*://*.xxxxx520.cam/*
// @match        http*://*.gamers520.com/*
// @require      https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @grant        none
// @license      GPL-3.0 License
// @updateURL       https://github.com/tgaochn/tampermonkey_script/raw/refs/heads/master/_game/Gamer520%E5%85%B3%E9%94%AE%E8%AF%8D%E6%8F%90%E5%8F%96%E5%99%A8/fetchKeywordOnGamer520.js
// @downloadURL     https://github.com/tgaochn/tampermonkey_script/raw/refs/heads/master/_game/Gamer520%E5%85%B3%E9%94%AE%E8%AF%8D%E6%8F%90%E5%8F%96%E5%99%A8/fetchKeywordOnGamer520.js
// ==/UserScript==
// 0.2.0: added collapsible/draggable button container via utils.js
// 0.1.4: add gamers520.com pattern
// 0.1.3: add game520.com pattern
// 0.1.2: add game520.net pattern
// 0.1.0: init

(async function () {
    "use strict";

    /* !! -------------------------------------------------------------------------- */
    /*                               !! Configuration                                */
    /* !! -------------------------------------------------------------------------- */

    // Configuration for different websites and their keyword patterns
    const SITE_CONFIGS = [
        {
            urlPattern: /^https?:\/\/.*game.*520\.(com|net)\/.*/,
            keywordPatterns: [
                {
                    regex: /解压密码\s*[:：]\s*([^\s\n]+)/g,
                    captureGroup: 1,
                },
            ],
            buttonText: "提取解压密码",
        },
        {
            urlPattern: /^https?:\/\/.*\.xxxxx520\.cam\/.*/,
            keywordPatterns: [
                {
                    regex: /解压密码\s*[:：]\s*([^\s\n]+)/g,
                    captureGroup: 1,
                },
            ],
            buttonText: "提取解压密码",
        },
    ];

    const CONFIG = {
        UTILS_TIMEOUT: 10000,
        CONTAINER_ID: "container_id_gamer520",
        BUTTON_POSITION: { top: "20px", left: "1000px" },
        FOLDED: false,
        DRAGGABLE: true,
        REQUIRED_UTILS: [
            "observeDOM",
            "shouldRunScript",
            "createButtonContainer",
            "createButtonFromCallback",
            "addFixedPosContainerToPage",
            "initAddBtn2AnyWebsite",
        ],
    };

    /* !! -------------------------------------------------------------------------- */
    /*                               !! Helper Functions                              */
    /* !! -------------------------------------------------------------------------- */

    // Extract matching content from page based on keyword patterns
    function extractMatchingContent(keywordPatterns) {
        if (!keywordPatterns || keywordPatterns.length === 0) {
            return [];
        }

        const matchingContents = [];

        // Extract matching content from text nodes
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            const node = walker.currentNode;
            const text = node.textContent.trim();

            keywordPatterns.forEach(({ regex, captureGroup }) => {
                regex.lastIndex = 0;
                let match;
                while ((match = regex.exec(text)) !== null) {
                    const capturedText = match[captureGroup];
                    if (capturedText) {
                        matchingContents.push(capturedText.trim());
                    }
                }
            });
        }

        // Also check in full body text
        const allText = document.body.innerText || document.body.textContent || "";
        keywordPatterns.forEach(({ regex, captureGroup }) => {
            regex.lastIndex = 0;
            let match;
            while ((match = regex.exec(allText)) !== null) {
                const capturedText = match[captureGroup];
                if (capturedText) {
                    matchingContents.push(capturedText.trim());
                }
            }
        });

        return [...new Set(matchingContents)];
    }

    // Show tip message that disappears after 3 seconds
    function showTip(message, isSuccess = true) {
        const existingTip = document.getElementById("extractContentTip");
        if (existingTip) {
            existingTip.remove();
        }

        const tip = document.createElement("div");
        tip.id = "extractContentTip";
        tip.textContent = message;
        tip.style.cssText = `
            position: fixed;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
            padding: 20px 30px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            font-family: Arial, sans-serif;
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            min-width: 200px;
            max-width: 500px;
            word-wrap: break-word;
            white-space: pre-line;
            transition: opacity 0.3s ease;
            background-color: ${isSuccess ? "#4caf50" : "#f44336"};
            color: #fff;
        `;

        document.body.appendChild(tip);

        setTimeout(() => {
            tip.style.opacity = "0";
            setTimeout(() => {
                if (tip.parentNode) {
                    tip.remove();
                }
            }, 300);
        }, 3000);
    }

    /* !! -------------------------------------------------------------------------- */
    /*                               !! Main Logic                                   */
    /* !! -------------------------------------------------------------------------- */

    // Build customButtonMappings from SITE_CONFIGS
    const customButtonMappings = SITE_CONFIGS.map((siteConfig) => ({
        pattern: siteConfig.urlPattern,
        customButtons: (url, utils) => {
            return [
                utils.createButtonFromCallback(siteConfig.buttonText, () => {
                    const matchingContents = extractMatchingContent(siteConfig.keywordPatterns);
                    if (matchingContents.length === 0) {
                        showTip("没找到", false);
                    } else {
                        const contentText = matchingContents.join(", ");
                        navigator.clipboard
                            .writeText(contentText)
                            .then(() => {
                                showTip(`已找到以下匹配内容; 内容已复制到剪切板:\n${contentText}`, true);
                            })
                            .catch((err) => {
                                console.error("Failed to copy to clipboard:", err);
                                showTip(`已找到以下匹配内容; 复制到剪切板失败:\n${contentText}`, false);
                            });
                    }
                }),
            ];
        },
    }));

    const inclusionPatterns = [];
    const exclusionPatterns = [];
    const url2title = [];

    // Wait for utils to load
    function waitForUtils(timeout = CONFIG.UTILS_TIMEOUT) {
        console.log("Starting to wait for utils...");
        const requiredFunctions = CONFIG.REQUIRED_UTILS;

        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            function checkUtils() {
                if (
                    window.utils &&
                    requiredFunctions.every((func) => typeof window.utils[func] === "function")
                ) {
                    resolve(window.utils);
                } else if (Date.now() - startTime >= timeout) {
                    const missingFunctions = requiredFunctions.filter(
                        (func) => !window.utils || typeof window.utils[func] !== "function"
                    );
                    reject(new Error(`Timeout waiting for utils. Missing functions: ${missingFunctions.join(", ")}`));
                } else {
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
                pathSegmentMappings: null,
                jumpButtonMappings: null,
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
