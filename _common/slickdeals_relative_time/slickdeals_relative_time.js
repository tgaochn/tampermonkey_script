// ==UserScript==
// @name         Slickdeals Relative Time
// @version      0.1.0
// @description  在 Slickdeals 网站的日期后面添加相对时间显示 (如 "3 days ago")
// @author       gtfish
// @match        https://slickdeals.net/*
// @match        https://*.slickdeals.net/*
// @grant        none
// @license      GNU General Public License v3.0
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_common/slickdeals_relative_time/slickdeals_relative_time.js
// @downloadURL  https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_common/slickdeals_relative_time/slickdeals_relative_time.js
// ==/UserScript==
// 0.1.0: initial version, add relative time display after dates

(function () {
    "use strict";

    console.log("[Slickdeals Relative Time] Script started");

    // Regular expression to match date format: "Oct 27, 2025 08:27 PM"
    // This pattern matches: MonthName Day, Year Hour:Minute AM/PM
    const DATE_REGEX = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2})\s+(AM|PM)\b/gi;

    // Store processed text nodes to avoid duplicate processing
    const processedNodes = new WeakSet();

    // Month name to number mapping
    const MONTH_MAP = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        May: 4,
        Jun: 5,
        Jul: 6,
        Aug: 7,
        Sep: 8,
        Oct: 9,
        Nov: 10,
        Dec: 11,
    };

    /**
     * Parse date string and return Date object
     */
    function parseDate(monthStr, day, year, hour, minute, ampm) {
        const month = MONTH_MAP[monthStr];
        let hour24 = parseInt(hour, 10);

        // Convert 12-hour format to 24-hour format
        if (ampm === "PM" && hour24 !== 12) {
            hour24 += 12;
        } else if (ampm === "AM" && hour24 === 12) {
            hour24 = 0;
        }

        return new Date(parseInt(year, 10), month, parseInt(day, 10), hour24, parseInt(minute, 10));
    }

    /**
     * Calculate relative time from given date to now
     */
    function getRelativeTime(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffWeeks = Math.floor(diffDays / 7);
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffDays / 365);

        // Handle future dates
        if (diffMs < 0) {
            const absDiffDays = Math.abs(diffDays);
            if (absDiffDays === 0) {
                return "in the future";
            } else if (absDiffDays === 1) {
                return "1 day ahead";
            } else {
                return `${absDiffDays} days ahead`;
            }
        }

        // Handle past dates
        if (diffYears > 0) {
            return diffYears === 1 ? "1 year ago" : `${diffYears} years ago`;
        } else if (diffMonths > 0) {
            return diffMonths === 1 ? "1 month ago" : `${diffMonths} months ago`;
        } else if (diffWeeks > 0) {
            return diffWeeks === 1 ? "1 week ago" : `${diffWeeks} weeks ago`;
        } else if (diffDays > 0) {
            return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
        } else if (diffHours > 0) {
            return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
        } else if (diffMinutes > 0) {
            return diffMinutes === 1 ? "1 minute ago" : `${diffMinutes} minutes ago`;
        } else {
            return "just now";
        }
    }

    /**
     * Process text node and add relative time after dates
     */
    function processTextNode(textNode) {
        // Skip if already processed
        if (processedNodes.has(textNode)) {
            return;
        }

        const text = textNode.textContent;
        const matches = [...text.matchAll(DATE_REGEX)];

        // If no matches or no parent node, return
        if (matches.length === 0 || !textNode.parentNode) {
            return;
        }

        // Mark as processed
        processedNodes.add(textNode);

        // Build new content with relative time annotations
        let lastIndex = 0;
        const fragment = document.createDocumentFragment();

        matches.forEach((match) => {
            const [fullMatch, month, day, year, hour, minute, ampm] = match;
            const matchIndex = match.index;

            // Add text before the match
            if (matchIndex > lastIndex) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex, matchIndex)));
            }

            // Add the original date text
            fragment.appendChild(document.createTextNode(fullMatch));

            // Parse date and calculate relative time
            try {
                const date = parseDate(month, day, year, hour, minute, ampm);
                const relativeTime = getRelativeTime(date);

                // Create styled span for relative time
                const relativeSpan = document.createElement("span");
                relativeSpan.textContent = ` (${relativeTime})`;
                relativeSpan.style.color = "#666";
                relativeSpan.style.fontSize = "0.9em";
                relativeSpan.style.fontStyle = "italic";

                fragment.appendChild(relativeSpan);
            } catch (e) {
                console.error("[Slickdeals Relative Time] Error parsing date:", fullMatch, e);
            }

            lastIndex = matchIndex + fullMatch.length;
        });

        // Add remaining text
        if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
        }

        // Replace the original text node with the new fragment
        textNode.parentNode.replaceChild(fragment, textNode);
    }

    /**
     * Walk through DOM tree and process all text nodes
     */
    function processNode(node) {
        // Skip script, style, and already processed elements
        if (
            node.nodeType === Node.ELEMENT_NODE &&
            (node.tagName === "SCRIPT" || node.tagName === "STYLE" || node.tagName === "NOSCRIPT")
        ) {
            return;
        }

        if (node.nodeType === Node.TEXT_NODE) {
            // Process text nodes
            if (DATE_REGEX.test(node.textContent)) {
                DATE_REGEX.lastIndex = 0; // Reset regex
                processTextNode(node);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Recursively process child nodes
            // Create a copy of childNodes because we might modify the DOM
            const children = Array.from(node.childNodes);
            children.forEach((child) => processNode(child));
        }
    }

    /**
     * Process entire page
     */
    function processPage() {
        console.log("[Slickdeals Relative Time] Processing page...");
        processNode(document.body);
    }

    /**
     * Throttle function to limit how often a function is called
     */
    function throttle(func, delay) {
        let timer = null;
        return function () {
            if (timer) {
                return;
            }
            timer = setTimeout(() => {
                func.apply(this, arguments);
                timer = null;
            }, delay);
        };
    }

    // Initial processing
    processPage();

    // Watch for DOM changes and process new content
    const observer = new MutationObserver(
        throttle(() => {
            processPage();
        }, 500)
    );

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    console.log("[Slickdeals Relative Time] Observer started, watching for DOM changes");
})();

