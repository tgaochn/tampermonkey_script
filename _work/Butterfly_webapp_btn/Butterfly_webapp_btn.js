// ==UserScript==
// @name                Butterfly_webapp_btn
// @version             1.5.0
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
// 1.5.0: 所有复制按钮复制后弹 2s 自动消失的 toast 显示复制内容 (需 utils>=0.5.0); 新增 "reuse last job" 按钮 (读最新 SageMaker build 生成 reuse yaml)
// 1.4.1: 支持 SPA 页面内跳转自动更新按钮 (常驻 observer + 按当前 URL 实时判断 + model 变化时重建), 不再需要刷新
// 1.4.0: Rolling deployment 的 model set tag 文字变成指向 hub deployment 页的超链接
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
            "copyToClipboard",
            "showToast",
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

    // ---- Rolling deployment tag -> hub deployment href + loaded_models ------
    // tag 文本形如 triton_rnr_preapply_row_jsv3_prod / _qa
    // 从 tag 派生两个名字 (均可在 ⚙ mapping 对话框里按 tag 覆盖, 默认 = 下面的逻辑):
    //   1. deploy name  (hub deployment 路径末段)
    //        triton_rnr_preapply_row_jsv3 -> genserve-triton-preapply-row-jsv3
    //        (下划线转连字符, 删掉 "rnr" 段, 前面加 genserve-)
    //   2. loaded_models subdomain (loaded_models 页面的子域名)
    //        默认 = "infsp-" + deploy name
    // prod / qa 对应不同域名。改默认规则只改 defaultDeployName() 即可。
    const ROLLING_DEPLOY_MARKER = "data-rolling-deploy-link-added";
    const ROLLING_DEPLOY_MAPPING_KEY = "butterfly_rolling_deploy_mapping"; // GM 存储 key
    const ROLLING_DEPLOY_HOSTS = {
        prod: "https://hub.indeed.tech",
        qa: "https://hub.qa.indeed.tech",
    };
    const LOADED_MODELS_DOMAINS = {
        prod: "sandbox.indeed.net",
        qa: "sandbox.qa.indeed.net",
    };

    // 把 tag 文本拆成 { base, env }; 不符合 *_prod / *_qa 返回 null
    function parseRollingTag(tagText) {
        const m = /^(.*)_(prod|qa)$/.exec(tagText.trim());
        if (!m) return null;
        return { base: m[1], env: m[2] };
    }

    // 默认 deploy name: 下划线转连字符, 删掉 "rnr" 段, 前面加 genserve-
    function defaultDeployName(base) {
        return "genserve-" + base.replace(/_/g, "-").replace(/-rnr(?=-|$)/g, "");
    }

    // ---- 自定义 mapping 的 GM 存储 (参考 CrackedGameLinkOnSteam.js) ----------
    // 结构: { [tagText]: { deploy?: string, loaded?: string } }
    function getRollingMapping() {
        try {
            return JSON.parse(GM_getValue(ROLLING_DEPLOY_MAPPING_KEY, "{}"));
        } catch (e) {
            console.error("Failed to parse rolling-deploy mapping:", e);
            return {};
        }
    }
    function saveRollingMapping(mapping) {
        GM_setValue(ROLLING_DEPLOY_MAPPING_KEY, JSON.stringify(mapping));
    }

    // 某个 tag 当前生效的值 (override 优先, 否则用默认)
    function getRollingEffective(tagText) {
        const p = parseRollingTag(tagText);
        if (!p) return null;
        const defDeploy = defaultDeployName(p.base);
        const defLoaded = "infsp-" + defDeploy;
        const override = getRollingMapping()[tagText] || {};
        return {
            env: p.env,
            defDeploy,
            defLoaded,
            deploy: override.deploy || defDeploy,
            loaded: override.loaded || defLoaded,
            hasOverride: !!(override.deploy || override.loaded),
        };
    }

    function buildHubDeployUrl(env, deploy) {
        return `${ROLLING_DEPLOY_HOSTS[env]}/ai-foundry/infsp/deployments/${deploy}`;
    }
    function buildLoadedModelsUrl(env, loaded) {
        return `https://${loaded}.${LOADED_MODELS_DOMAINS[env]}/private/poodlepants/#!/index/loaded_models_v2`;
    }

    // ⚙ 对话框: 按 tag 自定义 deploy name 和 loaded_models 子域名
    function showRollingMappingDialog(tagText, onSaved) {
        const eff = getRollingEffective(tagText);
        if (!eff) return;

        const overlay = document.createElement("div");
        overlay.style.cssText =
            "position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:100000;";

        const dialog = document.createElement("div");
        dialog.style.cssText =
            "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;" +
            "border:2px solid #333;border-radius:8px;padding:20px;box-shadow:0 4px 20px rgba(0,0,0,0.3);" +
            "z-index:100001;font-family:Arial,sans-serif;min-width:480px;color:#000;";

        const close = () => {
            document.body.removeChild(overlay);
            document.body.removeChild(dialog);
        };

        const mkInput = (value) => {
            const input = document.createElement("input");
            input.type = "text";
            input.value = value;
            input.style.cssText =
                "width:100%;padding:8px;font-size:13px;margin:4px 0;box-sizing:border-box;" +
                "border:1px solid #ccc;border-radius:4px;";
            return input;
        };

        const inputDeploy = mkInput(eff.deploy);
        const inputLoaded = mkInput(eff.loaded);

        const smallBtn = (label, bg) => {
            const b = document.createElement("button");
            b.type = "button";
            b.textContent = label;
            b.style.cssText =
                `background:${bg};color:#fff;border:none;padding:6px 12px;border-radius:4px;` +
                "cursor:pointer;margin-right:8px;font-size:13px;";
            return b;
        };

        const btnSave = smallBtn("Save", "#28a745");
        btnSave.onclick = () => {
            const deploy = inputDeploy.value.trim();
            const loaded = inputLoaded.value.trim();
            const mapping = getRollingMapping();
            // 与默认相同的字段不存, 保持 mapping 精简
            const entry = {};
            if (deploy && deploy !== eff.defDeploy) entry.deploy = deploy;
            if (loaded && loaded !== eff.defLoaded) entry.loaded = loaded;
            if (Object.keys(entry).length) mapping[tagText] = entry;
            else delete mapping[tagText];
            saveRollingMapping(mapping);
            onSaved();
            close();
        };

        // 只把输入框填回默认值, 不保存也不关闭 (之后点 Save 才真正生效)
        const btnReset = smallBtn("Reset to default", "#dc3545");
        btnReset.onclick = () => {
            inputDeploy.value = eff.defDeploy;
            inputLoaded.value = eff.defLoaded;
        };

        const btnCancel = smallBtn("Cancel", "#6c757d");
        btnCancel.onclick = close;

        const label = (text) => {
            const el = document.createElement("div");
            el.textContent = text;
            el.style.cssText = "font-size:13px;font-weight:bold;margin-top:12px;";
            return el;
        };
        const hint = (text) => {
            const el = document.createElement("div");
            el.textContent = text;
            el.style.cssText = "font-size:11px;color:#666;margin:2px 0;";
            return el;
        };

        // 实时预览的 URL 链接 (随输入框内容即时更新, 可点击打开检查)
        const previewLink = () => {
            const a = document.createElement("a");
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.style.cssText =
                "display:block;font-size:11px;color:#0972d3;margin:2px 0 2px;word-break:break-all;text-decoration:underline;";
            return a;
        };
        const previewDeploy = previewLink();
        const previewLoaded = previewLink();

        // 根据两个输入框当前值刷新预览 URL
        const updatePreviews = () => {
            const deployUrl = buildHubDeployUrl(eff.env, inputDeploy.value.trim());
            const loadedUrl = buildLoadedModelsUrl(eff.env, inputLoaded.value.trim());
            previewDeploy.href = deployUrl;
            previewDeploy.textContent = deployUrl;
            previewLoaded.href = loadedUrl;
            previewLoaded.textContent = loadedUrl;
        };
        inputDeploy.addEventListener("input", updatePreviews);
        inputLoaded.addEventListener("input", updatePreviews);

        // Reset 后预览也要跟着回到默认
        const btnResetOrig = btnReset.onclick;
        btnReset.onclick = () => {
            btnResetOrig();
            updatePreviews();
        };

        const title = document.createElement("h3");
        title.textContent = "Custom mapping";
        title.style.cssText = "margin:0 0 4px 0;color:#333;";

        dialog.appendChild(title);
        dialog.appendChild(hint("tag: " + tagText + "  (env: " + eff.env + ")"));

        dialog.appendChild(label("deploy name (hub deployment path):"));
        dialog.appendChild(inputDeploy);
        dialog.appendChild(hint("default: " + eff.defDeploy));
        dialog.appendChild(previewDeploy);

        dialog.appendChild(label("loaded_models subdomain:"));
        dialog.appendChild(inputLoaded);
        dialog.appendChild(hint("default: " + eff.defLoaded));
        dialog.appendChild(previewLoaded);

        updatePreviews(); // 初始填充

        const resetRow = document.createElement("div");
        resetRow.style.marginTop = "8px";
        resetRow.appendChild(btnReset);
        dialog.appendChild(resetRow);

        const btnRow = document.createElement("div");
        btnRow.style.cssText = "margin-top:16px;display:flex;";
        btnRow.append(btnSave, btnCancel);
        dialog.appendChild(btnRow);

        overlay.onclick = close;
        document.body.appendChild(overlay);
        document.body.appendChild(dialog);
        inputDeploy.focus();
    }

    // 处理 Rolling deployment 行里的每个 tag:
    //   - 把文字标签变成指向 hub deployment 的超链接
    //   - 在后面加一组括号: (loaded_models 链接  ⚙ mapping 按钮)
    function addRollingDeploymentLinks() {
        const tags = document.querySelectorAll(
            `.model-set-assignments--pills .model-set-assignments--tag:not([${ROLLING_DEPLOY_MARKER}])`
        );
        tags.forEach((tag) => {
            const labelSpan = tag.firstElementChild; // 文字 span (在 remove 按钮之前)
            if (!labelSpan || labelSpan.tagName !== "SPAN") {
                tag.setAttribute(ROLLING_DEPLOY_MARKER, "true");
                return;
            }
            const tagText = labelSpan.textContent.trim();
            if (!getRollingEffective(tagText)) {
                tag.setAttribute(ROLLING_DEPLOY_MARKER, "true"); // 不符合 pattern, 标记后跳过
                return;
            }

            // 1. 文字标签 -> hub deployment 超链接
            const hubLink = document.createElement("a");
            hubLink.textContent = tagText;
            hubLink.target = "_blank";
            hubLink.rel = "noopener noreferrer";
            hubLink.style.color = "inherit"; // badge 是蓝底白字, 继承原色
            hubLink.style.textDecoration = "underline";
            labelSpan.textContent = "";
            labelSpan.appendChild(hubLink);

            // 2. 括号组: (loaded_models  ⚙)
            const group = document.createElement("span");
            group.style.cssText = "margin-left:4px;margin-right:6px;font-size:12px;white-space:nowrap;";

            const loadedLink = document.createElement("a");
            loadedLink.textContent = "loaded_models";
            loadedLink.target = "_blank";
            loadedLink.rel = "noopener noreferrer";
            loadedLink.style.color = "#0972d3";
            loadedLink.style.textDecoration = "underline";

            const mapBtn = document.createElement("button");
            mapBtn.type = "button";
            mapBtn.textContent = "⚙";
            mapBtn.title = "自定义 mapping";
            mapBtn.style.cssText =
                "margin-left:4px;cursor:pointer;border:1px solid #aaa;border-radius:3px;" +
                "background:#f5f5f5;font-size:11px;line-height:1;padding:1px 4px;";

            group.append(
                document.createTextNode("("),
                loadedLink,
                document.createTextNode(" "),
                mapBtn,
                document.createTextNode(")")
            );

            // 根据当前生效的 mapping 刷新两个链接 (初次 + 对话框保存后都会调用)
            const applyValues = () => {
                const e = getRollingEffective(tagText);
                hubLink.href = buildHubDeployUrl(e.env, e.deploy);
                hubLink.title = e.deploy + (e.hasOverride ? " (自定义)" : "");
                loadedLink.href = buildLoadedModelsUrl(e.env, e.loaded);
                loadedLink.title = e.loaded + (e.hasOverride ? " (自定义)" : "");
                // 有自定义时按钮高亮
                mapBtn.style.background = e.hasOverride ? "#ffe08a" : "#f5f5f5";
            };
            applyValues();

            mapBtn.onclick = () => showRollingMappingDialog(tagText, applyValues);

            tag.insertAdjacentElement("afterend", group);
            tag.setAttribute(ROLLING_DEPLOY_MARKER, "true");
        });
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

    // 当前 model 页头部显示的 model id (SPA 内跳转检测用); 读不到返回 null
    function getCurrentModelId() {
        const el = document.querySelector('div[class="model-view--header-model-name-row"]');
        const inner = el && el.childNodes[0] && el.childNodes[0].childNodes[0];
        return inner ? inner.innerText || null : null;
    }

    // SPA 跳转后最近一次处理的 model id, 用于判断是否跳到了不同的 model
    let lastModelId = null;

    // 处理 model 页: 修复链接 + rolling tag 链接都是幂等的 (靠 marker), 每次都跑;
    // "My Btn to copy" 容器则在 model 变化时删旧重建, 保证按钮数据跟随当前 model。
    function processModelPage(utils) {
        // 先处理 "Model xxx doesn't exist." 提示 (model 不存在时 main 会抛错, 放前面避免被阻断)
        addFixedModelLink();
        addRollingDeploymentLinks(); // Rolling deployment tag -> hub deployment / loaded_models

        const currentModelId = getCurrentModelId();
        if (!currentModelId) return; // 头部还没渲染好
        const table = document.querySelector(".table.table-sm.model-view--table");
        if (!table) return; // 表格还没渲染好

        // SPA 内跳到了不同的 model: 删掉旧按钮行, 用新 model 的数据重建
        const existing = document.getElementById(CONFIG.CONTAINER_ID);
        if (existing && currentModelId !== lastModelId) {
            (existing.closest("tr") || existing).remove();
        }

        if (!document.getElementById(CONFIG.CONTAINER_ID)) {
            lastModelId = currentModelId;
            main(utils);
        }
    }

    async function initScript() {
        try {
            const utils = await waitForUtils();

            // Floating (foldable) toolbar is available on all Butterfly pages
            createModelToolbar(utils);

            // Butterfly 是 React SPA: 页面内跳转不会重新执行脚本, 所以不能只在加载时
            // 判断一次页面类型。改为挂一个常驻 observer, 每次 DOM 变化都按"当前 URL"
            // 重新判断并处理 (debounce 避免频繁扫描)。
            let debounceTimer = null;
            const runProcess = () => {
                if (!utils.shouldRunScript(inclusionPatterns, exclusionPatterns, window.location.href)) {
                    return; // 非 model/proctor 页, 只保留悬浮工具栏
                }
                if (isModelPage()) {
                    processModelPage(utils);
                } else if (isProctorPage()) {
                    mainProctor(utils); // 内部按 marker 幂等, 无匹配时自动 no-op
                }
            };
            const scheduleProcess = () => {
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(runProcess, 300);
            };

            utils.observeDOM(document.body, scheduleProcess);
            runProcess(); // 首屏可能已渲染好, 立即跑一次
        } catch (error) {
            console.error("Failed to initialize:", error);
        }
    }

    // 读取 SageMaker Pipeline Status 行里最后一个 (= 最新) build 的 execution/job id。
    // 每个 build 是 <a id="run-<jobId>" href="...executionArn=...execution%2F<jobId>">,
    // 按时间升序排列, 最后一个即最新。优先用 id 属性, 兜底从 href 的 execution 段解析。
    // 注意: 必须限定在 "SageMaker Pipeline Status" 行内 —— Version Timestamp 行也有同样
    // 的 run-<id> 链接, 全文档匹配会把它算进来。
    function getLastSagemakerJobId() {
        // 定位 "SageMaker Pipeline Status" 行
        let statusRow = null;
        const rows = document.querySelectorAll(".table.table-sm.model-view--table tr");
        for (const tr of rows) {
            const firstCell = tr.querySelector("td");
            if (firstCell && firstCell.textContent.trim().startsWith("SageMaker Pipeline Status")) {
                statusRow = tr;
                break;
            }
        }
        if (!statusRow) return null;

        const runLinks = statusRow.querySelectorAll(
            'a[id^="run-"][href*="/api/sagemaker/runs/presigned-url"]'
        );
        if (!runLinks.length) return null;
        const last = runLinks[runLinks.length - 1];
        const fromId = last.id && last.id.startsWith("run-") ? last.id.slice(4) : "";
        if (fromId) return fromId;
        const m = /execution(?:%2F|\/)([^/?&]+)/i.exec(last.getAttribute("href") || "");
        return m ? decodeURIComponent(m[1]) : null;
    }

    // 生成 reuse yaml 片段 (供 model.yaml 复用上一次 SageMaker 各 step 的产物)
    function buildReuseYaml(modelId, jobId) {
        return [
            "reuse:",
            `  uds_sampler: sm://${modelId}/${jobId}/uds_sampler`,
            `  preprocess: sm://${modelId}/${jobId}/preprocess`,
            `  train: sm://${modelId}/${jobId}/train`,
            `  full_train_parallel: sm://${modelId}/${jobId}/full_train_parallel`,
        ].join("\n");
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
                utils.copyToClipboard(modelVersion);
            }),

            utils.createButtonFromCallback("last_build_id", () => {
                const buildsTags = document.querySelector(buildsTagsSelector).childNodes[0].childNodes;
                const lastBuildId = buildsTags[buildsTags.length - 1].id;
                utils.copyToClipboard(lastBuildId);
            }),

            utils.createButtonFromCallback("all_build_id", () => {
                const buildsTags = document.querySelector(buildsTagsSelector).childNodes[0].childNodes;
                const buildIds = [];

                buildsTags.forEach((div) => {
                    buildIds.push(div.id);
                });

                const textToCopy = buildIds.join("\n");
                utils.copyToClipboard(textToCopy);
            }),

            utils.createButtonFromCallback("reuse last job", () => {
                const jobId = getLastSagemakerJobId();
                if (!jobId) {
                    alert("未找到 SageMaker build job id (SageMaker Pipeline Status 行里没有 build)");
                    return;
                }
                utils.copyToClipboard(buildReuseYaml(modelId, jobId));
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
