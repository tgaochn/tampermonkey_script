// ==UserScript==
// @name                Butterfly_webapp_btn
// @version             1.1.0
// @description         Add btn on Butterfly webapp
// @author              gtfish
// @license             MIT
// @match               https://butterfly.sandbox.indeed.net/*
// @run-at              document-idle
// @grant               GM_getValue
// @grant               GM_setValue
// @grant               GM_registerMenuCommand
// @require             https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @updateURL           https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/Butterfly_webapp_btn/Butterfly_webapp_btn.js
// @downloadURL         https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/Butterfly_webapp_btn/Butterfly_webapp_btn.js

// ==/UserScript==
// 1.2.0: make "Go to Model" button draggable (position persisted via GM storage); default position centered
// 1.1.0: add floating "Go to Model" button + dialog to jump to a model's LATEST overview by name
// 1.0.1: add preapply/postapply shadow url pattern
// 1.0.0: add copy buttons (ID/MD/href/diff) before model links on proctor overview pages
// 0.6.4: remove US Apply, US CTR, US dislike buttons
// 0.6.3: added new url pattern for butterfly
// 0.6.2: extract CONFIG constants for better maintainability
// 0.6.1: add btn to fetch model version
// 0.6.0: use @require to load external script
// 0.5.1: bug fixed
// 0.5.0: 重构代码, 使用外部函数
// 0.4.7: improve the btn text
// 0.4.5: bug fixed
// 0.4.4: bug fixed
// 0.4.3: add more btn
// 0.4.2: remove jira link
// 0.4.0: add btn to open links
// 0.3.5: use mutationObserver instead of await
// 0.3.2: improved code
// 0.3.0: improved the layout and added text desc
// 0.2.5: reorder button positions and revise desc
// 0.2.4: Added copy build ID and copy hypertext functionality
// 0.2.0: 增加copy build id
// 0.1.0: 优化了hypertext的复制逻辑
// 0.0.1: init, 添加若干按钮

(async function () {
    "use strict";

    // Configuration constants
    const CONFIG = {
        UTILS_TIMEOUT: 10000,
        CONTAINER_ID: "container_id",
        PROCTOR_BTN_MARKER: "data-butterfly-btn-added",
        BASE_URL: "https://butterfly.sandbox.indeed.net",
        MODEL_JUMP_BTN_ID: "butterfly-model-jump-btn",
        MODEL_JUMP_BTN_POS_KEY: "butterfly_model_jump_btn_pos", // GM storage key for persisted position
        MODEL_JUMP_DRAG_THRESHOLD: 4, // px moved before a mousedown counts as a drag (not a click)
        REQUIRED_UTILS: [
            "observeDOM",
            "shouldRunScript",
            "createButtonContainer",
            "createTextNode",
            "createButtonCopyText",
            "createButtonCopyHypertext",
            "createButtonFromCallback",
            "createButtonOpenUrl",
            "copyHypertext",
        ],
    };

    const modelPagePatterns = [/^https:\/\/butterfly\.sandbox\.indeed\.net\/(#\/)?model.*$/];
    const proctorPagePatterns = [/^https:\/\/butterfly\.sandbox\.indeed\.net\/proctor\/.*$/];
    const inclusionPatterns = [...modelPagePatterns, ...proctorPagePatterns];

    const exclusionPatterns = [];

    // Wait for utils to load
    function waitForUtils(timeout = CONFIG.UTILS_TIMEOUT) {
        console.log("Starting to wait for utils...");
        const requiredFunctions = CONFIG.REQUIRED_UTILS;

        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            function checkUtils() {
                console.log("Checking utils:", window.utils);
                console.log("Available functions:", window.utils ? Object.keys(window.utils) : "none");

                if (
                    window.utils &&
                    requiredFunctions.every((func) => {
                        const hasFunc = typeof window.utils[func] === "function";
                        console.log(`Checking function ${func}:`, hasFunc);
                        return hasFunc;
                    })
                ) {
                    console.log("All required functions found");
                    resolve(window.utils);
                } else if (Date.now() - startTime >= timeout) {
                    const missingFunctions = requiredFunctions.filter(
                        (func) => !window.utils || typeof window.utils[func] !== "function"
                    );
                    console.log("Timeout reached. Missing functions:", missingFunctions);
                    reject(new Error(`Timeout waiting for utils. Missing functions: ${missingFunctions.join(", ")}`));
                } else {
                    console.log("Not all functions available yet, checking again in 100ms");
                    setTimeout(checkUtils, 100);
                }
            }

            checkUtils();
        });
    }

    function isModelPage() {
        return modelPagePatterns.some((p) => p.test(window.location.href));
    }

    function isProctorPage() {
        return proctorPagePatterns.some((p) => p.test(window.location.href));
    }

    // Build the model overview URL from a model name
    function buildModelOverviewUrl(name) {
        return `${CONFIG.BASE_URL}/model/${encodeURIComponent(name)}/LATEST/overview/`;
    }

    // Dialog to input a model name and jump to its LATEST overview page
    function createModelJumpDialog() {
        // Modal backdrop
        const modal = document.createElement("div");
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        // Dialog box
        const dialog = document.createElement("div");
        dialog.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            width: 600px;
            max-width: 90%;
        `;

        const titleElement = document.createElement("h3");
        titleElement.textContent = "Go to Model";
        titleElement.style.marginBottom = "15px";

        const descElement = document.createElement("p");
        descElement.textContent = "Enter model name to open its LATEST overview page";
        descElement.style.cssText = "margin-bottom:15px;color:#666;font-size:14px;";

        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = "model-name";
        input.style.cssText = `
            width: 100%;
            padding: 8px;
            margin-bottom: 15px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-family: monospace;
            font-size: 14px;
            box-sizing: border-box;
        `;

        const errorMsg = document.createElement("div");
        errorMsg.style.cssText = "color:red;font-size:12px;margin-bottom:15px;min-height:20px;display:none;";

        const buttonContainer = document.createElement("div");
        buttonContainer.style.cssText = "display:flex;justify-content:flex-end;gap:10px;";

        function getUrl() {
            const name = input.value.trim();
            if (!name) {
                errorMsg.textContent = "Please enter a model name";
                errorMsg.style.display = "block";
                return null;
            }
            errorMsg.style.display = "none";
            return buildModelOverviewUrl(name);
        }

        const cancelButton = document.createElement("button");
        cancelButton.textContent = "Cancel";
        cancelButton.style.cssText = `
            padding: 8px 16px;
            background: #e0e0e0;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;

        function handleCancel() {
            modal.remove();
        }

        // Open in a new tab
        const openNewTabButton = document.createElement("button");
        openNewTabButton.textContent = "Open in New Tab";
        openNewTabButton.style.cssText = `
            padding: 8px 16px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        openNewTabButton.onclick = () => {
            const url = getUrl();
            if (url) {
                window.open(url, "_blank", "noopener,noreferrer");
                modal.remove();
            }
        };

        // Redirect current tab
        const goButton = document.createElement("button");
        goButton.textContent = "Go";
        goButton.style.cssText = `
            padding: 8px 16px;
            background: #009688;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        goButton.onclick = () => {
            const url = getUrl();
            if (url) {
                modal.remove();
                window.location.href = url;
            }
        };

        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                goButton.click();
            } else if (e.key === "Escape") {
                handleCancel();
            }
        });

        cancelButton.onclick = handleCancel;
        modal.onclick = (e) => {
            if (e.target === modal) {
                handleCancel();
            }
        };

        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(openNewTabButton);
        buttonContainer.appendChild(goButton);
        dialog.appendChild(titleElement);
        dialog.appendChild(descElement);
        dialog.appendChild(input);
        dialog.appendChild(errorMsg);
        dialog.appendChild(buttonContainer);
        modal.appendChild(dialog);
        document.body.appendChild(modal);

        input.focus();
    }

    // Load persisted button position from GM storage; returns {left, top} px or null
    function loadModelJumpBtnPos() {
        try {
            const raw = GM_getValue(CONFIG.MODEL_JUMP_BTN_POS_KEY, null);
            if (!raw) return null;
            const pos = typeof raw === "string" ? JSON.parse(raw) : raw;
            if (pos && Number.isFinite(pos.left) && Number.isFinite(pos.top)) {
                return { left: pos.left, top: pos.top };
            }
        } catch (e) {
            console.error("Failed to load button position:", e);
        }
        return null;
    }

    function saveModelJumpBtnPos(pos) {
        try {
            GM_setValue(CONFIG.MODEL_JUMP_BTN_POS_KEY, JSON.stringify(pos));
        } catch (e) {
            console.error("Failed to save button position:", e);
        }
    }

    // Clamp {left, top} so the button stays fully inside the viewport
    function clampToViewport(left, top, el) {
        const maxLeft = Math.max(0, window.innerWidth - el.offsetWidth);
        const maxTop = Math.max(0, window.innerHeight - el.offsetHeight);
        return {
            left: Math.max(0, Math.min(left, maxLeft)),
            top: Math.max(0, Math.min(top, maxTop)),
        };
    }

    // Make the button draggable; persists position on drop and suppresses the
    // click that would otherwise fire at the end of a drag.
    function makeModelJumpBtnDraggable(button) {
        let dragging = false;
        let moved = false;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;

        button.addEventListener("mousedown", (e) => {
            if (e.button !== 0) return;
            dragging = true;
            moved = false;
            startX = e.clientX;
            startY = e.clientY;
            const rect = button.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            e.preventDefault();
        });

        document.addEventListener("mousemove", (e) => {
            if (!dragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (!moved && Math.abs(dx) < CONFIG.MODEL_JUMP_DRAG_THRESHOLD && Math.abs(dy) < CONFIG.MODEL_JUMP_DRAG_THRESHOLD) {
                return;
            }
            moved = true;
            const pos = clampToViewport(startLeft + dx, startTop + dy, button);
            button.style.left = pos.left + "px";
            button.style.top = pos.top + "px";
        });

        document.addEventListener("mouseup", () => {
            if (!dragging) return;
            dragging = false;
            if (moved) {
                saveModelJumpBtnPos({
                    left: parseFloat(button.style.left),
                    top: parseFloat(button.style.top),
                });
            }
        });

        // Swallow the click that ends a drag so it doesn't open the dialog
        button.addEventListener(
            "click",
            (e) => {
                if (moved) {
                    e.stopPropagation();
                    e.preventDefault();
                    moved = false;
                }
            },
            true
        );
    }

    // Floating (draggable) button that opens the model-jump dialog
    function createModelJumpButton() {
        if (document.getElementById(CONFIG.MODEL_JUMP_BTN_ID)) {
            return;
        }
        const button = document.createElement("button");
        button.textContent = "Go to Model";
        button.id = CONFIG.MODEL_JUMP_BTN_ID;
        button.style.cssText = `
            position: fixed;
            z-index: 9999;
            padding: 10px 16px;
            background: #009688;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: move;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            user-select: none;
        `;
        button.addEventListener("mouseenter", () => {
            button.style.background = "#00796b";
        });
        button.addEventListener("mouseleave", () => {
            button.style.background = "#009688";
        });
        button.onclick = () => {
            createModelJumpDialog();
        };
        document.body.appendChild(button);

        // Position: use persisted position if present, otherwise center of viewport
        const saved = loadModelJumpBtnPos();
        const initial = saved
            ? clampToViewport(saved.left, saved.top, button)
            : clampToViewport((window.innerWidth - button.offsetWidth) / 2, 10, button);
        button.style.left = initial.left + "px";
        button.style.top = initial.top + "px";

        makeModelJumpBtnDraggable(button);
    }

    async function initScript() {
        try {
            const utils = await waitForUtils();

            // Floating "Go to Model" button is available on all Butterfly pages
            createModelJumpButton();

            if (!utils.shouldRunScript(inclusionPatterns, exclusionPatterns, window.location.href)) {
                return;
            }

            const observeTarget = document.body;

            if (isModelPage()) {
                const targetElementId = CONFIG.CONTAINER_ID;
                utils.observeDOM(observeTarget, () => {
                    if (!document.getElementById(targetElementId)) {
                        main(utils);
                    }
                });
            } else if (isProctorPage()) {
                const selector = `.proctor-test-definition-view--allocation-table a[href^="/model/"]:not([${CONFIG.PROCTOR_BTN_MARKER}])`;
                utils.observeDOM(observeTarget, () => {
                    if (document.querySelectorAll(selector).length > 0) {
                        mainProctor(utils);
                    }
                });
            }
        } catch (error) {
            console.error("Failed to initialize:", error);
        }
    }

    async function main(utils) {
        // ! add button in the container and define click func
        const modelInfoButtonContainer = utils.createButtonContainer();
        const buildInfoButtonContainer = utils.createButtonContainer();
        const buildsTagsSelector = 'span[class="row no-gutters justify-content-start"]';
        const modelLinkSelector = 'div[class="model-view--header-model-name-row"]';
        const modelNameElem = document.querySelector(modelLinkSelector).childNodes[0];
        const modelId = modelNameElem.childNodes[0].innerText;
        const modelUrl = "https://butterfly.sandbox.indeed.net/model/" + modelId;
        const modelConfUrl = modelUrl + "/PUBLISHED/config";

        modelInfoButtonContainer.id = CONFIG.CONTAINER_ID;

        modelInfoButtonContainer.append(
            utils.createTextNode("text: "),
            utils.createButtonCopyText("id", modelId),
            utils.createButtonCopyText("model_url", modelUrl),
            utils.createButtonCopyText("config_url", modelConfUrl),

            utils.createTextNode("\thref: "),
            utils.createButtonCopyHypertext('href: "model"', "model", modelUrl),
            utils.createButtonCopyHypertext("href: {model_id}", modelId, modelUrl),

            utils.createTextNode("\tmd: "),
            utils.createButtonCopyText('md: ["model"](url)', `[model](${modelUrl})`),
            utils.createButtonCopyText("md: [{model_id}](url)", `[${modelId}](${modelUrl})`)
        );

        buildInfoButtonContainer.append(
            utils.createTextNode("builds: "),
            utils.createButtonFromCallback("current_version", () => {
                const modelVersionSelector = 'div[class="model-version-selector-option-title"]';
                const modelVersion = document.querySelector(modelVersionSelector).childNodes[0].textContent;
                navigator.clipboard.writeText(modelVersion);
            }),

            utils.createButtonFromCallback("last_build_id", () => {
                const buildsTags = document.querySelector(buildsTagsSelector).childNodes[0].childNodes;
                const lastBuildId = buildsTags[buildsTags.length - 1].id;
                navigator.clipboard.writeText(lastBuildId);
            }),

            utils.createButtonFromCallback("all_build_id", () => {
                const buildsTags = document.querySelector(buildsTagsSelector).childNodes[0].childNodes;
                const buildIds = [];

                buildsTags.forEach((div) => {
                    buildIds.push(div.id);
                });

                const textToCopy = buildIds.join("\n");
                navigator.clipboard.writeText(textToCopy);
            }),

            utils.createTextNode("\tlinks: "),
            utils.createButtonOpenUrl(
                "PreApply Shadow",
                `https://proctor.sandbox.indeed.net/proctor/toggles/view/onlineranking_preapply_shadow_tst`
            ),
            utils.createButtonOpenUrl(
                "PostApply Shadow",
                `https://proctor.sandbox.indeed.net/proctor/toggles/view/onlineranking_postapply_shadow_tst`
            ),
            utils.createButtonOpenUrl(
                "DNH doc",
                `https://docs.google.com/document/d/1pe1N4ahQFlOpISk42MqVRwrozKwXKvmChk92ycIOfEo/edit?tab=t.0#heading=h.aau7sivwwngd`
            ),
            utils.createButtonOpenUrl(
                "DNH tool",
                `https://me-core-metrics.sandbox.indeed.net/`
            ),            

        );

        // ! add container to the table
        const table = document.querySelector(".table.table-sm.model-view--table");
        const newRow = document.createElement("tr");
        const cell11 = document.createElement("td");
        const cell12 = document.createElement("td");

        cell11.textContent = "My Btn to copy";
        cell12.style.display = "flex";
        cell12.style.flexDirection = "column"; // contrainer 上下排列
        // containerElement.style.flexDirection = 'row'; // contrainer 左右排列

        cell12.appendChild(modelInfoButtonContainer);
        cell12.appendChild(buildInfoButtonContainer);
        newRow.appendChild(cell11);
        newRow.appendChild(cell12);
        table.appendChild(newRow);
    }

    function mainProctor(utils) {
        const BASE_URL = "https://butterfly.sandbox.indeed.net";
        const MARKER = CONFIG.PROCTOR_BTN_MARKER;

        const modelLinks = document.querySelectorAll(
            `.proctor-test-definition-view--allocation-table a[href^="/model/"]:not([${MARKER}])`
        );

        const SM = "sm";

        modelLinks.forEach((link) => {
            const modelId = link.textContent.trim();
            const modelUrl = BASE_URL + link.getAttribute("href");
            const diffUrl = modelUrl + "PUBLISHED/config?view=diff";

            const btnContainer = document.createElement("span");
            btnContainer.style.cssText = "display:inline-flex;gap:2px;margin-right:4px;vertical-align:middle;";

            btnContainer.append(
                utils.createButtonCopyText("ID", modelId, SM),
                utils.createButtonCopyText("MD", `[${modelId}](${modelUrl})`, SM),
                utils.createButtonCopyHypertext("href", modelId, modelUrl, SM),
                utils.createButtonOpenUrl("diff", diffUrl, SM),
            );

            link.parentNode.insertBefore(btnContainer, link);
            link.setAttribute(MARKER, "true");
        });
    }

    initScript();
})();
