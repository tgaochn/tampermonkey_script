// ==UserScript==
// @name                text_color_changer
// @version             0.1.0
// @description         Change text color for specific patterns using regex on specific URLs
// @author              gtfish
// @license             MIT
// @match               http*://www.skidrowreloaded.com/*
// @match               http*://www.amazon.com/spr/returns/*
// @match               http*://www.mydrivers.com/zhuanti/tianti/*
// @grant               none
// @require             https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @updateURL           https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/changeTextColor/changeTextColor.js
// @downloadURL         https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/changeTextColor/changeTextColor.js

// ==/UserScript==
// 0.1.0: beta version, 优化脚本; 增加cpu/gpu天梯匹配
// 0.0.1: init, 匹配url/text_pattern则文本修改成对应颜色. skidrow/amazon_return

(function () {
    "use strict";

    const urlPatterns = {
        skidrow: {
            urlRegex: /^https?:\/\/www\.skidrowreloaded\.com\/.*/,
            textPatterns: [
                {
                    regex: /MEDIAFIRE/ig,
                    textColor: "rgb(0,0,0)",
                    backColor: "rgb(255,192,255)",
                },
                {
                    regex: /PIXELDRAIN/ig,
                    textColor: "rgb(0,0,255)",
                    backColor: "rgb(255,255,0)",
                },
                {
                    regex: /GOFILE/ig,
                    textColor: "rgb(0,0,255)",
                    backColor: "rgb(255,192,255)",
                },
                {
                    regex: /1FICHIER/ig,
                    textColor: "rgb(117,117,255)",
                    backColor: "rgb(255,255,0)",
                },
                {
                    regex: /USERSCLOUD/ig,
                    textColor: "rgb(0,0,0)",
                    backColor: "rgb(255,255,128)",
                }
            ],
        },
        amazon_return: {
            urlRegex: /^https?:\/\/www\.amazon\.com\/.*/,
            textPatterns: [
                {
                    regex: /UPS Dropoff — box and label needed/g,
                    textColor: "rgb(0,0,0)",
                    backColor: "rgb(255,192,255)",
                },
            ],
        },
        tianti: {
            urlRegex: /^https?:\/\/www\.mydrivers\.com\/.*/,
            textPatterns: [
                // 准备入手的
                {
                    regex: /^锐龙7 9800X3D$/g,
                    textColor: "rgb(0,0,0)",
                    backColor: "rgb(192,255,255)",
                },
                // 已有的
                {
                    regex: /^锐龙9 5900X$/g,
                    textColor: "rgb(0,0,0)",
                    backColor: "rgb(255,192,255)",
                },
                {
                    regex: /^锐龙7 5800X$/g,
                    textColor: "rgb(0,0,0)",
                    backColor: "rgb(255,192,255)",
                },
                {
                    regex: /^RTX 3080$/g,
                    textColor: "rgb(0,0,0)",
                    backColor: "rgb(255,192,255)",
                },
                {
                    regex: /^RTX 2060$/g,
                    textColor: "rgb(0,0,0)",
                    backColor: "rgb(255,192,255)",
                },
                {
                    regex: /^GTX 1070$/g,
                    textColor: "rgb(0,0,0)",
                    backColor: "rgb(255,192,255)",
                }
            ],
        },
    };

    // Helper function to check if node is already colored
    function isAlreadyColored(node) {
        return node.parentNode && 
               node.parentNode.tagName === 'SPAN' && 
               (node.parentNode.style.backgroundColor || node.parentNode.style.color);
    }

    function changeTextColor(node, currentUrlPatterns) {
        if (!currentUrlPatterns) return;

        // Skip already processed nodes
        if (node.hasAttribute && node.hasAttribute('data-colored')) return;

        if (node.nodeType === 3 && !isAlreadyColored(node)) { // Text node and not already colored
            let content = node.textContent.trim();
            if (!content) return; // Skip empty text nodes

            for (const pattern of currentUrlPatterns.textPatterns) {
                pattern.regex.lastIndex = 0;
                
                if (pattern.regex.test(content)) {
                    const span = document.createElement("span");
                    span.style.color = pattern.textColor;
                    span.style.backgroundColor = pattern.backColor;
                    span.textContent = content;
                    span.setAttribute('data-colored', 'true');
                    node.parentNode.replaceChild(span, node);
                    break;
                }
            }
        } else if (node.nodeType === 1) { // Element node
            // Skip certain elements
            const skipTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT'];
            if (skipTags.includes(node.tagName)) return;

            // Process child nodes
            Array.from(node.childNodes).forEach(child => {
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
