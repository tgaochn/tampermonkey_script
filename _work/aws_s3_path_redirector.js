// ==UserScript==
// @name         AWS S3 Path Redirector
// @namespace    aws_s3_path_redirector
// @version      0.6.0
// @description  Convert S3 path to AWS S3 Console URL and redirect; auto-linkify S3 paths on supported pages
// @author       gtfish
// @match        https://*.console.aws.amazon.com/s3/*
// @match        https://*.console.aws.amazon.com/sagemaker/*
// @grant        none
// @require      https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @updateURL    https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/aws_s3_path_redirector.js
// @downloadURL  https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/aws_s3_path_redirector.js


// ==/UserScript==
// 0.6.0: refactor draggable button + dialog to shared utils helpers (createDraggableButton / createInputDialog)
// 0.5.0: make "Parse S3 Path" button draggable (position persisted via localStorage); default position centered
// 0.4.0: auto-linkify plain-text S3 paths (s3://, s3a://, s3n://, ARN) into clickable AWS S3 console links on supported pages (SageMaker, S3); add @match for SageMaker
// 0.3.0: support additional S3-compatible protocols (s3a://, s3n://) and AWS S3 HTTPS URLs (virtual-hosted/path-style) and S3 ARN
// 0.2.3: improve parsing logic for S3 path
// 0.2.2: update match to https://*.console.aws.amazon.com/s3/*
// 0.2.1: add Parse button to show parsed URL, Copy URL also shows parsed URL
// 0.2.0: add button position config, add Copy URL button in dialog
// 0.1.0: initial version, convert S3 path to AWS S3 Console URL and redirect

(function () {
    "use strict";

    // Configuration constants
    const CONFIG = {
        UTILS_TIMEOUT: 10000,
        AWS_REGION: "us-east-2", // Default AWS region
        AWS_S3_CONSOLE_BASE_URL: "https://us-east-2.console.aws.amazon.com/s3/buckets",
        BUTTON_ID: "aws-s3-path-redirector-btn",
        BUTTON_POS_KEY: "aws_s3_path_redirector_btn_pos", // localStorage key for persisted position
        BUTTON_DRAG_THRESHOLD: 4, // px moved before a mousedown counts as a drag (not a click)
        // Pages that show the floating "Parse S3 Path" button
        BUTTON_URL_PATTERNS: [
            /^https:\/\/[^/]*\.console\.aws\.amazon\.com\/s3\//i,
        ],
        // Pages where plain-text S3 paths are auto-linkified
        // Add more patterns here to enable linkification on additional pages
        LINKIFY_URL_PATTERNS: [
            /^https:\/\/[^/]*\.console\.aws\.amazon\.com\/sagemaker\//i,
            /^https:\/\/[^/]*\.console\.aws\.amazon\.com\/s3\//i,
        ],
        LINKIFY_DEBOUNCE_MS: 200,
    };

    // Supported S3-compatible protocol prefixes (treated as equivalent to s3://)
    // s3a:// and s3n:// are Hadoop S3 connectors widely used by Spark/EMR/Hive
    const S3_PROTOCOL_PREFIXES = ["s3://", "s3a://", "s3n://"];

    // Extract bucket and key from an input string in various S3 address formats
    // Returns { bucket, key } where key may be empty, or null if not recognized
    function extractBucketAndKey(input) {
        // Protocol-style: s3://bucket/key, s3a://bucket/key, s3n://bucket/key
        for (const prefix of S3_PROTOCOL_PREFIXES) {
            if (input.toLowerCase().startsWith(prefix)) {
                const rest = input.substring(prefix.length);
                const slashIndex = rest.indexOf("/");
                if (slashIndex === -1) return { bucket: rest, key: "" };
                return { bucket: rest.substring(0, slashIndex), key: rest.substring(slashIndex + 1) };
            }
        }

        // ARN: arn:aws:s3:::bucket/key
        const arnPrefix = "arn:aws:s3:::";
        if (input.toLowerCase().startsWith(arnPrefix)) {
            const rest = input.substring(arnPrefix.length);
            const slashIndex = rest.indexOf("/");
            if (slashIndex === -1) return { bucket: rest, key: "" };
            return { bucket: rest.substring(0, slashIndex), key: rest.substring(slashIndex + 1) };
        }

        // HTTPS URLs pointing to AWS S3
        if (/^https?:\/\//i.test(input)) {
            let url;
            try {
                url = new URL(input);
            } catch (_) {
                return null;
            }
            const host = url.hostname.toLowerCase();
            const pathname = url.pathname.replace(/^\/+/, "");

            // Virtual-hosted style: bucket.s3.amazonaws.com or bucket.s3.<region>.amazonaws.com
            // Also handles bucket.s3-<region>.amazonaws.com (legacy)
            const virtualHosted = host.match(/^(.+?)\.s3[.\-][^/]*amazonaws\.com$/);
            if (virtualHosted) {
                return { bucket: virtualHosted[1], key: decodeURIComponent(pathname) };
            }

            // Path style: s3.amazonaws.com/bucket/key or s3.<region>.amazonaws.com/bucket/key
            // Also handles s3-<region>.amazonaws.com (legacy)
            if (/^s3[.\-][^/]*amazonaws\.com$/.test(host) || host === "s3.amazonaws.com") {
                if (!pathname) return null;
                const slashIndex = pathname.indexOf("/");
                if (slashIndex === -1) return { bucket: pathname, key: "" };
                return {
                    bucket: pathname.substring(0, slashIndex),
                    key: decodeURIComponent(pathname.substring(slashIndex + 1)),
                };
            }
        }

        return null;
    }

    // Parse S3 path and extract bucket and prefix
    function parseS3Path(s3Path) {
        const trimmedPath = s3Path.trim();
        const extracted = extractBucketAndKey(trimmedPath);
        if (!extracted || !extracted.bucket) {
            return null;
        }

        const bucket = extracted.bucket;
        let prefix = extracted.key;

        // No key, or already a directory path
        if (prefix === "" || prefix.endsWith("/")) {
            return { bucket, prefix };
        }

        // Determine whether the last segment is a file or a directory without trailing /
        const lastSlashIndex = prefix.lastIndexOf("/");
        const lastPart = lastSlashIndex !== -1 ? prefix.substring(lastSlashIndex + 1) : prefix;

        // File criteria: contains "." where the part after last "." is 1-10 chars (extension)
        // and the "." is not at the start (hidden files like .gitignore are files too)
        const dotIndex = lastPart.lastIndexOf(".");
        const hasExtension = dotIndex > 0 && (lastPart.length - dotIndex - 1) >= 1 && (lastPart.length - dotIndex - 1) <= 10;
        const isHiddenFile = lastPart.startsWith(".") && lastPart.length > 1 && !lastPart.substring(1).includes("/");
        const isLikelyFile = hasExtension || isHiddenFile;

        if (isLikelyFile) {
            prefix = lastSlashIndex !== -1 ? prefix.substring(0, lastSlashIndex + 1) : "";
        } else {
            prefix = prefix + "/";
        }

        return { bucket, prefix };
    }

    // Build AWS S3 Console URL
    function buildS3ConsoleUrl(bucket, prefix, region = CONFIG.AWS_REGION) {
        const baseUrl = `https://${region}.console.aws.amazon.com/s3/buckets/${bucket}`;
        const params = new URLSearchParams({
            region: region,
        });

        if (prefix) {
            params.append("prefix", prefix);
        }

        return `${baseUrl}?${params.toString()}`;
    }

    // Create input dialog for S3 path
    function createS3PathDialog(utils) {
        // Parsed-URL display area (shown by Parse / Copy / Redirect actions)
        const parsedUrlDisplay = document.createElement("div");
        parsedUrlDisplay.style.cssText = `
            margin-bottom: 15px;
            padding: 10px;
            background: #f5f5f5;
            border: 1px solid #ddd;
            border-radius: 4px;
            display: none;
        `;

        const parsedUrlLabel = document.createElement("div");
        parsedUrlLabel.textContent = "Parsed URL:";
        parsedUrlLabel.style.cssText = "font-size:12px;color:#666;margin-bottom:5px;font-weight:bold;";

        const parsedUrlText = document.createElement("div");
        parsedUrlText.style.cssText = "font-family:monospace;font-size:12px;color:#333;word-break:break-all;user-select:all;";

        parsedUrlDisplay.appendChild(parsedUrlLabel);
        parsedUrlDisplay.appendChild(parsedUrlText);

        // Validate the current input; optionally reveal the parsed URL. Returns the URL or null.
        function validateAndParse(api, showUrl) {
            const s3Path = api.value();
            if (!s3Path) {
                api.showError("Please enter an S3 path");
                parsedUrlDisplay.style.display = "none";
                return null;
            }
            const parsed = parseS3Path(s3Path);
            if (!parsed) {
                api.showError(
                    "Invalid S3 path. Supported: s3://, s3a://, s3n://, https://...amazonaws.com/..., arn:aws:s3:::..."
                );
                parsedUrlDisplay.style.display = "none";
                return null;
            }
            api.clearError();
            const url = buildS3ConsoleUrl(parsed.bucket, parsed.prefix);
            if (showUrl) {
                parsedUrlText.textContent = url;
                parsedUrlDisplay.style.display = "block";
            }
            return url;
        }

        utils.createInputDialog({
            title: "AWS S3 Path Redirector",
            description: "Enter S3 path (s3://, s3a://, s3n://, AWS S3 HTTPS URL, or arn:aws:s3:::...)",
            placeholder: "s3://bucket-name/path/to/file",
            extraContent: parsedUrlDisplay,
            enterButton: "Redirect",
            buttons: [
                { label: "Cancel", kind: "cancel", onClick: (api) => api.close() },
                { label: "Parse", kind: "secondary", onClick: (api) => validateAndParse(api, true) },
                {
                    label: "Copy URL",
                    kind: "accent",
                    onClick: async (api, btn) => {
                        const url = validateAndParse(api, true);
                        if (!url) return;
                        try {
                            await navigator.clipboard.writeText(url);
                            // Show success feedback on the button itself
                            const originalText = btn.textContent;
                            const originalBg = btn.style.background;
                            btn.textContent = "Copied!";
                            btn.style.background = "#4CAF50";
                            setTimeout(() => {
                                btn.textContent = originalText;
                                btn.style.background = originalBg;
                            }, 2000);
                        } catch (err) {
                            console.error("Failed to copy URL:", err);
                            api.showError("Failed to copy URL to clipboard");
                        }
                    },
                },
                {
                    label: "Redirect",
                    kind: "primary",
                    onClick: (api) => {
                        const url = validateAndParse(api, true);
                        if (url) {
                            api.close();
                            window.location.href = url;
                        }
                    },
                },
            ],
        });
    }

    // Wait for utils to load (if needed)
    function waitForUtils(timeout = CONFIG.UTILS_TIMEOUT) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            function checkUtils() {
                if (window.utils) {
                    resolve(window.utils);
                } else if (Date.now() - startTime >= timeout) {
                    // Utils not required for this script, just resolve
                    resolve(null);
                } else {
                    setTimeout(checkUtils, 100);
                }
            }

            checkUtils();
        });
    }

    // Create the floating (draggable) button that opens the S3 path dialog.
    // Position is persisted in localStorage (default: top-center) via shared utils.
    function createFloatingButton(utils) {
        return utils.createDraggableButton({
            id: CONFIG.BUTTON_ID,
            text: "Parse S3 Path",
            storageKey: CONFIG.BUTTON_POS_KEY,
            defaultPosition: "top-center",
            threshold: CONFIG.BUTTON_DRAG_THRESHOLD,
            onClick: () => createS3PathDialog(utils),
        });
    }

    // ========================================================================
    // Linkifier: detect plain-text S3 paths in the page and replace them with
    // clickable links pointing to the AWS S3 console.
    // ========================================================================

    const LINKIFIED_CLASS = "tm-s3-linkified";
    // Match s3://, s3a://, s3n:// followed by bucket and optional key, or an S3 ARN.
    // The character class for the key excludes whitespace and common delimiters
    // so the match doesn't bleed into surrounding punctuation.
    const S3_TEXT_REGEX = /(s3[an]?:\/\/[a-zA-Z0-9][a-zA-Z0-9.\-]*[a-zA-Z0-9](?:\/[^\s<>"'`)\]}]*)?|arn:aws:s3:::[a-zA-Z0-9][a-zA-Z0-9.\-]*[a-zA-Z0-9](?:\/[^\s<>"'`)\]}]*)?)/gi;
    // Quick prefilter — cheap test to skip text nodes with no possible match
    const S3_PREFILTER_REGEX = /s3[an]?:\/\/|arn:aws:s3:::/i;
    // Trim trailing punctuation that's almost certainly not part of the URI
    const TRAILING_PUNCT_REGEX = /[.,;:!?]+$/;
    // Skip text nodes inside these ancestors
    const LINKIFY_SKIP_TAGS = new Set([
        "SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT",
        "OPTION", "CODE", "PRE", "A", "BUTTON",
    ]);

    function findS3Matches(text) {
        S3_TEXT_REGEX.lastIndex = 0;
        const matches = [];
        let m;
        while ((m = S3_TEXT_REGEX.exec(text)) !== null) {
            let matched = m[0];
            const punct = matched.match(TRAILING_PUNCT_REGEX);
            if (punct) matched = matched.substring(0, matched.length - punct[0].length);
            if (matched.length === 0) continue;
            matches.push({ start: m.index, length: matched.length, text: matched });
        }
        return matches;
    }

    function buildLinkElement(matchText) {
        const parsed = parseS3Path(matchText);
        if (!parsed || !parsed.bucket) return null;
        const url = buildS3ConsoleUrl(parsed.bucket, parsed.prefix);
        const link = document.createElement("a");
        link.href = url;
        link.textContent = matchText;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.className = LINKIFIED_CLASS;
        link.title = url;
        link.style.color = "#0972d3";
        link.style.textDecoration = "underline";
        link.style.cursor = "pointer";
        return link;
    }

    function linkifyTextNode(textNode) {
        const text = textNode.nodeValue;
        if (!text || !S3_PREFILTER_REGEX.test(text)) return;
        const matches = findS3Matches(text);
        if (matches.length === 0) return;

        const fragment = document.createDocumentFragment();
        let cursor = 0;
        let didLinkify = false;

        for (const match of matches) {
            if (match.start > cursor) {
                fragment.appendChild(document.createTextNode(text.substring(cursor, match.start)));
            }
            const link = buildLinkElement(match.text);
            if (link) {
                fragment.appendChild(link);
                didLinkify = true;
            } else {
                fragment.appendChild(document.createTextNode(match.text));
            }
            cursor = match.start + match.length;
        }

        if (cursor < text.length) {
            fragment.appendChild(document.createTextNode(text.substring(cursor)));
        }

        if (didLinkify && textNode.parentNode) {
            textNode.parentNode.replaceChild(fragment, textNode);
        }
    }

    function linkifyRoot(root) {
        if (!root) return;
        if (root.nodeType === Node.TEXT_NODE) {
            const parent = root.parentNode;
            if (parent && !LINKIFY_SKIP_TAGS.has(parent.tagName)) {
                linkifyTextNode(root);
            }
            return;
        }
        if (root.nodeType !== Node.ELEMENT_NODE) return;
        if (LINKIFY_SKIP_TAGS.has(root.tagName)) return;

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
                const parent = node.parentNode;
                if (!parent) return NodeFilter.FILTER_REJECT;
                if (LINKIFY_SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
                if (parent.classList && parent.classList.contains(LINKIFIED_CLASS)) {
                    return NodeFilter.FILTER_REJECT;
                }
                if (!node.nodeValue || !S3_PREFILTER_REGEX.test(node.nodeValue)) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            },
        });

        const textNodes = [];
        let n;
        while ((n = walker.nextNode())) textNodes.push(n);
        for (const textNode of textNodes) linkifyTextNode(textNode);
    }

    function startLinkifier() {
        let pendingRoots = new Set();
        let debounceTimer = null;

        const flush = () => {
            debounceTimer = null;
            const roots = pendingRoots;
            pendingRoots = new Set();
            for (const root of roots) {
                if (!root.isConnected) continue;
                try { linkifyRoot(root); } catch (e) { console.error("linkify error:", e); }
            }
        };

        const schedule = (root) => {
            if (!root) return;
            pendingRoots.add(root);
            if (debounceTimer === null) {
                debounceTimer = setTimeout(flush, CONFIG.LINKIFY_DEBOUNCE_MS);
            }
        };

        // Initial pass on existing page content
        schedule(document.body);

        // Watch for SPA-driven DOM changes
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === "childList") {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.classList && node.classList.contains(LINKIFIED_CLASS)) continue;
                            schedule(node);
                        } else if (node.nodeType === Node.TEXT_NODE && node.parentNode) {
                            if (node.parentNode.classList && node.parentNode.classList.contains(LINKIFIED_CLASS)) continue;
                            schedule(node.parentNode);
                        }
                    }
                } else if (mutation.type === "characterData") {
                    const target = mutation.target;
                    if (target && target.parentNode) {
                        if (target.parentNode.classList && target.parentNode.classList.contains(LINKIFIED_CLASS)) continue;
                        schedule(target.parentNode);
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
        });
    }

    function urlMatchesAnyPattern(url, patterns) {
        return patterns.some((p) => p.test(url));
    }

    // Initialize script
    async function initScript() {
        try {
            const utils = await waitForUtils();
            const currentUrl = window.location.href;

            if (urlMatchesAnyPattern(currentUrl, CONFIG.BUTTON_URL_PATTERNS)) {
                if (utils) {
                    createFloatingButton(utils); // appends + positions + wires drag internally
                } else {
                    console.error("utils not loaded; floating button unavailable");
                }
            }

            if (urlMatchesAnyPattern(currentUrl, CONFIG.LINKIFY_URL_PATTERNS)) {
                startLinkifier();
            }
        } catch (error) {
            console.error("Failed to initialize:", error);
        }
    }

    // Run script when DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initScript);
    } else {
        initScript();
    }
})();

