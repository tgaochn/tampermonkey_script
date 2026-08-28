// ==UserScript==
// @name                Butterfly_webapp_btn
// @version             1.3.0
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
// 1.3.0: 添加了model不存在时的修复链接
// 1.2.0: make "Go to Model" button draggable (position persisted via GM storage); default position centered + refactoring
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
        DEBUG: false, // set true to enable verbose console logging
        UTILS_TIMEOUT: 10000,
        CONTAINER_ID: "container_id",
        PROCTOR_BTN_MARKER: "data-butterfly-btn-added",
        BASE_URL: "https://butterfly.sandbox.indeed.net",
        MODEL_JUMP_BTN_ID: "butterfly-model-jump-btn",
        MODEL_JUMP_BTN_POS_KEY: "butterfly_model_jump_btn_pos", // GM storage key for persisted position
        MODEL_TOOLBAR_FOLD_KEY: "butterfly_model_toolbar_folded", // GM storage key for persisted fold state
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
            "createDraggableButton",
            "createDraggableButtonGroup",
            "createInputDialog",
        ],
    };

    const modelPagePatterns = [/^https:\/\/butterfly\.sandbox\.indeed\.net\/(#\/)?model.*$/];
    const proctorPagePatterns = [/^https:\/\/butterfly\.sandbox\.indeed\.net\/proctor\/.*$/];
    const inclusionPatterns = [...modelPagePatterns, ...proctorPagePatterns];

    const exclusionPatterns = [];

    // Verbose logger gated by CONFIG.DEBUG (errors still use console.error directly)
    function dbg(...args) {
        if (CONFIG.DEBUG) console.log(...args);
    }

    // Wait for utils to load
    function waitForUtils(timeout = CONFIG.UTILS_TIMEOUT) {
        dbg("Starting to wait for utils...");
        const requiredFunctions = CONFIG.REQUIRED_UTILS;

        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            function checkUtils() {
                dbg("Checking utils:", window.utils);
                dbg("Available functions:", window.utils ? Object.keys(window.utils) : "none");

                if (
                    window.utils &&
                    requiredFunctions.every((func) => {
                        const hasFunc = typeof window.utils[func] === "function";
                        dbg(`Checking function ${func}:`, hasFunc);
                        return hasFunc;
                    })
                ) {
                    dbg("All required functions found");
                    resolve(window.utils);
                } else if (Date.now() - startTime >= timeout) {
                    const missingFunctions = requiredFunctions.filter(
                        (func) => !window.utils || typeof window.utils[func] !== "function"
                    );
                    dbg("Timeout reached. Missing functions:", missingFunctions);
                    reject(new Error(`Timeout waiting for utils. Missing functions: ${missingFunctions.join(", ")}`));
                } else {
                    dbg("Not all functions available yet, checking again in 100ms");
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

    // Build the model PUBLISHED config URL from a model name
    function buildModelConfigUrl(name) {
        return `${CONFIG.BASE_URL}/model/${encodeURIComponent(name)}/PUBLISHED/config/`;
    }

    // 翻转 model name 里的连接符: 含 "-" 则全部改成 "_", 否则全部改成 "-"
    function flipSeparators(name) {
        return name.includes("-") ? name.replace(/-/g, "_") : name.replace(/_/g, "-");
    }

    // "Model <name> doesn't exist." 提示的检测与修正
    const MODEL_NOT_FOUND_MARKER = "data-model-fix-added";
    // 支持直引号 ' 和弯引号 ’
    const MODEL_NOT_FOUND_RE = /Model\s+([A-Za-z0-9._-]+)\s+doesn['’]t exist\./;

    // 生成指向修正后 model config 页的超链接元素
    function makeFixedModelLink(fixedName, fixedUrl) {
        const link = document.createElement("a");
        link.href = fixedUrl;
        link.textContent = fixedName;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.style.color = "#0972d3";
        link.style.textDecoration = "underline";
        return link;
    }

    // 检测页面上 "Model <name> doesn't exist." 的提示, 提取 model name, 翻转连接符,
    // 在原文的 name 之后插入一个指向修正后 model 的超链接:
    //   Model preapply-hp-row-49e4613 doesn't exist.
    //   -> Model preapply-hp-row-49e4613 (preapply_hp_row_49e4613) doesn't exist.
    //
    // 注意: Butterfly 是 React 页面, 整句可能被拆成多个文本节点 (model name 常被单独
    // 包在子元素里), 因此这里在“元素”层面用 textContent 匹配整句, 再在后代文本节点里
    // 按 name 定位插入, 以兼容跨节点的情况。
    function addFixedModelLink() {
        const elements = document.body.querySelectorAll("*");
        for (const el of elements) {
            const tag = el.tagName;
            if (tag === "SCRIPT" || tag === "STYLE") continue;
            if (el.hasAttribute(MODEL_NOT_FOUND_MARKER)) continue;

            const tc = el.textContent;
            if (!tc || tc.indexOf("exist") === -1) continue; // 便宜的预筛
            const m = MODEL_NOT_FOUND_RE.exec(tc);
            if (!m) continue;

            // 只处理“最内层”包含整句的元素 (避免在祖先上重复插入)
            let deeper = false;
            for (const child of el.children) {
                if (MODEL_NOT_FOUND_RE.test(child.textContent || "")) {
                    deeper = true;
                    break;
                }
            }
            if (deeper) continue;

            const name = m[1];
            const fixedName = flipSeparators(name);
            const fixedUrl = buildModelConfigUrl(fixedName);

            // 在 el 的后代文本节点里找到含 name 的那个, 在 name 之后插入 " (<link>)"
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
            let inserted = false;
            let tn;
            while ((tn = walker.nextNode())) {
                const idx = tn.nodeValue ? tn.nodeValue.indexOf(name) : -1;
                if (idx === -1) continue;
                const insertPos = idx + name.length;
                const before = tn.nodeValue.slice(0, insertPos);
                const after = tn.nodeValue.slice(insertPos);

                const frag = document.createDocumentFragment();
                frag.appendChild(document.createTextNode(before + " ("));
                frag.appendChild(makeFixedModelLink(fixedName, fixedUrl));
                frag.appendChild(document.createTextNode(")" + after));
                tn.parentNode.replaceChild(frag, tn);
                inserted = true;
                break;
            }

            // 兜底: 没找到含 name 的单一文本节点 (name 被进一步拆分), 直接在句末追加链接
            if (!inserted) {
                el.appendChild(document.createTextNode(" ("));
                el.appendChild(makeFixedModelLink(fixedName, fixedUrl));
                el.appendChild(document.createTextNode(")"));
            }

            el.setAttribute(MODEL_NOT_FOUND_MARKER, "true");
        }
    }

    // GM-backed storage adapter so the button position persists via Tampermonkey storage
    const gmStorageAdapter = {
        get: (key) => {
            try {
                const raw = GM_getValue(key, null);
                if (!raw) return null;
                return typeof raw === "string" ? JSON.parse(raw) : raw;
            } catch (e) {
                console.error("Failed to load button position:", e);
                return null;
            }
        },
        set: (key, value) => {
            try {
                GM_setValue(key, JSON.stringify(value));
            } catch (e) {
                console.error("Failed to save button position:", e);
            }
        },
    };

    // Dialog to input a model name and jump to its LATEST overview page
    function createModelJumpDialog(utils) {
        const jump = (api, opener) => {
            const name = api.value();
            if (!name) {
                api.showError("Please enter a model name");
                return;
            }
            api.close();
            opener(buildModelOverviewUrl(name));
        };

        // 把 model name 里的所有连接符 (- 和 _) 统一替换成 sep, 结果写回输入框
        const normalizeSeparators = (api, sep) => {
            api.input.value = api.input.value.replace(/[-_]/g, sep);
            api.clearError();
            api.input.focus();
        };

        utils.createInputDialog({
            title: "Go to Model",
            description: "Enter model name to open its LATEST overview page",
            placeholder: "model-name",
            enterButton: "Go",
            buttons: [
                { label: "Cancel", kind: "cancel", onClick: (api) => api.close() },
                { label: "format with -", kind: "secondary", onClick: (api) => normalizeSeparators(api, "-") },
                { label: "format with _", kind: "secondary", onClick: (api) => normalizeSeparators(api, "_") },
                {
                    label: "Open in New Tab",
                    kind: "accent",
                    onClick: (api) => jump(api, (url) => window.open(url, "_blank", "noopener,noreferrer")),
                },
                {
                    label: "Go",
                    kind: "primary",
                    onClick: (api) => jump(api, (url) => { window.location.href = url; }),
                },
            ],
        });
    }

    // Floating (draggable + foldable) toolbar of buttons, available on all Butterfly pages
    function createModelToolbar(utils) {
        utils.createDraggableButtonGroup({
            id: CONFIG.MODEL_JUMP_BTN_ID,
            storageKey: CONFIG.MODEL_JUMP_BTN_POS_KEY,
            foldStorageKey: CONFIG.MODEL_TOOLBAR_FOLD_KEY,
            storage: gmStorageAdapter,
            defaultPosition: "top-center",
            threshold: CONFIG.MODEL_JUMP_DRAG_THRESHOLD,
            buttons: [
                {
                    label: "Go to Model",
                    title: "输入 model name 跳转到 LATEST overview 页面",
                    onClick: () => createModelJumpDialog(utils),
                },
            ],
        });
    }

    async function initScript() {
        try {
            const utils = await waitForUtils();

            // Floating (foldable) toolbar is available on all Butterfly pages
            createModelToolbar(utils);

            if (!utils.shouldRunScript(inclusionPatterns, exclusionPatterns, window.location.href)) {
                return;
            }

            const observeTarget = document.body;

            if (isModelPage()) {
                const targetElementId = CONFIG.CONTAINER_ID;
                utils.observeDOM(observeTarget, () => {
                    // 先处理 "Model xxx doesn't exist." 提示 (main 在 model 不存在时会抛错, 放前面避免被阻断)
                    addFixedModelLink();
                    if (!document.getElementById(targetElementId)) {
                        main(utils);
                    }
                });
                addFixedModelLink(); // 立即尝试一次 (错误提示可能已渲染)
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
