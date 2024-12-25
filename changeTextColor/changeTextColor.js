// ==UserScript==
// @name                text_color_changer
// @version             0.0.1
// @description         Change text color for specific patterns using regex on specific URLs
// @author              gtfish
// @license             MIT
// @match               http*://www.skidrowreloaded.com/*
// @grant               none
// @require             https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @updateURL           https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/changeTextColor/changeTextColor.js
// @downloadURL         https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/changeTextColor/changeTextColor.js

// ==/UserScript==
// 0.0.1: init, 匹配url/text_pattern则文本修改成对应颜色. skidrowreloaded

(function () {
    "use strict";

    // Define patterns with their corresponding URLs, regex patterns, and colors
    const patterns = [
        {
            urlPattern: /^https?:\/\/www\.skidrowreloaded\.com\/.*/, 
            regex: /MEDIAFIRE/g,
            color: "#FF0000",
        },
    ];

    function changeTextColor(node, patterns) {
        const currentUrl = window.location.href;

        const applicablePatterns = patterns.filter((pattern) => {
            const matches = pattern.urlPattern.test(currentUrl);
            return matches;
        });

        if (applicablePatterns.length === 0) {
            return;
        }

        if (node.nodeType === 3) { // Text node
            let content = node.textContent;

            applicablePatterns.forEach((pattern) => {
                // Reset lastIndex for global regex
                pattern.regex.lastIndex = 0;
                
                const matches = pattern.regex.test(content);

                if (matches) {
                    const span = document.createElement("span");
                    span.style.color = pattern.color;
                    span.textContent = content;
                    node.parentNode.replaceChild(span, node);
                }
            });
        }

        if (node.nodeType === 1) { // Element node
            Array.from(node.childNodes).forEach((child) => {
                changeTextColor(child, applicablePatterns);
            });
        }
    }

    function waitForUtils(timeout = 10000) {
        console.log("Starting to wait for utils...");
        const requiredFunctions = ["observeDOM"];

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

    async function initScript() {
        try {
            const utils = await waitForUtils();
            const observeTarget = document.body;

            const debouncedColorChange = utils.debounce(() => {
                changeTextColor(observeTarget, patterns);
            }, 300);

            utils.observeDOM(document.body, debouncedColorChange);
        } catch (error) {
            console.error("Failed to initialize:", error);
        }
    }

    initScript();
})();
