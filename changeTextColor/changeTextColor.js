// ==UserScript==
// @name                text_color_changer
// @version             0.1.0
// @description         Change text color for specific patterns using regex on specific URLs
// @author              gtfish
// @license             MIT
// @match               http*://www.skidrowreloaded.com/*
// @match               http*://www.amazon.com/spr/returns/*
// @grant               none
// @require             https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @updateURL           https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/changeTextColor/changeTextColor.js
// @downloadURL         https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/changeTextColor/changeTextColor.js

// ==/UserScript==
// 0.1.0: beta version, 优化脚本
// 0.0.1: init, 匹配url/text_pattern则文本修改成对应颜色. skidrow/amazon_return

(function () {
    "use strict";

    const urlPatterns = {
        skidrow: {
            urlRegex: /^https?:\/\/www\.skidrowreloaded\.com\/.*/,
            textPatterns: [
                {
                    regex: /mediafire/gi,
                    textColor: "rgb(0,0,0)",
                    backColor: "rgb(255,192,255)",
                },
                {
                    regex: /October \d{1,2}/g,
                    textColor: "rgb(0,0,0)",
                    backColor: "rgb(192,255,255)",
                },
                {
                    regex: /pixeldrain/gi,
                    textColor: "rgb(0,0,255)",
                    backColor: "rgb(255,255,0)",
                },
                {
                    regex: /gofile/gi,
                    textColor: "rgb(0,0,255)",
                    backColor: "rgb(255,192,255)",
                },
                {
                    regex: /1FICHIER/gi,
                    textColor: "rgb(117,117,255)",
                    backColor: "rgb(255,255,0)",
                },
            ],
        },
        amazon_return: {
            urlRegex: /^https?:\/\/www\.amazon\.com\/.*/,
            textPatterns: [
                {
                    regex: /UPS Dropoff — box and label needed/gi,
                    textColor: "rgb(0,0,0)",
                    backColor: "rgb(255,192,255)",
                },
            ],
        },
    };

    function changeTextColor(node, currentUrlPatterns) {
        if (!currentUrlPatterns) return;

        if (node.nodeType === 3) {
            // Text node
            let content = node.textContent;
            let changed = false;

            for (const pattern of currentUrlPatterns.textPatterns) {
                // Reset lastIndex for global regex
                pattern.regex.lastIndex = 0;

                if (pattern.regex.test(content)) {
                    const span = document.createElement("span");
                    span.style.color = pattern.textColor;
                    span.style.backgroundColor = pattern.backColor;
                    span.textContent = content;
                    node.parentNode.replaceChild(span, node);
                    changed = true;
                    break; // Stop after first match to prevent multiple replacements
                }
            }

            return changed;
        }

        if (node.nodeType === 1) {
            // Element node
            Array.from(node.childNodes).forEach((child) => {
                changeTextColor(child, currentUrlPatterns);
            });
        }
    }

    function waitForUtils(timeout = 10000) {
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
            const currentUrl = window.location.href;

            const currentUrlPatterns = Object.values(urlPatterns).find((urlPattern) =>
                urlPattern.urlRegex.test(currentUrl)
            );

            if (!currentUrlPatterns) return;

            const debouncedColorChange = utils.debounce(() => {
                changeTextColor(observeTarget, currentUrlPatterns);
            }, 300);

            utils.observeDOM(document.body, debouncedColorChange);
        } catch (error) {
            console.error("Failed to initialize:", error);
        }
    }

    initScript();
})();
