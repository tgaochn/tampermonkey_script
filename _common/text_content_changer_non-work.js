// ==UserScript==
// @name                text_content_changer_non-work
// @version             1.0.2
// @description         Change text color/content for specific patterns using regex on non-work URLs
// @author              gtfish
// @license             MIT
// @match               https://www.skidrowreloaded.com/*
// @match               https://www.amazon.com/spr/returns/*
// @match               https://www.mydrivers.com/zhuanti/tianti/*
// @match               https://onlinebanking.usbank.com/*
// @match               https://health.aetna.com/*
// @grant               none
// @require             https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @updateURL           https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_common/text_content_changer_non-work.js
// @downloadURL         https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_common/text_content_changer_non-work.js

// ==/UserScript==
// 1.0.2: 增加 aetna 的颜色匹配
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

    // ! 文本替换规则
    const generalTextReplacement = [
        // usbank 高亮显示缴网费的卡
        {
            regex: /(USBankCashPlus)/g,
            replacement: "$1 (网费)",
            backColor: "rgb(255,192,255)",
        },
    ];

    // !! 匹配url后修改文本颜色/内容
    const urlPatterns = {
        // aetna 高亮显示没有报销的记录
        aetna: {
            urlRegex: /^https?:\/\/health\.aetna\.com\/.*/,
            textPatterns: [
                // Pending
                {
                    regex: /^Pending$/g,
                    textColor: "rgb(0,0,0)",
                    backColor: "rgb(192,255,255)",
                },
                // Denied
                {
                    regex: /^Denied$/g,
                    textColor: "rgb(0,0,0)",
                    backColor: "rgb(255,192,255)",
                },
            ],
        },

        // skidrow 高亮显示最好用的几个网盘
        skidrow: {
            urlRegex: /^https?:\/\/www\.skidrowreloaded\.com\/.*/,
            textPatterns: [
                {
                    regex: /MEDIAFIRE/gi,
                    textColor: "rgb(0,0,0)",
                    backColor: "rgb(255,192,255)",
                },
                {
                    regex: /PIXELDRAIN/gi,
                    textColor: "rgb(0,0,255)",
                    backColor: "rgb(255,255,0)",
                },
                {
                    regex: /GOFILE/gi,
                    textColor: "rgb(0,0,255)",
                    backColor: "rgb(255,192,255)",
                },
                {
                    regex: /1FICHIER/gi,
                    textColor: "rgb(117,117,255)",
                    backColor: "rgb(255,255,0)",
                },
                {
                    regex: /USERSCLOUD/gi,
                    textColor: "rgb(0,0,0)",
                    backColor: "rgb(255,255,128)",
                },
            ],
        },

        // amazon 高亮显示退货最常用选项
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

        // 天梯榜关注的cpu/gpu
        tianti: {
            urlRegex: /^https?:\/\/www\.mydrivers\.com\/.*/,
            textPatterns: [
                // Items planning to get
                {
                    regex: /^锐龙7 9800X3D$/g,
                    textColor: "rgb(0,0,0)",
                    backColor: "rgb(192,255,255)",
                },
                // Already owned items
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
                },
            ],
        },

        // usbank 高亮显示缴网费的卡
        usbank: {
            urlRegex: /^https?:\/\/onlinebanking\.usbank\.com\/.*/,
            textPatterns: [...generalTextReplacement],
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
