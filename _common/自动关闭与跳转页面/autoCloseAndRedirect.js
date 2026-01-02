// ==UserScript==
// @name         匹配网页自动关闭/跳转/滚动
// @namespace    AutoCloseAndRedirect
// @version      0.3.1
// @description  自动关闭/跳转/滚动指定页面 (通用脚本)
// @author       gtfish
// @match        https://getadblock.com/*
// @match        https://www.amazon.com/fmc/*
// @match        https://www.amazon.com/gp/buy/thankyou/handlers/display.html?purchaseId=*
// @match        https://*.taobao.com/shop/*
// @match        https://item.taobao.com/*
// @match        https://*.annas-archive.org/*
// @match        https://www.1lou.info/*
// @match        https://app.monarch.com/*
// @grant        window.close
// @license      GNU General Public License v3.0
// @run-at       document-start
// @updateURL    https://github.com/tgaochn/tampermonkey_script/raw/refs/heads/master/_common/%E8%87%AA%E5%8A%A8%E5%85%B3%E9%97%AD%E4%B8%8E%E8%B7%B3%E8%BD%AC%E9%A1%B5%E9%9D%A2/autoCloseAndRedirect.js
// @downloadURL  https://github.com/tgaochn/tampermonkey_script/raw/refs/heads/master/_common/%E8%87%AA%E5%8A%A8%E5%85%B3%E9%97%AD%E4%B8%8E%E8%B7%B3%E8%BD%AC%E9%A1%B5%E9%9D%A2/autoCloseAndRedirect.js

// ==/UserScript==
// 0.3.1: add match for monarch cash-flow page
// 0.3.0: add scrollToKeyword action for auto-scrolling to keyword
// 0.2.6: clean taobao item URL, keep only id and skuId params
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
    // action: "scrollToKeyword" - scroll to first occurrence of keyword
    //         keyword: string or array of strings (finds earliest match in document)
    const pageActions = [
        // ! auto close pages
        // AdBlock upgrade/payment pages
        {
            pattern: /^https:\/\/getadblock\.com\/(en|zh_CN)\/update\/.*/,
            action: "close",
            fallbackUrl: "https://www.google.com/",
        },

        // ! auto redirect pages
        // Monarch cash-flow page - set view=sankey and sankey=both
        {
            pattern: /^https:\/\/app\.monarch\.com\/cash-flow\?/,
            action: "redirect",
            getTargetUrl: (url) => {
                const urlObj = new URL(url);
                // urlObj.searchParams.set("view", "sankey");
                urlObj.searchParams.set("sankey", "both");
                return urlObj.toString();
            },
        },

        // taobao redirect - remove query params from shop URL
        {
            pattern: /^https:\/\/shop\d+\.taobao\.com\/shop\/view_shop\.htm\?/,
            action: "redirect",
            getTargetUrl: (url) => {
                const urlObj = new URL(url);
                return urlObj.origin + urlObj.pathname;
            },
        },

        // taobao item page - keep only id and skuId params
        {
            pattern: /^https:\/\/item\.taobao\.com\/item\.htm\?/,
            action: "redirect",
            getTargetUrl: (url) => {
                const urlObj = new URL(url);
                const id = urlObj.searchParams.get("id");
                const skuId = urlObj.searchParams.get("skuId");
                // Build clean URL with only id and skuId
                const newUrl = new URL(urlObj.origin + urlObj.pathname);
                if (id) {
                    newUrl.searchParams.append("id", id);
                }
                if (skuId) {
                    newUrl.searchParams.append("skuId", skuId);
                }
                return newUrl.toString();
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

        // ! auto scroll to keyword
        // bt之家 (1lou) - scroll to "最新回复" section
        {
            pattern: /^https:\/\/www\.1lou\.info\/thread-\d+\.htm/,
            action: "scrollToKeyword",
            keyword: ["上传的附件", ".torr", "最新回复"],
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
        // Skip redirect if target is same as current (avoid infinite loop)
        if (targetUrl === currentUrl) {
            console.log("[AutoCloseAndRedirect] Skipping redirect, URL already clean");
            return;
        }
        console.log("[AutoCloseAndRedirect] Redirecting to:", targetUrl);
        window.location.href = targetUrl;
    } else if (matchedAction.action === "scrollToKeyword") {
        // Scroll to first occurrence of keyword (supports string or array of keywords)
        const scrollToKeyword = (source) => {
            console.log(`[AutoCloseAndRedirect] scrollToKeyword called from: ${source}, readyState: ${document.readyState}`);
            
            const keywordConfig = matchedAction.keyword;
            if (!keywordConfig) {
                console.log("[AutoCloseAndRedirect] No keyword specified");
                return;
            }

            // Support both single keyword (string) and multiple keywords (array)
            const keywords = Array.isArray(keywordConfig) ? keywordConfig : [keywordConfig];
            console.log("[AutoCloseAndRedirect] Searching for keywords:", keywords);

            // Find the first match among all keywords (by document position)
            let bestMatch = null;
            let bestMatchKeyword = null;

            for (const keyword of keywords) {
                const walker = document.createTreeWalker(
                    document.body,
                    NodeFilter.SHOW_TEXT,
                    {
                        acceptNode: (node) => {
                            return node.textContent.includes(keyword)
                                ? NodeFilter.FILTER_ACCEPT
                                : NodeFilter.FILTER_REJECT;
                        },
                    }
                );

                const match = walker.nextNode();
                if (match) {
                    // Compare document position to find the earliest match
                    if (!bestMatch || (match.compareDocumentPosition(bestMatch) & Node.DOCUMENT_POSITION_FOLLOWING)) {
                        bestMatch = match;
                        bestMatchKeyword = keyword;
                    }
                }
            }

            if (bestMatch) {
                const element = bestMatch.parentElement;
                console.log(`[AutoCloseAndRedirect] Found keyword "${bestMatchKeyword}", scrolling to:`, element);
                element.scrollIntoView({ behavior: "instant", block: "center" });
                console.log("[AutoCloseAndRedirect] scrollIntoView executed, scrollY:", window.scrollY);

                // Optional: highlight the element briefly
                const originalBg = element.style.backgroundColor;
                element.style.backgroundColor = "yellow";
                setTimeout(() => {
                    element.style.backgroundColor = originalBg;
                }, 2000);
            } else {
                console.log("[AutoCloseAndRedirect] No keyword found from:", keywords);
            }
        };

        // Wait for page to be fully loaded (including all resources)
        // Add delay to ensure other scripts finish executing
        const delay = matchedAction.delay || 300; // default 300ms delay
        console.log("[AutoCloseAndRedirect] Current readyState:", document.readyState, "delay:", delay);
        
        if (document.readyState === "complete") {
            setTimeout(() => scrollToKeyword("immediate+delay"), delay);
        } else {
            // Use window.onload to ensure page is fully loaded, then add delay
            window.addEventListener("load", () => {
                setTimeout(() => scrollToKeyword("load+delay"), delay);
            });
        }
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
