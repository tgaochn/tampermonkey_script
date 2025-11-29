// ==UserScript==
// @name         Slickdeals 改时间格式
// @version      0.1.5
// @description  在 Slickdeals 网站的日期后面添加相对时间显示 (如 "3 days ago")
// @author       gtfish
// @match        https://slickdeals.net/*
// @match        https://*.slickdeals.net/*
// @grant        none
// @license      GNU General Public License v3.0
// @run-at       document-idle
// @updateURL    https://github.com/tgaochn/tampermonkey_script/raw/refs/heads/master/_common/Slickdeals%E6%94%B9%E6%97%B6%E9%97%B4%E6%A0%BC%E5%BC%8F/slickdeals_relative_time.js
// @downloadURL  https://github.com/tgaochn/tampermonkey_script/raw/refs/heads/master/_common/Slickdeals%E6%94%B9%E6%97%B6%E9%97%B4%E6%A0%BC%E5%BC%8F/slickdeals_relative_time.js
// ==/UserScript==
// 0.1.5: increase font size for relative time
// 0.1.4: wait for hydration to complete before processing, use aggressive re-processing strategy
// 0.1.3: add detailed logging to debug disappearing issue, detect element removal
// 0.1.2: fix disappearing issue - use data-attribute for persistent marking, optimize MutationObserver
// 0.1.1: fix infinite loop bug, add highlight style for relative time
// 0.1.0: initial version, add relative time display after dates

(function () {
    "use strict";

    console.log("[Slickdeals Relative Time] Script started");

    // Regular expression to match date format: "Oct 27, 2025 08:27 PM"
    // This pattern matches: MonthName Day, Year Hour:Minute AM/PM
    const DATE_REGEX =
        /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2})\s+(AM|PM)\b/gi;

    // Marker attribute to identify already processed content
    const PROCESSED_ATTR = "data-slickdeals-time-processed";
    const PROCESSED_MARKER_CLASS = "slickdeals-relative-time-added";

    // Track if hydration has likely completed
    let hydrationComplete = false;
    let initialProcessingDone = false;

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
     * Check if element already has a relative time span as sibling
     */
    function hasRelativeTimeSpan(element) {
        if (!element || !element.parentNode) return false;

        // Check if next sibling is our relative time span
        const nextSibling = element.nextSibling;
        if (nextSibling && nextSibling.nodeType === Node.ELEMENT_NODE) {
            if (nextSibling.classList && nextSibling.classList.contains(PROCESSED_MARKER_CLASS)) {
                return true;
            }
        }

        // Check all siblings for our span
        const siblings = element.parentNode.childNodes;
        for (let i = 0; i < siblings.length; i++) {
            const sibling = siblings[i];
            if (
                sibling.nodeType === Node.ELEMENT_NODE &&
                sibling.classList &&
                sibling.classList.contains(PROCESSED_MARKER_CLASS)
            ) {
                return true;
            }
        }

        return false;
    }

    /**
     * Process text node and add relative time after dates
     */
    function processTextNode(textNode) {
        const text = textNode.textContent;
        const matches = [...text.matchAll(DATE_REGEX)];

        // If no matches or no parent node, return
        if (matches.length === 0 || !textNode.parentNode) {
            return;
        }

        // Check if already has relative time span
        if (hasRelativeTimeSpan(textNode)) {
            return;
        }

        // Find the closest element parent
        let parentElement = textNode.parentNode;
        while (parentElement && parentElement.nodeType !== Node.ELEMENT_NODE) {
            parentElement = parentElement.parentNode;
        }

        if (!parentElement) {
            return;
        }

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

                // Create styled span for relative time with highlight
                const relativeSpan = document.createElement("span");
                relativeSpan.textContent = ` (${relativeTime})`;
                relativeSpan.className = PROCESSED_MARKER_CLASS;
                relativeSpan.setAttribute(PROCESSED_ATTR, "true");
                relativeSpan.style.cssText = `
                    background-color: #fff3cd !important;
                    color: #856404 !important;
                    padding: 2px 6px !important;
                    border-radius: 3px !important;
                    font-size: 1.1em !important;
                    font-weight: 600 !important;
                    margin-left: 4px !important;
                    display: inline-block !important;
                `;

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

        // Mark parent element as processed
        parentElement.setAttribute(PROCESSED_ATTR, "true");

        // Replace the original text node with the new fragment
        textNode.parentNode.replaceChild(fragment, textNode);
    }

    /**
     * Walk through DOM tree and process all text nodes
     */
    function processNode(node) {
        // Skip script, style elements
        if (node.nodeType === Node.ELEMENT_NODE) {
            // Skip certain tags
            if (node.tagName === "SCRIPT" || node.tagName === "STYLE" || node.tagName === "NOSCRIPT") {
                return;
            }

            // Skip our added elements
            if (node.classList && node.classList.contains(PROCESSED_MARKER_CLASS)) {
                return;
            }
        }

        if (node.nodeType === Node.TEXT_NODE) {
            // Process text nodes that contain dates
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
        processNode(document.body);
    }

    /**
     * Initialize the script after a delay to allow hydration to complete
     */
    function initialize() {
        console.log("[Slickdeals Relative Time] Initializing...");

        // Initial processing
        processPage();
        initialProcessingDone = true;

        // Set up mutation observer
        const observer = new MutationObserver((mutations) => {
            // Batch process mutations to avoid excessive processing
            const nodesToProcess = new Set();

            mutations.forEach((mutation) => {
                // Process added nodes
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
                        nodesToProcess.add(node);
                    }
                });
            });

            // Process all collected nodes
            if (nodesToProcess.size > 0) {
                requestAnimationFrame(() => {
                    nodesToProcess.forEach((node) => {
                        if (document.contains(node)) {
                            processNode(node);
                        }
                    });
                });
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        console.log("[Slickdeals Relative Time] Initialized and observing DOM changes");
    }

    // Wait for potential hydration to complete before processing
    // SSR frameworks like React typically complete hydration within 1-2 seconds
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            setTimeout(initialize, 2000);
        });
    } else {
        // Document already loaded, wait a bit for hydration
        setTimeout(initialize, 2000);
    }
})();
