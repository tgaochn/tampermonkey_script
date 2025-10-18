// ==UserScript==
// @name                text_content_changer_work
// @version             1.0.1
// @description         Change text color/content for specific patterns using regex on work-related URLs
// @author              gtfish
// @license             MIT
// @match               https://teststats.sandbox.indeed.net/*
// @match               https://proctor.sandbox.indeed.net/proctor/*
// @match               https://butterfly.sandbox.indeed.net/*
// @grant               none
// @require             https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @updateURL           https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/text_content_changer_work.js
// @downloadURL         https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/text_content_changer_work.js

// ==/UserScript==
// 1.0.1: 优化代码, 增加注释
// 1.0.0: init, split from text_content_changer.js
// 0.3.2: remove JP models mach
// 0.3.1: added new url pattern for butterfly
// 0.3.0: add timezone conversion
// 0.2.5: add USBankCashPlus
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

    // ! 文本替换
    // 添加proctor描述
    const proctorDesc = [
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

    // ! 转换显示的时区, 从UTC+00:00转换到本地时区
    const convertTimezone = [
        {
            regex: /(.*?)(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \(UTC\+00:00\)(.*)/g,
            replacement: function (match, prefix, dateTimeStr, suffix) {
                try {
                    // Parse the UTC datetime
                    const utcDate = new Date(dateTimeStr + "Z"); // Add 'Z' to indicate UTC

                    // Convert to Central Time (Lincoln, NE)
                    const centralTime = new Intl.DateTimeFormat("en-US", {
                        timeZone: "America/Chicago",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false,
                    }).format(utcDate);

                    // Get timezone abbreviation (CST/CDT)
                    const timeZoneAbbr = new Intl.DateTimeFormat("en-US", {
                        timeZone: "America/Chicago",
                        timeZoneName: "short",
                    })
                        .formatToParts(utcDate)
                        .find((part) => part.type === "timeZoneName").value;

                    // Format the date to match original format
                    const formattedDate = centralTime.replace(
                        /(\d{2})\/(\d{2})\/(\d{4}), (\d{2}:\d{2}:\d{2})/,
                        "$3-$1-$2 $4"
                    );

                    // Return structured object with multiple parts
                    return {
                        isMultiPart: true,
                        parts: [
                            {
                                text: prefix + dateTimeStr + " (UTC+00:00) ",
                                // No styling for original text (keeps default)
                            },
                            {
                                text: formattedDate + " (" + timeZoneAbbr + ")",
                                textColor: "rgb(0,0,0)",
                                backColor: "rgb(255,255,0)",
                            },
                            {
                                text: suffix,
                                // No styling for suffix content (keeps default)
                            },
                        ],
                    };
                } catch (error) {
                    console.error("Error converting timezone:", error);
                    return match; // Return original if conversion fails
                }
            },
        },
    ];

    // !! 匹配url后修改文本颜色/内容
    const urlPatterns = {
        testStats: {
            // https://teststats.sandbox.indeed.net/analyze/idxsjbutterflyctrmodeltst?from=proctor_tst_view
            urlRegex: /^https?:\/\/teststats\.sandbox\.indeed\.net\/analyze\/.*/,
            textPatterns: [...proctorDesc],
        },

        proctor_general: {
            // https://proctor.sandbox.indeed.net/proctor/toggles/view/isbutterflyapplymodeltst
            urlRegex: /^https?:\/\/proctor\.sandbox\.indeed\.net\/proctor\/toggles\/view\/.*/,
            textPatterns: [...proctorDesc, ...convertTimezone],
        },

        Butterfly_models: {
            // https://butterfly.sandbox.indeed.net/model/preapply_rj_hp_us_9c2a248/PUBLISHED/overview/ // old url
            // https://butterfly.sandbox.indeed.net/model/preapply_rj_hp_us_9c2a248/PUBLISHED/overview/ // new url
            urlRegex: /^https:\/\/butterfly\.sandbox\.indeed\.net\/(#\/)?model\/.*/,
            textPatterns: [...proctorDesc],
        },

        Butterfly_proctor: {
            // https://butterfly.sandbox.indeed.net/proctor/jobsearch/isbutterflyapplymodeltst // old url
            // https://butterfly.sandbox.indeed.net/proctor/jobsearch/isbutterflyapplymodeltst // new url
            urlRegex: /^https:\/\/butterfly\.sandbox\.indeed\.net\/(#\/)?proctor\/jobsearch\/.*/,
            textPatterns: [
                ...proctorDesc,

                // ! Group 1 - ranking targets
                {
                    regex: /^IDX P\(AS \| seen\)$/,
                    textColor: "rgb(0,0,128)", // Dark blue
                    backColor: "rgb(255,192,255)",
                },
                {
                    regex: /^IDX Spon P\(click \| seen\)$/,
                    textColor: "rgb(0,0,128)", // Dark blue
                    backColor: "rgb(255,192,255)",
                },
                {
                    regex: /^Online Ranker Apply Model$/,
                    textColor: "rgb(153,0,0)", // Dark red
                    backColor: "rgb(255,192,255)",
                },
                {
                    regex: /^Online Ranker CTR Model$/,
                    textColor: "rgb(153,0,0)", // Dark red
                    backColor: "rgb(255,192,255)",
                },

                // ! Group 2 - bidding targets
                {
                    regex: /^IDX Spon P\(AC \| clicked\)$/,
                    textColor: "rgb(0,0,128)", // Dark blue
                    backColor: "rgb(144,238,144)",
                },
                {
                    regex: /^IDX Spon P\(AS \| clicked\)$/,
                    textColor: "rgb(0,0,128)", // Dark blue
                    backColor: "rgb(144,238,144)",
                },
                {
                    regex: /^Online Ranker Spon P\(AC \| clicked\)$/,
                    textColor: "rgb(153,0,0)", // Dark red
                    backColor: "rgb(144,238,144)",
                },
                {
                    regex: /^Online Ranker Spon P\(AS \| Clicked\)$/,
                    textColor: "rgb(153,0,0)", // Dark red
                    backColor: "rgb(144,238,144)",
                },

                // ! Group 3 - PO targets
                {
                    regex: /^IDX Org Attainability$/,
                    textColor: "rgb(0,0,128)", // Dark blue
                    backColor: "rgb(255, 243, 205)",
                },
                // {
                //     regex: /^IDX Spon P\(AS \| clicked\)$/,
                //     textColor: "rgb(0,0,128)",  // Dark blue
                //     backColor: "rgb(255, 243, 205)",
                // },
                {
                    regex: /^Online Ranker Org Attainability$/,
                    textColor: "rgb(153,0,0)", // Dark red
                    backColor: "rgb(255, 243, 205)",
                },
                {
                    regex: /^Online Ranker Qualified New \(BP\)$/,
                    textColor: "rgb(153,0,0)", // Dark red
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

                // // HP JP
                // we don't own JP models
                // {
                //     regex: /^((RJP HP)|(HP)|(RJP)) JP w\/\s*IS$/,
                //     textColor: "rgb(0,0,0)",
                //     backColor: "rgb(255,208,161)",
                // },
                // {
                //     regex: /^((RJP HP)|(HP)|(RJP)) JP w\/\s*IS Shadow Traffic$/,
                //     textColor: "rgb(0,0,0)",
                //     backColor: "rgb(255,225,225)",
                // },

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

                // // SERP JP
                // we don't own JP models
                // {
                //     regex: /^SERP JP w\/\s*IS$/,
                //     textColor: "rgb(0,0,0)",
                //     backColor: "rgb(255,162,173)",
                // },
                // {
                //     regex: /^SERP JP w\/\s*IS Shadow Traffic$/,
                //     textColor: "rgb(0,0,0)",
                //     backColor: "rgb(255,225,225)",
                // },
            ],
        },
    };

    function waitForUtils(timeout = 10000) {
        const requiredFunctions = ["initTextContentChanger"];

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
            utils.initTextContentChanger(urlPatterns);
        } catch (error) {
            console.error("Failed to initialize:", error);
        }
    }

    initScript();
})();
