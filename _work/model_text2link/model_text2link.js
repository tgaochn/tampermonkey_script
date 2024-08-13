// ==UserScript==
// @name         model_text2link
// @version      0.0.1
// @description  Convert text patterns to clickable links using regex
// @author              gtfish
// @license             MIT
// @match        https://idash.sandbox.indeed.net/*
// @match        http://127.0.0.1:5500/*
// @grant        none
// @updateURL           https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/model_text2link/model_text2link.js
// @downloadURL         https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/model_text2link/model_text2link.js
// ==/UserScript==
// 0.0.1: init, 添加部分model的name pattern

(function () {
    'use strict';

    // Define patterns and their corresponding URL templates
    const patterns = [
        // {
        //     regex: /(gtfish)/g,
        //     urlTemplate: 'http://www.$1.com'
        // },

        // ! single target hp/serp models: applyperseen_rj_hp_jp_52684ee / ctr_rj_sjhp_jp_a3683b0 / applyperseen_mobweb_rotw_a3683b0
        {
            regex: /^(((applyperseen)|(ctr))_((rj_hp)|(mobweb))_((us)|(rotw)|(jp))_[a-zA-Z0-9]{7})$/g,
            urlTemplate: 'http://www.$1.com'
        },

        // ! MTM models: applyperseen_and_ctr_rj_hp_jp_15339e0
        {
            regex: /^(applyperseen_and_ctr_rj_hp_((us)|(rotw)|(jp))_[a-zA-Z0-9]{7})$/g,
            urlTemplate: 'http://www.$1.com'
        },

        // ! SERP models: sjmobweb_us_15339e0
        {
            regex: /^(sjmobweb_((us)|(rotw)|(jp))_[a-zA-Z0-9]{7})$/g,
            urlTemplate: 'http://www.$1.com'
        },

    ];

    function convertTextToLinks(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            let shouldReplace = false;
            let html = node.textContent;

            patterns.forEach(({ regex, urlTemplate }) => {
                if (regex.test(html)) {
                    shouldReplace = true;
                    html = html.replace(regex, (match, p1) => {
                        const url = urlTemplate.replace('$1', p1);
                        return `<a href="${url}">${match}</a>`;
                    });
                }
            });

            if (shouldReplace) {
                const span = document.createElement('span');
                span.innerHTML = html;
                node.parentNode.replaceChild(span, node);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE && !['SCRIPT', 'STYLE', 'TEXTAREA', 'A'].includes(node.tagName)) {
            Array.from(node.childNodes).forEach(convertTextToLinks);
        }
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    const debouncedConvert = debounce(() => convertTextToLinks(document.body), 300);

    // Run the function when the page loads
    debouncedConvert();

    // Observe changes and run the function again
    const observer = new MutationObserver(debouncedConvert);
    observer.observe(document.body, { childList: true, subtree: true });
})();