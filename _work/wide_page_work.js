// ==UserScript==
// @name                wide_page_work
// @version             0.2.0
// @description         Force fixed-width work pages (Confluence/wiki, etc.) to full width by stripping the max-width wrapper around the content
// @author              gtfish
// @license             MIT
// @match               https://indeed.atlassian.net/wiki/*
// @grant               GM_addStyle
// @require             https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @updateURL           https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/wide_page_work.js
// @downloadURL         https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/wide_page_work.js
// ==/UserScript==
// 0.2.0: refactor to a regex-driven wideMappings config (like customButtonMappings) - add a new site by appending one entry; per-mapping maxWidthRange / contentRootSelectors / cssSelectors
// 0.1.0: init - runtime-scan the content wrapper whose computed max-width is ~760px and widen it (max-width:none; width:auto), with known Confluence selectors as fallback; keeps working across SPA page-to-page navigation

(function () {
    "use strict";

    const LOG_PREFIX = "[wide_page_work]";

    // Marker attribute we stamp on any wrapper we decide to widen; the CSS rule below
    // targets this attribute so the override survives React re-renders (we just re-stamp
    // on the next DOM-mutation / URL-change pass).
    const WIDE_ATTR = "data-wide-page";

    // Defaults applied when a mapping omits the field.
    // A fixed-width page wraps the body in a container with a px max-width (Confluence
    // ~760–768px); this band is what we treat as "fixed width" and strip.
    const DEFAULT_MAX_WIDTH_RANGE = [680, 860];
    const DEFAULT_CONTENT_ROOT_SELECTORS = ["main", '[role="main"]', "#content"];

    // !! -----------------------------------------------------------------------------
    // !! Per-site config — add a new wide-able page by appending one entry here.
    // !! Each entry:
    // !!   pattern              {RegExp}   which URLs this rule applies to
    // !!   maxWidthRange        {[min,max]} computed max-width (px) band treated as the
    // !!                                   fixed-width wrapper to strip (optional)
    // !!   contentRootSelectors {string[]} article-body roots; the fixed-width wrapper
    // !!                                   sits on their ancestor chain (optional)
    // !!   cssSelectors         {string[]} known wrappers to force-widen via CSS
    // !!                                   directly, as a belt-and-suspenders (optional)
    // !! -----------------------------------------------------------------------------
    const wideMappings = [
        // ! indeed confluence / wiki
        {
            pattern: /^https:\/\/indeed\.atlassian\.net\/wiki\/.*$/,
            maxWidthRange: [680, 860],
            contentRootSelectors: [
                '[data-testid="ak-renderer-document"]',
                ".ak-renderer-document",
                '[data-testid="content-body"]',
                "#content",
                'main [role="article"]',
                "main",
            ],
            cssSelectors: [
                ".ak-renderer-wrapper",
                ".ak-renderer-document",
                '[data-testid="ak-renderer-document"]',
            ],
        },
    ];

    // Tracks which mappings' static CSS we've already injected (avoid dup <style> on SPA nav).
    const injectedCssFor = new Set();

    function getMatchedMapping(url) {
        return wideMappings.find((m) => m.pattern.test(url)) || null;
    }

    function getComputedMaxWidthPx(el) {
        const raw = window.getComputedStyle(el).maxWidth;
        if (!raw || !raw.endsWith("px")) return null;
        const px = parseFloat(raw);
        return Number.isFinite(px) ? px : null;
    }

    function isFixedWidthWrapper(el, range) {
        const px = getComputedMaxWidthPx(el);
        return px !== null && px >= range[0] && px <= range[1];
    }

    // Collect each content root plus every ancestor up to <body> — the fixed-width
    // wrapper is always one of these, so this is both cheap and precise.
    function collectCandidates(rootSelectors) {
        const candidates = new Set();
        rootSelectors.forEach((sel) => {
            document.querySelectorAll(sel).forEach((root) => {
                let node = root;
                while (node && node !== document.body && node !== document.documentElement) {
                    candidates.add(node);
                    node = node.parentElement;
                }
            });
        });
        return candidates;
    }

    // Inject (once per mapping) the static CSS: the marker-attribute rule plus any
    // known wrapper selectors this mapping declares.
    function ensureCssInjected(mapping) {
        if (injectedCssFor.has(mapping)) return;
        injectedCssFor.add(mapping);

        const rules = [
            `[${WIDE_ATTR}="1"] { max-width: none !important; width: auto !important; }`,
        ];
        (mapping.cssSelectors || []).forEach((sel) => {
            rules.push(`${sel} { max-width: none !important; width: auto !important; }`);
        });
        GM_addStyle(rules.join("\n"));
    }

    function widen() {
        const mapping = getMatchedMapping(window.location.href);
        if (!mapping) return;

        ensureCssInjected(mapping);

        const range = mapping.maxWidthRange || DEFAULT_MAX_WIDTH_RANGE;
        const rootSelectors = mapping.contentRootSelectors || DEFAULT_CONTENT_ROOT_SELECTORS;

        let marked = 0;
        collectCandidates(rootSelectors).forEach((el) => {
            if (el.getAttribute(WIDE_ATTR) === "1") return; // already handled, CSS rule covers it
            if (isFixedWidthWrapper(el, range)) {
                el.setAttribute(WIDE_ATTR, "1");
                marked += 1;
            }
        });
        if (marked > 0) {
            console.log(`${LOG_PREFIX} widened ${marked} fixed-width wrapper(s)`);
        }
    }

    function waitForUtils(timeout = 10000) {
        const requiredFunctions = ["debounce", "observeDOMWithThrottle", "onUrlChange"];
        return new Promise((resolve, reject) => {
            const start = Date.now();
            (function check() {
                if (window.utils && requiredFunctions.every((f) => typeof window.utils[f] === "function")) {
                    resolve(window.utils);
                } else if (Date.now() - start >= timeout) {
                    reject(new Error("Timeout waiting for utils"));
                } else {
                    setTimeout(check, 100);
                }
            })();
        });
    }

    async function initScript() {
        try {
            const utils = await waitForUtils();
            const debounced = utils.debounce(widen, 300);

            // Immediate + delayed retries for lazy / progressive renders
            debounced();
            [500, 1500, 3000, 6000].forEach((d) => setTimeout(debounced, d));

            // Catch DOM changes (content rendered after initial load)
            utils.observeDOMWithThrottle(document.body, debounced, { childList: true, subtree: true }, 400);

            // SPA navigation between pages — re-widen the new page too
            utils.onUrlChange(() => {
                debounced();
                [500, 1500, 3000].forEach((d) => setTimeout(debounced, d));
            });

            console.log(`${LOG_PREFIX} initialized`);
        } catch (error) {
            console.error(`${LOG_PREFIX} Failed to initialize:`, error);
        }
    }

    initScript();
})();
