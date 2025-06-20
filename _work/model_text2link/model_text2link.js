// ==UserScript==
// @name         model_text2link
// @version      0.1.7
// @description  Convert text patterns to clickable links using regex
// @author              gtfish
// @license             MIT
// @match        http*://idash.sandbox.indeed.net/*
// @match        http://127.0.0.1:5500/*
// @grant        none
// @require             https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @updateURL           https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/model_text2link/model_text2link.js
// @downloadURL         https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/model_text2link/model_text2link.js
// ==/UserScript==
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

    // Define patterns and their corresponding URL templates
    const patterns = [
        // RJQ tickets
        {
            regex: /^RJQ-[0-9]{1,6}$/gi,
            urlTemplate: "https://indeed.atlassian.net/browse/$1",
        },

        // ! hp/serp models
        // pre-apply/post-apply UDS: preapply_serp_row_6e1f741/postapply_hp_us_4a8ab91
        // pre-apply/post-apply MTM: preapply_hp_row_6e1f741/postapply_hp_us_4a8ab91
        // MTM: applyperseen_rj_hp_jp_52684ee / ctr_rj_sjhp_jp_a3683b0 / applyperseen_mobweb_rotw_a3683b0 / applyperseen_and_ctr_rj_hp_jp_15339e0
        // bidding: ac-per-click_rj_hp_us_5a303d3 / apply_rj_hp_us_fbed164 / ac-per-click_sjmobweb_rotw_60306c6 / apply_sjmobweb_rotw_e60cca4
        // post-apply: qualifiedapply_mob_global_6156574 / qualified_mob_global_e9b72c9
        // glassdoor model: gd_sjmobweb_rotw_3c86644
        // default MTM: multi_rj_hp_us_15339e0
        // others: dislike_rj_hp_us_b734f31
        {
            regex: /^((gd_)?((sjmobweb)|(applyperseen)|(ctr)|(applyperseen_and_ctr)|(dislike)|(apply)|(ac-per-click)|(qualifiedapply)|(qualified)|(multi)|(preapply)|(postapply))_(((rj_sjhp)|(rj_hp)|(mobweb)|(mob)|(sjmobweb)|(hp)|(serp))_)?((us)|(rot?w)|(jp)|(global))_[a-zA-Z0-9]{7})$/g,
            urlTemplate: "https://butterfly.sandbox.indeed.net/#/model/$1/PUBLISHED/config",
        },

        // // ! SERP models: sjmobweb_us_15339e0
        // {
        //     regex: /^(sjmobweb_((us)|(rotw)|(jp))_[a-zA-Z0-9]{7})$/g,
        //     urlTemplate: "https://butterfly.sandbox.indeed.net/#/model/$1/PUBLISHED/config",
        // },

        // ! I2A models: elephant-multi-en-all_en-4e18057
        {
            regex: /^(elephant-multi-en-all_en-[a-zA-Z0-9]{7})$/g,
            urlTemplate: "https://butterfly.sandbox.indeed.net/#/model/$1/PUBLISHED/config",
        },
    ];

    function waitForUtils(timeout = CONFIG.UTILS_TIMEOUT) {
        console.log("Starting to wait for utils...");
        const requiredFunctions = CONFIG.REQUIRED_UTILS;

        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            function checkUtils() {
                console.log("Checking utils:", window.utils);
                console.log("Available functions:", window.utils ? Object.keys(window.utils) : "none");

                if (
                    window.utils &&
                    requiredFunctions.every((func) => {
                        const hasFunc = typeof window.utils[func] === "function";
                        console.log(`Checking function ${func}:`, hasFunc);
                        return hasFunc;
                    })
                ) {
                    console.log("All required functions found");
                    resolve(window.utils);
                } else if (Date.now() - startTime >= timeout) {
                    const missingFunctions = requiredFunctions.filter(
                        (func) => !window.utils || typeof window.utils[func] !== "function"
                    );
                    console.log("Timeout reached. Missing functions:", missingFunctions);
                    reject(new Error(`Timeout waiting for utils. Missing functions: ${missingFunctions.join(", ")}`));
                } else {
                    console.log("Not all functions available yet, checking again in 100ms");
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

            const debouncedConvert = utils.debounce(() => {
                utils.convertTextToLinks(observeTarget, patterns);
            }, CONFIG.DEBOUNCE_DELAY);

            // Only need to set up the observer - it will run when DOM is ready
            utils.observeDOM(document.body, debouncedConvert);
        } catch (error) {
            console.error("Failed to initialize:", error);
        }
    }

    initScript();
})();
