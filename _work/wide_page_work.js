// ==UserScript==
// @name                wide_page_work
// @version             0.2.1
// @description         Force fixed-width work pages (Confluence/wiki, etc.) to full width by widening every wrapper that is narrower than its parent along the content's ancestor chain
// @author              gtfish
// @license             MIT
// @match               https://indeed.atlassian.net/wiki/*
// @grant               GM_addStyle
// @require             https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @updateURL           https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/wide_page_work.js
// @downloadURL         https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/wide_page_work.js
// ==/UserScript==
// 0.2.1: enable more urls to be widened
// 0.1.0: init - runtime-scan the content wrapper whose computed max-width is ~760px and widen it (max-width:none; width:auto), with known Confluence selectors as fallback; keeps working across SPA page-to-page navigation

(function () {
    "use strict";

    const LOG_PREFIX = "[wide_page_work]";

    // Marker attribute we stamp on any wrapper we decide to widen; the CSS rule below
    // targets this attribute so the override survives React re-renders (we just re-stamp
    // on the next DOM-mutation / URL-change pass).
    const WIDE_ATTR = "data-wide-page";

    // A wrapper counts as "constraining" when it is narrower than the space its parent
    // offers by more than this many px — small gaps (padding, scrollbar) are ignored.
    const WIDTH_TOLERANCE = 24;

    // Fallback content anchors when a mapping omits contentRootSelectors.
    const DEFAULT_CONTENT_ROOT_SELECTORS = ["main", '[role="main"]', "#content"];

    // !! -----------------------------------------------------------------------------
    // !! Per-site config — add a new wide-able page by appending one entry here.
    // !! Each entry:
    // !!   pattern              {RegExp}   which URLs this rule applies to
    // !!   contentRootSelectors {string[]} where the article body lives; we walk UP from
    // !!                                   each match and widen every ancestor that is
    // !!                                   narrower than its parent (optional)
    // !!   cssSelectors         {string[]} known wrappers to force-widen via CSS directly,
    // !!                                   as a belt-and-suspenders (optional)
    // !! -----------------------------------------------------------------------------
    const wideMappings = [
        // ! indeed confluence / wiki
        {
            pattern: /^https:\/\/indeed\.atlassian\.net\/wiki\/.*$/,
            contentRootSelectors: [
                // Classic published/renderer pages
                '[data-testid="ak-renderer-document"]',
                ".ak-renderer-document",
                '[data-testid="content-body"]',
                '[data-testid="page-content"]',
                "#content",
                'main [role="article"]',
                // New live-pages editable view: content lives in the ProseMirror editor,
                // classes are emotion hashes (change per deploy) so we anchor on the
                // stable editor id/class and walk UP to find the width wrappers.
                "#ak-editor-textarea",
                ".ak-editor-content-area",
                ".ProseMirror",
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

    // Inject (once per mapping) the static CSS: the marker-attribute rule plus any known
    // wrapper selectors this mapping declares.
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

    function markWide(el) {
        if (el.getAttribute(WIDE_ATTR) === "1") return false;
        el.setAttribute(WIDE_ATTR, "1");
        return true;
    }

    function widen() {
        const mapping = getMatchedMapping(window.location.href);
        if (!mapping) return;

        ensureCssInjected(mapping);

        const rootSelectors = mapping.contentRootSelectors || DEFAULT_CONTENT_ROOT_SELECTORS;
        const anchors = [];
        rootSelectors.forEach((sel) => {
            document.querySelectorAll(sel).forEach((el) => anchors.push(el));
        });

        // Walk each anchor UP to <body>; widen any element that is meaningfully narrower
        // than the space its parent offers (that's the thing imposing a width cap, whether
        // via max-width or an explicit width, at any value and across multiple layers).
        const visited = new Set();
        let marked = 0;
        anchors.forEach((anchor) => {
            let el = anchor;
            while (el && el !== document.body && el !== document.documentElement) {
                if (visited.has(el)) break; // shared upper chain already handled this pass
                visited.add(el);

                const parent = el.parentElement;
                if (parent) {
                    const elWidth = el.offsetWidth;
                    const parentWidth = parent.offsetWidth;
                    if (elWidth > 0 && parentWidth > 0 && elWidth < parentWidth - WIDTH_TOLERANCE) {
                        if (markWide(el)) marked += 1;
                    }
                }
                el = parent;
            }
        });

        if (marked > 0) {
            console.log(`${LOG_PREFIX} widened ${marked} constraining wrapper(s)`);
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
