// ==UserScript==
// @name         model_text2link
// @version      0.2.1
// @description  Convert text patterns to clickable links using regex
// @author              gtfish
// @license             MIT
// @match        http*://idash.sandbox.indeed.net/*
// @match        http://127.0.0.1:5500/*
// @grant        none
// @require             https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @require             https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/text2url_patterns.js
// @updateURL           https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/model_text2link/model_text2link.js
// @downloadURL         https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/model_text2link/model_text2link.js
// ==/UserScript==
// 0.2.1: refactor with generic waitForResource function to reduce code duplication
// 0.2.0: add waitForPatterns function to ensure text2url_patterns is loaded before use
// 0.1.9: refactor to use shared text2url_patterns from external config
// 0.1.8: added new url pattern for butterfly
// 0.1.7: add serp models
// 0.1.6: remove the match on jira ticket
// 0.1.5: add more patterns
// 0.1.4: extract CONFIG constants for better maintainability
// 0.1.3: add more model patterns
// 0.1.2: add more model patterns
// 0.1.1: add more model patterns
// 0.1.0: use @require to load external script
// 0.0.8: remove the match on jira ticket
// 0.0.7: added jira as matched website
// 0.0.6: added more model patterns
// 0.0.5: added RJQ ticket pattern
// 0.0.4: added more models pattern
// 0.0.3: added I2A models template - elephant-multi-en-all_en-4e18057
// 0.0.2: 修改link, 添加更多的model pattern
// 0.0.1: init, 添加部分model的name pattern

(function () {
    "use strict";

    // Configuration constants
    const CONFIG = {
        UTILS_TIMEOUT: 10000,
        REQUIRED_UTILS: ["observeDOM", "debounce", "convertTextToLinks"],
        DEBOUNCE_DELAY: 300,
    };

    // Generic function to wait for a resource to load
    function waitForResource(resourceName, checkFunction, timeout = CONFIG.UTILS_TIMEOUT) {
        console.log(`Starting to wait for ${resourceName}...`);

        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            function check() {
                const result = checkFunction();

                if (result.isReady) {
                    console.log(`${resourceName} loaded successfully`);
                    resolve(result.value);
                } else if (Date.now() - startTime >= timeout) {
                    const errorMsg = result.errorMessage || `Timeout waiting for ${resourceName}`;
                    console.log(errorMsg);
                    reject(new Error(errorMsg));
                } else {
                    console.log(`${resourceName} not ready yet, checking again in 100ms`);
                    setTimeout(check, 100);
                }
            }

            check();
        });
    }

    // Wait for utils to load
    function waitForUtils(timeout = CONFIG.UTILS_TIMEOUT) {
        return waitForResource(
            "utils",
            () => {
                const requiredFunctions = CONFIG.REQUIRED_UTILS;

                if (
                    window.utils &&
                    requiredFunctions.every((func) => typeof window.utils[func] === "function")
                ) {
                    return { isReady: true, value: window.utils };
                }

                const missingFunctions = requiredFunctions.filter(
                    (func) => !window.utils || typeof window.utils[func] !== "function"
                );

                return {
                    isReady: false,
                    errorMessage: `Timeout waiting for utils. Missing functions: ${missingFunctions.join(", ")}`,
                };
            },
            timeout
        );
    }

    // Wait for text2url patterns to load
    function waitForPatterns(timeout = CONFIG.UTILS_TIMEOUT) {
        return waitForResource(
            "text2urlPatterns",
            () => {
                if (window.text2urlPatterns && Array.isArray(window.text2urlPatterns)) {
                    return {
                        isReady: true,
                        value: window.text2urlPatterns,
                    };
                }

                return {
                    isReady: false,
                    errorMessage: "Timeout waiting for text2urlPatterns",
                };
            },
            timeout
        );
    }

    async function initScript() {
        try {
            const utils = await waitForUtils();
            const text2url_patterns = await waitForPatterns();
            const observeTarget = document.body;

            const debouncedConvert = utils.debounce(() => {
                utils.convertTextToLinks(observeTarget, text2url_patterns);
            }, CONFIG.DEBOUNCE_DELAY);

            // Only need to set up the observer - it will run when DOM is ready
            utils.observeDOM(document.body, debouncedConvert);
        } catch (error) {
            console.error("Failed to initialize:", error);
        }
    }

    initScript();
})();
