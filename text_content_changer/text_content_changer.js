// ==UserScript==
// @name                text_content_changer
// @version             0.2.4
// @description         Change text color/content for specific patterns using regex on specific URLs
// @author              gtfish
// @license             MIT
// @match               http*://teststats.sandbox.indeed.net/*
// @match               http*://proctor.sandbox.indeed.net/proctor/*
// @match               http*://butterfly.sandbox.indeed.net/*
// @match               http*://www.skidrowreloaded.com/*
// @match               http*://www.amazon.com/spr/returns/*
// @match               http*://www.mydrivers.com/zhuanti/tianti/*
// @grant               none
// @require             https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @updateURL           https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/text_content_changer/text_content_changer.js
// @downloadURL         https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/text_content_changer/text_content_changer.js

// ==/UserScript==
// 0.2.4: rename the script to text_content_changer
// 0.2.3: fix bug for text replacement
// 0.2.2: 增加 Butterfly_models 的颜色匹配
// 0.2.1: 优化代码; 增加teststats
// 0.2.0: 优化代码; 增加替换文本的功能
// 0.1.5: hotfix
// 0.1.4: 增加 PO targets 的颜色匹配
// 0.1.3: 增加更多 Butterfly proctor allocation 的颜色匹配
// 0.1.2: bug fixed
// 0.1.1: 增加 Butterfly proctor allocation 的颜色匹配
// 0.1.0: beta version, 优化脚本; 增加cpu/gpu天梯匹配
// 0.0.1: init, 匹配url/text_pattern则文本修改成对应颜色. skidrow/amazon_return

(function () {
    "use strict";

    const workTextReplacement = [
        {
            regex: /^((idxbutterflyapplymodeltst)|(isbutterflyapplymodeltst)\d*)$/,
            replacement: "$1 (AsPerSeen)",
        },
        {
            regex: /^((idxsjbutterflyctrmodeltst)|(isbutterflyctrmodeltst)\d*)$/,
            replacement: "$1 (CTR)",
        },
        {
            regex: /^((idxsjbutterflyapplycompletemodeltst)|(issjbutterflyapplycompletemodeltst)\d*)$/,
            replacement: "$1 (AcPerClick)",
        },
        {
            regex: /^((idxsjbutterflyapplyperclickedmodeltst)|(issjbutterflyapplyperclickedmodeltst)\d*)$/,
            replacement: "$1 (AsPerClick)",
        },
        {
            regex: /^((idxorgbutterflyqualifiedmodeltst)|(isorgbutterflyqualifiedmodeltst)\d*)$/,
            replacement: "$1 (PoPerApply, Attainability)",
        },
        {
            regex: /^((idxbutterflyqualifiedmodeltst)|(isbpbutterflyqualifiedmodeltst)\d*)$/,
            replacement: "$1 (PoPerHasOutcome, eQualified)",
        },
    ];

    const urlPatterns = {
        testStats: {
            // https://teststats.sandbox.indeed.net/analyze/idxsjbutterflyctrmodeltst?from=proctor_tst_view
            urlRegex: /^https?:\/\/teststats\.sandbox\.indeed\.net\/analyze\/.*/,
            textPatterns: [
                ...workTextReplacement,
            ],
        },

        proctor_general: {
            // https://proctor.sandbox.indeed.net/proctor/toggles/view/isbutterflyapplymodeltst
            urlRegex: /^https?:\/\/proctor\.sandbox\.indeed\.net\/proctor\/toggles\/view\/.*/,
            textPatterns: [
                ...workTextReplacement,
            ],
        },

        Butterfly_models: {
            // https://butterfly.sandbox.indeed.net/#/model/preapply_rj_hp_us_9c2a248/PUBLISHED/overview/
            urlRegex: /^https:\/\/butterfly\.sandbox\.indeed\.net\/#\/model\/.*/,
            textPatterns: [
                ...workTextReplacement,
            ],
        },

        Butterfly_proctor: {
            // https://butterfly.sandbox.indeed.net/#/proctor/jobsearch/isbutterflyapplymodeltst
            urlRegex: /^https:\/\/butterfly\.sandbox\.indeed\.net\/#\/proctor\/jobsearch\/.*/,
            textPatterns: [
                ...workTextReplacement,

                // ! Group 1 - ranking targets
                {
                    regex: /^IDX P\(AS \| seen\)$/,
                    textColor: "rgb(0,0,128)",  // Dark blue
                    backColor: "rgb(255,192,255)",
                },
                {
                    regex: /^IDX Spon P\(click \| seen\)$/,
                    textColor: "rgb(0,0,128)",  // Dark blue
                    backColor: "rgb(255,192,255)",
                },
                {
                    regex: /^Online Ranker Apply Model$/,
                    textColor: "rgb(153,0,0)",  // Dark red
                    backColor: "rgb(255,192,255)",
                },
                {
                    regex: /^Online Ranker CTR Model$/,
                    textColor: "rgb(153,0,0)",  // Dark red
                    backColor: "rgb(255,192,255)",
                },

                // ! Group 2 - bidding targets
                {
                    regex: /^IDX Spon P\(AC \| clicked\)$/,
                    textColor: "rgb(0,0,128)",  // Dark blue
                    backColor: "rgb(144,238,144)",
                },
                {
                    regex: /^IDX Spon P\(AS \| clicked\)$/,
                    textColor: "rgb(0,0,128)",  // Dark blue
                    backColor: "rgb(144,238,144)",
                },
                {
                    regex: /^Online Ranker Spon P\(AC \| clicked\)$/,
                    textColor: "rgb(153,0,0)",  // Dark red
                    backColor: "rgb(144,238,144)",
                },
                {
                    regex: /^Online Ranker Spon P\(AS \| Clicked\)$/,
                    textColor: "rgb(153,0,0)",  // Dark red
                    backColor: "rgb(144,238,144)",
                },

                // ! Group 3 - PO targets
                {
                    regex: /^IDX Org Attainability$/,
                    textColor: "rgb(0,0,128)",  // Dark blue
                    backColor: "rgb(255, 243, 205)",
                },
                // {
                //     regex: /^IDX Spon P\(AS \| clicked\)$/,
                //     textColor: "rgb(0,0,128)",  // Dark blue
                //     backColor: "rgb(255, 243, 205)",
                // },
                {
                    regex: /^Online Ranker Org Attainability$/,
                    textColor: "rgb(153,0,0)",  // Dark red
                    backColor: "rgb(255, 243, 205)",
                },
                {
                    regex: /^Online Ranker Qualified New \(BP\)$/,
                    textColor: "rgb(153,0,0)",  // Dark red
                    backColor: "rgb(255, 243, 205)",
                },

                // !! allocation color
                // HP US
                {
                    regex: /^((RJP HP)|(HP)|(RJP)) US w\/\s*IS$/,
                    textColor: "rgb(0,0,0)",
                    backColor: "rgb(255,228,181)",
                },
                {
                    regex: /^((RJP HP)|(HP)|(RJP)) US w\/\s*IS Shadow Traffic$/,
                    textColor: "rgb(0,0,0)",
                    backColor: "rgb(255,225,225)",
                },

                // HP ROW
                {
                    regex: /^((RJP HP)|(HP)|(RJP)) (ROW)|(ROTW) w\/\s*IS$/,
                    textColor: "rgb(0,0,0)",
                    backColor: "rgb(255,218,171)",
                },
                {
                    regex: /^((RJP HP)|(HP)|(RJP)) (ROW)|(ROTW) w\/\s*IS Shadow Traffic$/,
                    textColor: "rgb(0,0,0)",
                    backColor: "rgb(255,225,225)",
                },

                // HP JP
                {
                    regex: /^((RJP HP)|(HP)|(RJP)) JP w\/\s*IS$/,
                    textColor: "rgb(0,0,0)",
                    backColor: "rgb(255,208,161)",
                },
                {
                    regex: /^((RJP HP)|(HP)|(RJP)) JP w\/\s*IS Shadow Traffic$/,
                    textColor: "rgb(0,0,0)",
                    backColor: "rgb(255,225,225)",
                },

                // SERP US
                {
                    regex: /^SERP US w\/\s*IS$/,
                    textColor: "rgb(0,0,0)",
                    backColor: "rgb(255,182,193)",
                },
                {
                    regex: /^SERP US w\/\s*IS Shadow Traffic$/,
                    textColor: "rgb(0,0,0)",
                    backColor: "rgb(255,225,225)",
                },

                // SERP ROW
                {
                    regex: /^SERP (ROW)|(ROTW) w\/\s*IS$/,
                    textColor: "rgb(0,0,0)",
                    backColor: "rgb(255,172,183)",
                },
                {
                    regex: /^SERP (ROW)|(ROTW) w\/\s*IS Shadow Traffic$/,
                    textColor: "rgb(0,0,0)",
                    backColor: "rgb(255,225,225)",
                },

                // SERP JP
                {
                    regex: /^SERP JP w\/\s*IS$/,
                    textColor: "rgb(0,0,0)",
                    backColor: "rgb(255,162,173)",
                },
                {
                    regex: /^SERP JP w\/\s*IS Shadow Traffic$/,
                    textColor: "rgb(0,0,0)",
                    backColor: "rgb(255,225,225)",
                },
            ],
        },
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
                    // 是否需要替换或者着色
                    const needsReplacement = !!pattern.replacement;
                    const needsColoring = !!pattern.textColor || !!pattern.backColor;

                    if (needsReplacement || needsColoring) {
                        // 创建一个span元素进行替换或者着色
                        const span = document.createElement("span");

                        // 如果有颜色设置，应用颜色
                        if (pattern.textColor) {
                            span.style.color = pattern.textColor;
                        }

                        if (pattern.backColor) {
                            span.style.backgroundColor = pattern.backColor;
                        }

                        // 设置内容，如果有替换文本则使用替换文本
                        if (pattern.replacement) {
                            // 使用正则表达式的replace方法处理捕获组引用
                            span.textContent = content.replace(pattern.regex, pattern.replacement);
                        } else {
                            span.textContent = content;
                        }
                        span.setAttribute('data-colored', 'true');
                        node.parentNode.replaceChild(span, node);
                    }
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