// ==UserScript==
// @name         model_text2link
// @version      0.1.0
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
// 0.1.0: use @require to load external script
// 0.0.8: remove the match on jira ticket
// 0.0.7: added jira as matched website
// 0.0.6: added more model patterns
// 0.0.5: added RJQ ticket pattern
// 0.0.4: added more models pattern
// 0.0.3: added I2A models template - elephant-multi-en-all_en-4e18057
// 0.0.2: 修改link, 添加更多的model pattern
// 0.0.1: init, 添加部分model的name pattern

// @match        http*://indeed.atlassian.net/browse/*

(function () {
    'use strict';

    // Define patterns and their corresponding URL templates
    const patterns = [
        // {
        //     regex: /(gtfish)/g,
        //     urlTemplate: 'http://www.$1.com'
        // },

        // RJQ tickets
        {
            regex: /^RJQ-[0-9]{1,6}$/ig,
            urlTemplate: 'https://indeed.atlassian.net/browse/$1'
        },

        // ! single/multiple target hp/serp models
        // pre-apply: applyperseen_rj_hp_jp_52684ee / ctr_rj_sjhp_jp_a3683b0 / applyperseen_mobweb_rotw_a3683b0 / applyperseen_and_ctr_rj_hp_jp_15339e0
        // bidding: ac-per-click_rj_hp_us_5a303d3 / apply_rj_hp_us_fbed164
        // post-apply: qualifiedapply_mob_global_6156574 / qualified_mob_global_e9b72c9 
        // default MTM: multi_rj_hp_us_15339e0
        // others: dislike_rj_hp_us_b734f31 
        {
            regex: /^(((applyperseen)|(ctr)|(applyperseen_and_ctr)|(dislike)|(apply)|(ac-per-click)|(qualifiedapply)|(qualified)|(multi))_((rj_sjhp)|(rj_hp)|(mobweb)|(mob))_((us)|(rotw)|(jp)|(global))_[a-zA-Z0-9]{7})$/g,
            urlTemplate: 'https://butterfly.sandbox.indeed.net/#/model/$1/PUBLISHED/config'
        },

        // ! SERP models: sjmobweb_us_15339e0
        {
            regex: /^(sjmobweb_((us)|(rotw)|(jp))_[a-zA-Z0-9]{7})$/g,
            urlTemplate: 'https://butterfly.sandbox.indeed.net/#/model/$1/PUBLISHED/config'
        },

        // ! I2A models: elephant-multi-en-all_en-4e18057
        {
            regex: /^(elephant-multi-en-all_en-[a-zA-Z0-9]{7})$/g,
            urlTemplate: 'https://butterfly.sandbox.indeed.net/#/model/$1/PUBLISHED/config'
        },
    ];

    function waitForUtils(timeout = 10000) {
        console.log('Starting to wait for utils...');
        const requiredFunctions = [
            'observeDOM',
        ];

        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            function checkUtils() {
                console.log('Checking utils:', window.utils);
                console.log('Available functions:', window.utils ? Object.keys(window.utils) : 'none');

                if (window.utils && requiredFunctions.every(func => {
                    const hasFunc = typeof window.utils[func] === 'function';
                    console.log(`Checking function ${func}:`, hasFunc);
                    return hasFunc;
                })) {
                    console.log('All required functions found');
                    resolve(window.utils);
                } else if (Date.now() - startTime >= timeout) {
                    const missingFunctions = requiredFunctions.filter(func =>
                        !window.utils || typeof window.utils[func] !== 'function'
                    );
                    console.log('Timeout reached. Missing functions:', missingFunctions);
                    reject(new Error(`Timeout waiting for utils. Missing functions: ${missingFunctions.join(', ')}`));
                } else {
                    console.log('Not all functions available yet, checking again in 100ms');
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
            }, 300);

            // Only need to set up the observer - it will run when DOM is ready
            utils.observeDOM(document.body, debouncedConvert);

        } catch (error) {
            console.error('Failed to initialize:', error);
        }
    }

    initScript();
})();