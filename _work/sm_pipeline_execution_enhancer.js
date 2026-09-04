// ==UserScript==
// @name                sm_pipeline_execution_enhancer
// @version             0.1.0
// @description         SageMaker Studio pipeline execution: add Duration + Central Time to Information tab
// @author              gtfish
// @license             MIT
// @match               https://*.studio.us-east-2.sagemaker.aws/pipelines/view/*
// @grant               none
// @require             https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @updateURL           https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/sm_pipeline_execution_enhancer.js
// @downloadURL         https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/sm_pipeline_execution_enhancer.js
// ==/UserScript==
// 0.1.0: init - Information tab: add Duration item (Modified - Created), append CDT to Created/Modified on

(function () {
    "use strict";

    const LOG_PREFIX = "[sm_pipeline_execution_enhancer]";
    const DURATION_MARK = "data-sm-duration-item";
    const CENTRAL_TZ_MARK = "data-sm-central-added";
    const CENTRAL_TZ = "America/Chicago";

    function formatCentralTime(date) {
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: CENTRAL_TZ,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
            timeZoneName: "short",
        }).formatToParts(date);
        const get = (t) => (parts.find((p) => p.type === t) || {}).value || "";
        return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")} ${get("timeZoneName")}`;
    }

    function formatDuration(ms) {
        if (!Number.isFinite(ms) || ms < 0) return "—";
        const totalSec = Math.floor(ms / 1000);
        const d = Math.floor(totalSec / 86400);
        const h = Math.floor((totalSec % 86400) / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        return `${d}d ${h}h ${m}m ${s}s`;
    }

    function findLabelContainer(root, labelText) {
        const containers = root.querySelectorAll('[class*="LabelValueContainer"]');
        for (const c of containers) {
            const label = c.querySelector('[class*="blTextStyleCaption"]');
            if (label && label.textContent.trim() === labelText) return c;
        }
        return null;
    }

    function getBodyEl(container) {
        return container ? container.querySelector('[class*="blTextStyleBody"]') : null;
    }

    function getValueContainer(container) {
        return container ? container.querySelector('[class*="ValueContainer"]') : null;
    }

    function appendCentralTime(container) {
        const valueContainer = getValueContainer(container);
        if (!valueContainer || valueContainer.hasAttribute(CENTRAL_TZ_MARK)) return;
        const bodyEl = getBodyEl(container);
        if (!bodyEl) return;
        const gmtStr = bodyEl.textContent.trim();
        const date = new Date(gmtStr);
        if (isNaN(date.getTime())) return;

        const line = document.createElement("div");
        if (bodyEl.className) line.className = bodyEl.className;
        line.textContent = `(${formatCentralTime(date)})`;
        line.style.marginTop = "2px";
        line.style.opacity = "0.85";
        line.style.fontSize = "0.9em";

        valueContainer.appendChild(line);
        valueContainer.setAttribute(CENTRAL_TZ_MARK, "1");
    }

    function upsertDurationItem(infoPanel, createdContainer, modifiedContainer) {
        const createdBody = getBodyEl(createdContainer);
        const modifiedBody = getBodyEl(modifiedContainer);
        if (!createdBody || !modifiedBody) return;

        // body textContent stays pure GMT — 美国中部时间 lives in a sibling div under ValueContainer
        const createdDate = new Date(createdBody.textContent.trim());
        const modifiedDate = new Date(modifiedBody.textContent.trim());
        if (isNaN(createdDate.getTime()) || isNaN(modifiedDate.getTime())) return;
        const durationStr = formatDuration(modifiedDate.getTime() - createdDate.getTime());

        let durationContainer = infoPanel.querySelector(`[${DURATION_MARK}]`);
        if (!durationContainer) {
            durationContainer = modifiedContainer.cloneNode(true);
            durationContainer.setAttribute(DURATION_MARK, "1");
            const label = durationContainer.querySelector('[class*="blTextStyleCaption"]');
            if (label) label.textContent = "Duration";
            // Strip inherited sibling nodes (e.g. central-time div) from the clone
            const clonedValueContainer = getValueContainer(durationContainer);
            if (clonedValueContainer) {
                clonedValueContainer.removeAttribute(CENTRAL_TZ_MARK);
                const clonedBody = getBodyEl(durationContainer);
                Array.from(clonedValueContainer.children).forEach((child) => {
                    if (child !== clonedBody) clonedValueContainer.removeChild(child);
                });
            }
            modifiedContainer.parentNode.insertBefore(durationContainer, modifiedContainer.nextSibling);
        }
        const durationBody = getBodyEl(durationContainer);
        if (durationBody && durationBody.textContent !== durationStr) {
            durationBody.textContent = durationStr;
        }
    }

    function enhance() {
        const infoPanel = document.querySelector('[data-testid="pipeline-execution-details-information-content"]');
        if (!infoPanel) return;
        const createdContainer = findLabelContainer(infoPanel, "Created on");
        const modifiedContainer = findLabelContainer(infoPanel, "Modified on");
        if (!createdContainer || !modifiedContainer) return;

        // Order matters: insert Duration first (reads pure GMT from body), then append 中部时间.
        upsertDurationItem(infoPanel, createdContainer, modifiedContainer);
        appendCentralTime(createdContainer);
        appendCentralTime(modifiedContainer);
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
            const debounced = utils.debounce(enhance, 300);

            // Immediate + delayed retries for lazy renders / tab switches
            debounced();
            [500, 1500, 3000, 6000].forEach((d) => setTimeout(debounced, d));

            // Catch DOM changes (tab switch inserting the Information panel)
            utils.observeDOMWithThrottle(document.body, debounced, { childList: true, subtree: true }, 400);

            // SPA navigation between executions / tabs
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
