// ==UserScript==
// @name                text_content_changer_non-work
// @version             0.1.1
// @description         Change text color/content for specific patterns using regex on non-work URLs
// @author              gtfish
// @license             MIT
// @match               https://www.skidrowreloaded.com/*
// @match               https://www.amazon.com/spr/returns/*
// @match               https://www.mydrivers.com/zhuanti/tianti/*
// @match               https://onlinebanking.usbank.com/*
// @grant               none
// @require             https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @updateURL           https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_common/text_content_changer_non-work.js
// @downloadURL         https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_common/text_content_changer_non-work.js

// ==/UserScript==
// 0.1.1: 优化代码, 增加注释
// 0.1.0: init, split from text_content_changer.js

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
