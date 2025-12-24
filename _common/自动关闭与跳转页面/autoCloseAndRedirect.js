// ==UserScript==
// @name         匹配网页自动关闭或跳转
// @namespace    AutoCloseAndRedirect
// @version      0.2.5
// @description  自动关闭或跳转指定页面 (通用脚本)
// @author       gtfish
// @match        https://getadblock.com/*
// @match        https://www.amazon.com/fmc/*
// @match        https://www.amazon.com/gp/buy/thankyou/handlers/display.html?purchaseId=*
// @match        https://*.taobao.com/shop/*
// @match        https://*.annas-archive.org/*
// @grant        window.close
// @license      GNU General Public License v3.0
// @run-at       document-start
// @updateURL    https://github.com/tgaochn/tampermonkey_script/raw/refs/heads/master/_common/%E8%87%AA%E5%8A%A8%E5%85%B3%E9%97%AD%E4%B8%8E%E8%B7%B3%E8%BD%AC%E9%A1%B5%E9%9D%A2/autoCloseAndRedirect.js
// @downloadURL  https://github.com/tgaochn/tampermonkey_script/raw/refs/heads/master/_common/%E8%87%AA%E5%8A%A8%E5%85%B3%E9%97%AD%E4%B8%8E%E8%B7%B3%E8%BD%AC%E9%A1%B5%E9%9D%A2/autoCloseAndRedirect.js

// ==/UserScript==
// 0.2.5: add epub/mobi filter for annas-archive search
// 0.2.4: add match for taobao shop page
// 0.2.3: add match for amazon subscribe success page
// 0.2.2: add match for amazon subscribe success page
// 0.2.0: refactored to be a generic script with configurable patterns
// 0.1.2: renamed script
// 0.1.1: add match for getadblock.com
// 0.1.0: initial version, 关闭 AdBlock 的升级和付费推广页面

(function () {
    "use strict";

    // !! Configuration: Define page actions here
    // action: "close" - close the page (fallback to redirect if close fails)
    // action: "redirect" - redirect to targetUrl
    const pageActions = [
        // ! auto close pages
        // AdBlock upgrade/payment pages
        {
            pattern: /^https:\/\/getadblock\.com\/(en|zh_CN)\/update\/.*/,
            action: "close",
            fallbackUrl: "https://www.google.com/",
        },

        // ! auto redirect pages
        // taobao redirect - remove query params from shop URL
        {
            pattern: /^https:\/\/shop\d+\.taobao\.com\/shop\/view_shop\.htm\?/,
            action: "redirect",
            getTargetUrl: (url) => {
                const urlObj = new URL(url);
                return urlObj.origin + urlObj.pathname;
            },
        },

        // annas-archive search - add epub/mobi filter (skip if ext already exists)
        {
            pattern: /^https:\/\/[^/]*\.annas-archive\.org\/search\?(?!.*ext=)/,
            action: "redirect",
            getTargetUrl: (url) => {
                const urlObj = new URL(url);
                const query = urlObj.searchParams.get("q");
                // Build new URL with ext params first, then q
                const newUrl = new URL(urlObj.origin + urlObj.pathname);
                newUrl.searchParams.append("ext", "epub");
                newUrl.searchParams.append("ext", "mobi");
                if (query) {
                    newUrl.searchParams.append("q", query);
                }
                return newUrl.toString();
            },
        },

        // amazon unsubscribe success page
        {
            pattern: /^https:\/\/www\.amazon\.com\/fmc\/everyday-essentials-sns\?.*snsActionCompleted=cancelSubscription.*$/,
            action: "redirect",
            targetUrl: "https://www.amazon.com/auto-deliveries",
        },

        // amazon subscribe success page
        {
            pattern: /^https:\/\/www\.amazon\.com\/gp\/buy\/thankyou\/handlers\/display\.html\?purchaseId=.*$/,
            action: "redirect",
            targetUrl: "https://www.amazon.com/auto-deliveries",
        },
    ];

    // Find matching action for current URL
    const currentUrl = window.location.href;
    const matchedAction = pageActions.find((item) => item.pattern.test(currentUrl));

    if (!matchedAction) {
        console.log("[AutoCloseAndRedirect] No matching pattern for:", currentUrl);
        return;
    }

    console.log("[AutoCloseAndRedirect] Matched pattern, action:", matchedAction.action);

    if (matchedAction.action === "redirect") {
        // Direct redirect (support dynamic targetUrl via getTargetUrl function)
        const targetUrl = matchedAction.getTargetUrl
            ? matchedAction.getTargetUrl(currentUrl)
            : matchedAction.targetUrl;
        console.log("[AutoCloseAndRedirect] Redirecting to:", targetUrl);
        window.location.href = targetUrl;
    } else if (matchedAction.action === "close") {
        // Try to close the window
        console.log("[AutoCloseAndRedirect] Attempting to close window...");
        window.close();

        // Fallback: if window.close() doesn't work, redirect to fallback URL
        setTimeout(() => {
            if (!window.closed) {
                const fallbackUrl = matchedAction.fallbackUrl || "https://www.google.com/";
                console.log("[AutoCloseAndRedirect] window.close() failed, redirecting to:", fallbackUrl);
                window.location.href = fallbackUrl;
            }
        }, 100);
    }
})();
