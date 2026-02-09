// utils.js
// https://github.com/tgaochn/tampermonkey_script/raw/refs/heads/master/_utils/utils.js
// version: 0.2.5
(function (window) {
    "use strict";

    console.log("Utils script starting to load - v0.2.3");
    const utils = {};
    console.log("utils object created");

    /* !! -------------------------------------------------------------------------- */
    /*                     !! Internal functions - not exposed                       */
    /* !! -------------------------------------------------------------------------- */
    function setSelection(input) {
        const range = document.createRange();
        range.selectNodeContents(input);
        range.collapse(false);
        const sel = window.getSelection();
        if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }

    // claude need <p></p> tags to format the long string into multiple lines
    function claudeLongStringProcessor(longString) {
        let lines = longString.split("\n");
        let formattedLines = lines.map((line) => `<p>${line}</p>`);
        return formattedLines.join("");
    }

    // For Gemini, we'll assume for now it handles plain text with newlines.
    // This might need adjustment based on actual behavior.
    function geminiLongStringProcessor(longString) {
        return longString;
    }

    function sendEnterKey(element) {
        const enterKeyEvent = new KeyboardEvent("keydown", {
            bubbles: true,
            cancelable: true,
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13,
        });
        element.focus();
        element.dispatchEvent(enterKeyEvent);
    }

    /* !! -------------------------------------------------------------------------- */
    /*                            !! Exposed functions - buttons related             */
    /* !! -------------------------------------------------------------------------- */
    utils.setBtnStyle = function (btn) {
        btn.style.backgroundColor = "#009688";
        btn.style.color = "white";
        btn.style.padding = "5px 5px";
        btn.style.fontSize = "14px";
        btn.style.border = "1px solid #ccc";
        btn.style.borderRadius = "4px";
        btn.style.cursor = "pointer";
        btn.style.outline = "none";
        btn.style.boxSizing = "border-box";

        return btn;
    };

    // ! button behaviors
    utils.copyHypertext = function (text, url, leftPart = "", rightPart = "") {
        const hyperlinkElem = document.createElement("a");
        hyperlinkElem.textContent = text;
        hyperlinkElem.href = url;

        const tempContainerElem = document.createElement("span");
        tempContainerElem.appendChild(document.createTextNode(leftPart));
        tempContainerElem.appendChild(hyperlinkElem);
        tempContainerElem.appendChild(document.createTextNode(rightPart));

        tempContainerElem.style.position = "absolute";
        tempContainerElem.style.left = "-9999px";
        document.body.appendChild(tempContainerElem);

        const range = document.createRange();
        range.selectNode(tempContainerElem);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand("copy");
        selection.removeAllRanges();

        document.body.removeChild(tempContainerElem);
    };

    // ! create buttons
    utils.createButtonFromCallback = function (btnText, callbackFunc) {
        let button = document.createElement("button");
        button = utils.setBtnStyle(button);
        button.innerHTML = btnText;
        button.onclick = callbackFunc;
        return button;
    };

    utils.createButtonFromPromptKey = function (
        inputBoxElement,
        prompts,
        promptKey,
        inputProcessorType = "claude",
        mode = "replace"
    ) {
        console.log(
            `[createButtonFromPromptKey] Called with: promptKey=${promptKey}, inputProcessorType=${inputProcessorType}, mode=${mode}`
        );

        const button = document.createElement("button");
        utils.setBtnStyle(button);
        button.textContent = prompts[promptKey].btnNm;
        button.onclick = () => {
            const inputNewCont = prompts[promptKey].prompt;
            if (inputBoxElement && inputBoxElement instanceof HTMLElement) {
                let processedInput = "";
                let useTextContent = false;

                if (inputProcessorType === "claude") {
                    processedInput = claudeLongStringProcessor(inputNewCont);
                } else if (inputProcessorType === "gemini") {
                    processedInput = geminiLongStringProcessor(inputNewCont);
                    useTextContent = true;
                } else {
                    processedInput = inputNewCont;
                }
                console.log(
                    `[createButtonFromPromptKey] processorType: ${inputProcessorType}, useTextContent: ${useTextContent}, processedInput: "${processedInput.substring(
                        0,
                        50
                    )}..."`
                );

                if (mode === "append") {
                    if (useTextContent) {
                        console.log("[createButtonFromPromptKey] Append mode: using textContent for Gemini");
                        const currentContent = inputBoxElement.textContent || "";
                        inputBoxElement.textContent = currentContent + processedInput;
                    } else {
                        console.log("[createButtonFromPromptKey] Append mode: using innerHTML for Claude/default");
                        const currentContent = inputBoxElement.innerHTML;
                        inputBoxElement.innerHTML = currentContent + processedInput;
                    }
                } else {
                    // Replace existing content
                    if (useTextContent) {
                        console.log("[createButtonFromPromptKey] Replace mode: using textContent for Gemini");
                        inputBoxElement.textContent = processedInput;
                    } else {
                        console.log("[createButtonFromPromptKey] Replace mode: using innerHTML for Claude/default");
                        inputBoxElement.innerHTML = processedInput;
                    }
                }
                setSelection(inputBoxElement);
            }

            if (prompts[promptKey].sendOutPrompt) {
                setTimeout(() => {
                    sendEnterKey(inputBoxElement);
                }, 1000);
            }
        };
        return button;
    };

    utils.createTextNode = function (btnText, options = {}) {
        // Handle null/undefined options
        if (!options) {
            options = {};
        }

        // Handle backward compatibility: if second parameter is a string, treat it as color
        if (typeof options === "string") {
            options = { color: options };
        }

        const { color, fontSize, fontWeight, fontStyle, textDecoration } = options;

        // If no styling options provided, return plain text node
        if (!color && !fontSize && !fontWeight && !fontStyle && !textDecoration) {
            return document.createTextNode(btnText);
        }

        // Create a span element to apply styling
        const span = document.createElement("span");
        span.textContent = btnText;

        // Apply styling options
        if (color) span.style.color = color;
        if (fontSize) span.style.fontSize = fontSize;
        if (fontWeight) span.style.fontWeight = fontWeight;
        if (fontStyle) span.style.fontStyle = fontStyle;
        if (textDecoration) span.style.textDecoration = textDecoration;

        return span;
    };

    utils.createButtonCopyText = function (btnText, copyText) {
        return utils.createButtonFromCallback(btnText, () => {
            navigator.clipboard.writeText(copyText);
        });
    };

    utils.createButtonCopyHypertext = function (btnText, pageTitle, curURL) {
        return utils.createButtonFromCallback(btnText, () => {
            utils.copyHypertext(pageTitle, curURL);
        });
    };

    utils.createButtonOpenUrl = function (btnText, targetUrl) {
        return utils.createButtonFromCallback(btnText, () => {
            window.open(targetUrl);
        });
    };

    // ! create button containers
    utils.createButtonContainer = function () {
        const container = document.createElement("div");
        container.style.display = "flex";
        container.style.flexWrap = "wrap";
        container.style.justifyContent = "flex-start";
        container.style.marginTop = "10px";
        container.style.gap = "5px";
        return container;
    };

    utils.createButtonContainerFromJson = function (
        inputBoxElement,
        prompts,
        inputProcessorType = "claude",
        mode = "replace"
    ) {
        const buttonContainer = utils.createButtonContainer();
        for (const promptKey in prompts) {
            buttonContainer.append(
                utils.createButtonFromPromptKey(inputBoxElement, prompts, promptKey, inputProcessorType, mode)
            );
        }
        return buttonContainer;
    };

    // ! add buttons and containers to the page
    utils.addFixedPosContainerToPage = function (container, { top, left }) {
        document.body.appendChild(container);
        container.style.position = "fixed";
        container.style.zIndex = "1000";
        container.style.top = top;
        container.style.left = left;
    };

    utils.addContainerNextToElement1 = function (container, element) {
        element.parentNode.insertBefore(container, element.parentNode.nextSibling);
    };

    utils.addContainerNextToElement2 = function (container, element) {
        element.parentNode.insertBefore(container, element.nextSibling);
    };

    // ! helper functions
    utils.findBestMatch = function (url, patterns) {
        for (const { pattern, title } of patterns) {
            if (pattern.test(url)) {
                return title;
            }
        }
        return "link";
    };

    utils.convertTextToLinks = function (node, patterns) {
        if (node.nodeType === Node.TEXT_NODE) {
            let shouldReplace = false;
            let html = node.textContent;

            patterns.forEach(({ regex, urlTemplate }) => {
                if (regex.test(html)) {
                    shouldReplace = true;
                    html = html.replace(regex, (match, p1) => {
                        const url = urlTemplate.replace("$1", p1);
                        return `<a href="${url}">${match}</a>`;
                    });
                }
            });

            if (shouldReplace) {
                const span = document.createElement("span");
                span.innerHTML = html;
                node.parentNode.replaceChild(span, node);
            }
        } else if (
            node.nodeType === Node.ELEMENT_NODE &&
            !["SCRIPT", "STYLE", "TEXTAREA", "A"].includes(node.tagName)
        ) {
            Array.from(node.childNodes).forEach((child) => utils.convertTextToLinks(child, patterns));
        }
    };

    /* !! -------------------------------------------------------------------------- */
    /*                            !! Exposed functions - storage related             */
    /* !! -------------------------------------------------------------------------- */

    // ! 脚本外部存储变量的编辑框: 支持多行文本
    utils.createMultilineDialog = function (title, currentData, placeholder, dataType = "array") {
        return new Promise((resolve) => {
            // Create modal container
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

            // Create dialog box
            const dialog = document.createElement("div");
            dialog.style.cssText = `
                background: white;
                padding: 20px;
                border-radius: 8px;
                width: 500px;
                max-width: 90%;
            `;

            // Add title
            const titleElement = document.createElement("h3");
            titleElement.textContent = title;
            titleElement.style.marginBottom = "15px";

            // Add textarea
            const textarea = document.createElement("textarea");
            textarea.placeholder = placeholder;
            textarea.style.cssText = `
                width: 100%;
                height: 200px;
                margin-bottom: 15px;
                padding: 8px;
                border: 1px solid #ccc;
                border-radius: 4px;
                resize: vertical;
                font-family: monospace;
            `;

            // Format the initial content based on data type
            if (dataType === "array") {
                textarea.value = Array.isArray(currentData)
                    ? currentData.map((item) => JSON.stringify(item)).join("\n")
                    : String(currentData);
            } else if (dataType === "object") {
                textarea.value = JSON.stringify(currentData, null, 2);
            } else {
                textarea.value = String(currentData);
            }

            // Add buttons
            const buttonContainer = document.createElement("div");
            buttonContainer.style.cssText = `
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            `;

            const saveButton = document.createElement("button");
            saveButton.textContent = "Save";
            saveButton.style.cssText = `
                padding: 8px 16px;
                background: #fb7299;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            `;

            const cancelButton = document.createElement("button");
            cancelButton.textContent = "Cancel";
            cancelButton.style.cssText = `
                padding: 8px 16px;
                background: #e0e0e0;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            `;

            // Parse content based on data type
            function parseContent(content) {
                try {
                    if (dataType === "array") {
                        return content
                            .split("\n")
                            .map((line) => line.trim())
                            .filter((line) => line)
                            .map((line) => {
                                try {
                                    return JSON.parse(line);
                                } catch {
                                    return line;
                                }
                            });
                    } else if (dataType === "object") {
                        return JSON.parse(content);
                    }
                    return content;
                } catch (e) {
                    console.error("Parsing error:", e);
                    throw e;
                }
            }

            function handleSave() {
                try {
                    const value = parseContent(textarea.value);
                    modal.remove();
                    resolve(value);
                } catch (e) {
                    alert("Invalid format. Please check your input.");
                }
            }

            function handleCancel() {
                modal.remove();
                resolve(null);
            }

            saveButton.onclick = handleSave;
            cancelButton.onclick = handleCancel;

            // Close on background click
            modal.onclick = (e) => {
                if (e.target === modal) {
                    handleCancel();
                }
            };

            // Assemble and show dialog
            buttonContainer.appendChild(cancelButton);
            buttonContainer.appendChild(saveButton);
            dialog.appendChild(titleElement);
            dialog.appendChild(textarea);
            dialog.appendChild(buttonContainer);
            modal.appendChild(dialog);
            document.body.appendChild(modal);

            // Focus textarea
            textarea.focus();
        });
    };

    utils.editTitlePatterns = async function (blockedTitlePatterns, GM_setValue) {
        try {
            const currentPatterns = Array.from(blockedTitlePatterns);
            const newPatterns = await utils.createMultilineDialog(
                "编辑标题过滤规则",
                currentPatterns,
                '每行输入一个正则表达式\n例如：\n".*广告.*"\n".*赞助.*"\n".*合作.*"',
                "array"
            );

            if (newPatterns !== null) {
                blockedTitlePatterns.clear();
                newPatterns.forEach((pattern) => {
                    try {
                        new RegExp(pattern);
                        blockedTitlePatterns.add(pattern);
                    } catch (e) {
                        console.error(`Invalid regex pattern: ${pattern}`, e);
                    }
                });
                GM_setValue("blockedTitlePatterns", Array.from(blockedTitlePatterns));
                location.reload();
            }
        } catch (error) {
            console.error("Error in editTitlePatterns:", error);
        }
    };

    /* !! -------------------------------------------------------------------------- */
    /*                            !! Exposed functions - general page                */
    /* !! -------------------------------------------------------------------------- */
    utils.createPageObserver = function (targetId, callback, config = { childList: true, subtree: true }) {
        // ! targetId is the added element's id to avoid duplication (for example, the btnContainer on LLM pages)

        // Disconnect previous observer if exists
        if (window._pageObservers && window._pageObservers[targetId]) {
            window._pageObservers[targetId].disconnect();
        }

        // Initialize observers storage if doesn't exist
        window._pageObservers = window._pageObservers || {};

        const observer = new MutationObserver(async () => {
            const container = document.getElementById(targetId);
            if (container) return; // Exit if container exists

            await callback();
        });

        // Store observer reference for potential cleanup
        window._pageObservers[targetId] = observer;

        observer.observe(document.body, config);

        // Initial check
        if (!document.getElementById(targetId)) {
            callback();
        }

        return observer;
    };

    // For waiting on a single element with one selector
    utils.waitForElement = function (selector, maxAttempts = 10, interval = 500) {
        return new Promise((resolve, reject) => {
            let attempts = 0;

            const checkElement = () => {
                attempts++;
                const element = document.querySelector(selector);

                if (element) {
                    resolve(element);
                } else if (attempts >= maxAttempts) {
                    reject(new Error(`Element "${selector}" not found after ${maxAttempts} attempts`));
                } else {
                    setTimeout(checkElement, interval);
                }
            };

            checkElement();
        });
    };

    // For waiting on multiple different elements, all must exist
    utils.waitForElementList = async function (selectors, maxAttempts = 10, interval = 500) {
        try {
            const elements = await Promise.all(
                selectors.map((selector) => utils.waitForElement(selector, maxAttempts, interval))
            );
            return elements;
        } catch (error) {
            throw new Error(`Failed to find all elements: ${error.message}`);
        }
    };

    // For waiting on one element that might have different selectors in different contexts
    utils.waitForAliasedElement = async function (selectors, maxAttempts = 10, interval = 500) {
        for (let attempts = 0; attempts < maxAttempts; attempts++) {
            for (const selector of selectors) {
                try {
                    const element = await utils.waitForElement(selector, 1, 0); // Quick check
                    if (element) return element;
                } catch (e) {
                    continue; // Try next selector
                }
            }
            await new Promise((resolve) => setTimeout(resolve, interval));
        }
        throw new Error(
            `None of the aliased selectors "${selectors.join('", "')}" found after ${maxAttempts} attempts`
        );
    };

    // 节流函数，防止过于频繁的调用
    utils.throttle = function (func, delay) {
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
    };

    // button 的 observeDOM
    utils.observeDOM = function (targetNode, onAddCallback, onRemoveCallback) {
        if (!targetNode || !(targetNode instanceof Node)) return;
        const MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
        const eventListenerSupported = window.addEventListener;

        if (MutationObserver) {
            const mutationObserver = new MutationObserver(function (mutations, observer) {
                const hasAddedNodes = mutations.length > 0 && mutations.some((m) => m.addedNodes && m.addedNodes.length > 0);
                if (hasAddedNodes && onAddCallback) {
                    onAddCallback();
                }
            });

            mutationObserver.observe(targetNode, {
                childList: true,
                subtree: true,
            });
        } else if (eventListenerSupported) {
            targetNode.addEventListener("DOMNodeInserted", onAddCallback, { once: true });
        }
    };

    // 带节流函数的 observeDOM, 防止过于频繁的调用
    utils.observeDOMWithThrottle = function (
        targetNode,
        callback,
        config = {
            childList: true,
            subtree: true,
        },
        throttleDelay = 400
    ) {
        // Throttle the callback
        const throttledCallback = utils.throttle(callback, throttleDelay);

        // Create observer
        const observer = new MutationObserver(throttledCallback);

        // Start observing
        observer.observe(targetNode, config);

        // Return the observer for potential cleanup
        return observer;
    };

    // 监听 URL 变化并执行回调函数, 防止因为 URL 变化导致功能失效
    // (Legacy function using polling, prefer onUrlChange for better performance)
    utils.monitorUrlChanges = function (callback, interval = 500) {
        let lastUrl = window.location.href;

        // 返回清理函数，方便在需要时停止监听
        const intervalId = setInterval(() => {
            const currentUrl = window.location.href;
            if (lastUrl !== currentUrl) {
                console.log("URL changed from", lastUrl, "to", currentUrl);

                // 先保存旧URL，再更新lastUrl
                const oldUrl = lastUrl;
                lastUrl = currentUrl;

                // 执行回调，传递正确的新URL和旧URL
                callback(currentUrl, oldUrl);
            }
        }, interval);

        // 返回清理函数和当前 URL
        return {
            stop: () => clearInterval(intervalId),
            currentUrl: lastUrl,
        };
    };

    // Enhanced URL change detection for SPA navigation
    // Uses History API interception + popstate + MutationObserver for comprehensive detection
    utils.onUrlChange = function (callback, options = {}) {
        const {
            debounceDelay = 100,  // Delay before triggering callback (ms)
            debug = false,        // Enable debug logging
        } = options;

        let lastUrl = window.location.href;
        let debounceTimer = null;

        const debugLog = (emoji, message, ...args) => {
            if (debug) {
                console.log(`${emoji} [onUrlChange] ${message}`, ...args);
            }
        };

        // Debounced URL check and callback trigger
        const checkUrlChange = (source) => {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }

            debounceTimer = setTimeout(() => {
                const currentUrl = window.location.href;
                if (currentUrl !== lastUrl) {
                    const oldUrl = lastUrl;
                    lastUrl = currentUrl;
                    debugLog("🔄", `URL changed (${source}):`, oldUrl, "→", currentUrl);
                    callback(currentUrl, oldUrl);
                }
            }, debounceDelay);
        };

        // 1. Listen for popstate events (browser back/forward buttons)
        const popstateHandler = () => {
            debugLog("🔙", "Popstate event detected");
            checkUrlChange("popstate");
        };
        window.addEventListener("popstate", popstateHandler);

        // 2. Intercept History API (pushState/replaceState) - only once globally
        if (!window._utilsHistoryIntercepted) {
            window._utilsHistoryIntercepted = true;
            window._utilsHistoryCallbacks = [];

            const originalPushState = history.pushState;
            const originalReplaceState = history.replaceState;

            history.pushState = function (...args) {
                originalPushState.apply(this, args);
                window._utilsHistoryCallbacks.forEach(cb => cb("pushState"));
            };

            history.replaceState = function (...args) {
                originalReplaceState.apply(this, args);
                window._utilsHistoryCallbacks.forEach(cb => cb("replaceState"));
            };
        }

        // Register this instance's callback for History API changes
        const historyCallback = (source) => {
            debugLog("➡️", `${source} detected`);
            checkUrlChange(source);
        };
        window._utilsHistoryCallbacks.push(historyCallback);

        // 3. MutationObserver as fallback for other SPA navigation methods
        const observer = new MutationObserver(() => {
            checkUrlChange("mutation");
        });
        observer.observe(document.body, { childList: true, subtree: true });

        debugLog("👀", "URL change listener started, initial URL:", lastUrl);

        // Return cleanup function
        return {
            stop: () => {
                window.removeEventListener("popstate", popstateHandler);
                
                // Remove from History callbacks
                const index = window._utilsHistoryCallbacks.indexOf(historyCallback);
                if (index > -1) {
                    window._utilsHistoryCallbacks.splice(index, 1);
                }
                
                observer.disconnect();
                
                if (debounceTimer) {
                    clearTimeout(debounceTimer);
                }
                
                debugLog("🛑", "URL change listener stopped");
            },
            getCurrentUrl: () => lastUrl,
        };
    };

    // decide whether to run the script based on inclusion and exclusion patterns
    utils.shouldRunScript = function (inclusionPatterns, exclusionPatterns, url) {
        if (inclusionPatterns.length > 0 && !inclusionPatterns.some((pattern) => pattern.test(url))) {
            return false;
        }
        if (exclusionPatterns.length > 0 && exclusionPatterns.some((pattern) => pattern.test(url))) {
            return false;
        }
        return true;
    };

    utils.debounce = function (func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    /* !! -------------------------------------------------------------------------- */
    /*                   !! Exposed functions - text content changer                 */
    /* !! -------------------------------------------------------------------------- */
    
    // Helper function to check if node is already colored
    function isAlreadyColored(node) {
        return node.parentNode &&
            node.parentNode.tagName === 'SPAN' &&
            (node.parentNode.style.backgroundColor || node.parentNode.style.color);
    }

    // Main function to change text color/content based on patterns
    function changeTextColor(node, currentUrlPatterns) {
        if (!currentUrlPatterns) return;

        // Skip already processed nodes
        if (node.hasAttribute && node.hasAttribute('data-colored')) return;

        if (node.nodeType === 3 && !isAlreadyColored(node)) { // Text node and not already colored
            let content = node.textContent.trim();
            if (!content) return; // Skip empty text nodes

            for (const pattern of currentUrlPatterns.textPatterns) {
                pattern.regex.lastIndex = 0;

                // Check if pattern matches
                const match = pattern.regex.exec(content);
                if (match) {
                    // Reset regex lastIndex for global patterns
                    pattern.regex.lastIndex = 0;
                    
                    // Check if need replacement or coloring
                    const needsReplacement = !!pattern.replacement;
                    const needsColoring = !!pattern.textColor || !!pattern.backColor;

                    if (needsReplacement || needsColoring) {
                        // Set content, use replacement text if available
                        if (pattern.replacement) {
                            // Call replacement function or use string replacement
                            let replacedContent;
                            if (typeof pattern.replacement === 'function') {
                                replacedContent = pattern.replacement.apply(null, match);
                            } else {
                                replacedContent = content.replace(pattern.regex, pattern.replacement);
                            }
                            
                            // Check if replacement function returned a structured multi-part object
                            if (typeof replacedContent === 'object' && replacedContent.isMultiPart) {
                                // Handle multi-part replacement with individual styling
                                const container = document.createElement("span");
                                container.setAttribute('data-colored', 'true');
                                
                                replacedContent.parts.forEach(part => {
                                    if (part.textColor || part.backColor) {
                                        // Create styled span for this part
                                        const partSpan = document.createElement("span");
                                        if (part.textColor) {
                                            partSpan.style.color = part.textColor;
                                        }
                                        if (part.backColor) {
                                            partSpan.style.backgroundColor = part.backColor;
                                        }
                                        partSpan.textContent = part.text;
                                        container.appendChild(partSpan);
                                    } else {
                                        // Add unstyled text node
                                        container.appendChild(document.createTextNode(part.text));
                                    }
                                });
                                
                                node.parentNode.replaceChild(container, node);
                            } else {
                                // Regular string replacement with pattern-level styling
                                const span = document.createElement("span");
                                span.textContent = replacedContent;
                                
                                // Apply pattern-level styling
                                if (pattern.textColor) {
                                    span.style.color = pattern.textColor;
                                }
                                if (pattern.backColor) {
                                    span.style.backgroundColor = pattern.backColor;
                                }
                                
                                span.setAttribute('data-colored', 'true');
                                node.parentNode.replaceChild(span, node);
                            }
                        } else {
                            // No replacement, just apply pattern-level styling
                            const span = document.createElement("span");
                            span.textContent = content;
                            
                            // Apply pattern-level styling
                            if (pattern.textColor) {
                                span.style.color = pattern.textColor;
                            }
                            if (pattern.backColor) {
                                span.style.backgroundColor = pattern.backColor;
                            }
                            
                            span.setAttribute('data-colored', 'true');
                            node.parentNode.replaceChild(span, node);
                        }
                    }
                    break;
                }
            }
        } else if (node.nodeType === 1) { // Element node
            // Skip certain elements
            const skipTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT'];
            if (skipTags.includes(node.tagName)) return;

            // Process child nodes
            Array.from(node.childNodes).forEach(child => {
                changeTextColor(child, currentUrlPatterns);
            });
        }
    }

    // Initialize text content changer with URL patterns
    // Automatically handles SPA navigation (URL changes without page reload)
    utils.initTextContentChanger = async function(urlPatterns, options = {}) {
        // Support both array and object formats for backward compatibility
        const patternsArray = Array.isArray(urlPatterns) ? urlPatterns : Object.values(urlPatterns);
        
        // Helper to check if urlRegex matches (supports both single regex and array of regexes)
        const isUrlMatch = (urlRegex, url) => {
            if (Array.isArray(urlRegex)) {
                return urlRegex.some((regex) => regex.test(url));
            }
            return urlRegex.test(url);
        };

        // Store the current observer for cleanup
        let currentObserver = null;
        let urlChangeWatcher = null;

        // Function to apply text changes for current URL
        const applyTextChanges = (url) => {
            try {
                const observeTarget = document.body;
                if (!observeTarget) return;

                // Find matching patterns for current URL
                const matchedPatterns = patternsArray.filter((urlPattern) =>
                    isUrlMatch(urlPattern.urlRegex, url)
                );

                if (matchedPatterns.length === 0) return;

                const debouncedColorChange = utils.debounce(() => {
                    matchedPatterns.forEach((pattern) => {
                        changeTextColor(observeTarget, pattern);
                    });
                }, 300);

                // Apply immediately
                debouncedColorChange();

                // Delayed retries for dynamically loaded content (e.g. igg-games.com loads links via JS)
                [1000, 3000, 6000, 10000].forEach((delay) => {
                    setTimeout(debouncedColorChange, delay);
                });
                // Also run on load event (handles cached/bfcache page restore)
                window.addEventListener("load", debouncedColorChange, { once: true });
                window.addEventListener("pageshow", (e) => {
                    if (e.persisted) debouncedColorChange(); // bfcache restore
                });
                
                // Observe DOM for dynamic content
                utils.observeDOM(document.body, debouncedColorChange);
            } catch (error) {
                console.error("Failed to apply text changes:", error);
            }
        };

        // Apply text changes - wait for document.body (script may run before DOM ready)
        const runWhenReady = () => {
            if (document.body) {
                applyTextChanges(window.location.href);
            } else {
                if (document.readyState === "loading") {
                    document.addEventListener("DOMContentLoaded", runWhenReady, { once: true });
                } else {
                    setTimeout(runWhenReady, 100);
                }
            }
        };
        runWhenReady();

        // Set up URL change detection for SPA navigation
        urlChangeWatcher = utils.onUrlChange((newUrl) => applyTextChanges(newUrl));

        return {
            stop: () => {
                if (urlChangeWatcher) urlChangeWatcher.stop();
            }
        };
    };

    /* !! -------------------------------------------------------------------------- */
    /*                   !! Exposed functions - AddBtn2AnyWebsite                    */
    /* !! -------------------------------------------------------------------------- */
    
    // Function to apply path segment mappings
    function applyPathSegmentMapping(pathSegment, pathSegmentMappings) {
        if (!pathSegment || !pathSegmentMappings) return pathSegment;

        for (const mapping of pathSegmentMappings) {
            if (mapping.regex.test(pathSegment)) {
                return mapping.replacement;
            }
        }

        return pathSegment; // Return original if no mapping found
    }

    // Function to extract path segment from URL (last segment before query params)
    function extractPathSegment(url, pathSegmentMappings) {
        try {
            const urlObj = new URL(url);
            const pathSegments = urlObj.pathname.split("/").filter((segment) => segment.length > 0);
            const lastSegment = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : null;
            return applyPathSegmentMapping(lastSegment, pathSegmentMappings);
        } catch (error) {
            console.error("Error parsing URL:", error);
            return null;
        }
    }

    // Function to generate dynamic title based on URL
    function generateDynamicTitle(url, baseTitle, customParser, pathSegmentMappings) {
        if (customParser && typeof customParser === "function") {
            const customResult = customParser(url);
            if (customResult) {
                // Handle both string and object returns from custom parsers
                if (typeof customResult === "object" && customResult.displayTitle) {
                    return customResult.displayTitle;
                } else if (typeof customResult === "string") {
                    return customResult;
                } else {
                    return `${customResult}`;
                }
            }
            return baseTitle;
        }

        const pathSegment = extractPathSegment(url, pathSegmentMappings);
        return pathSegment ? `${pathSegment}` : baseTitle;
    }

    // Helper function to create default button set for a given URL and config
    function createDefaultButtons(url, config, matchedConfig, pathSegmentMappings, jumpButtonMappings) {
        const buttonElements = [
            // Button: copy url
            utils.createButtonCopyText("url", url),
        ];

        if (!matchedConfig) {
            return buttonElements;
        }

        let pageTitle = config.DEFAULT_TITLE;
        let fixedTitle = matchedConfig.title || config.DEFAULT_TITLE;
        let dynamicTitle = config.DEFAULT_TITLE;
        let testName = null; // Store the original segment for jump buttons

        if (matchedConfig.dynamicTitle) {
            // Get the full result from custom parser or default logic
            let fullResult = null;
            if (matchedConfig.customParser && typeof matchedConfig.customParser === "function") {
                fullResult = matchedConfig.customParser(url);
            }

            if (fullResult && typeof fullResult === "object" && fullResult.displayTitle) {
                // New format: { displayTitle, rawSegment }
                dynamicTitle = fullResult.displayTitle;
                testName = fullResult.rawSegment;
            } else {
                // Fall back to generateDynamicTitle for string results or default logic
                dynamicTitle = generateDynamicTitle(url, matchedConfig.title, matchedConfig.customParser, pathSegmentMappings);
            }
            pageTitle = dynamicTitle; // Default to dynamic title
        } else {
            pageTitle = fixedTitle;
            dynamicTitle = fixedTitle; // Fallback to fixed title
        }

        // Get text color for this URL
        const textColor = matchedConfig.textColor || null;

        // Check if titles are too long for display (but keep full title for copying)
        const dynamicDisplayTitle =
            dynamicTitle && dynamicTitle.length <= config.MAX_DISPLAY_LENGTH ? dynamicTitle : "{title}";
        const rawDisplayTitle = testName && testName.length <= config.MAX_DISPLAY_LENGTH
            ? testName
            : testName ? `{${testName.substring(0, config.MAX_DISPLAY_LENGTH / 2)}...}` : null;

        // ! Add title-based buttons
        if (matchedConfig.showBothTitles) {
            // Add href section
            buttonElements.push(utils.createTextNode("\thref: ", textColor));
            buttonElements.push(utils.createButtonCopyHypertext(`${fixedTitle}`, fixedTitle, url));
            if (testName) {
                buttonElements.push(utils.createButtonCopyHypertext(`${rawDisplayTitle}`, testName, url));
            }
            if (dynamicTitle !== fixedTitle) {
                buttonElements.push(utils.createButtonCopyHypertext(`${dynamicDisplayTitle}`, dynamicTitle, url));
            }
            
            // Add md section
            buttonElements.push(utils.createTextNode("\tmd: ", textColor));
            buttonElements.push(utils.createButtonCopyText(`[${fixedTitle}](url)`, `[${fixedTitle}](${url})`));
            if (testName) {
                buttonElements.push(utils.createButtonCopyText(`[${rawDisplayTitle}](url)`, `[${testName}](${url})`));
            }
            if (dynamicTitle !== fixedTitle) {
                buttonElements.push(utils.createButtonCopyText(`[${dynamicDisplayTitle}](url)`, `[${dynamicTitle}](${url})`));
            }
        } else {
            // Show single set of buttons with the determined title
            buttonElements.push(
                utils.createTextNode("\thref: ", textColor),
                utils.createButtonCopyHypertext(`${pageTitle}`, pageTitle, url),
                utils.createTextNode("\tmd: ", textColor),
                utils.createButtonCopyText(`[${pageTitle}](url)`, `[${pageTitle}](${url})`)
            );
        }

        // ! add jump button
        const jumpButtons = [utils.createTextNode("\tjump: ", textColor)];

        // Check for jump button mapping and add corresponding buttons
        if (jumpButtonMappings) {
            const jumpMapping = jumpButtonMappings.find((mapping) => mapping.pattern.test(url));
            if (jumpMapping) {
                // Use testName if available, otherwise fall back to dynamicTitle
                const segmentForJump = testName || dynamicTitle;
                const additionalJumpButtons = jumpMapping.jumpButtons(url, utils, textColor, segmentForJump);
                jumpButtons.push(...additionalJumpButtons);
            }
        }

        // Add jump buttons to the main button elements if any jump buttons exist
        if (jumpButtons.length > 1) {
            // More than just the text node
            buttonElements.push(...jumpButtons);
        }

        return buttonElements;
    }

    // Main function for AddBtn2AnyWebsite
    async function addBtn2AnyWebsiteMain(config, customButtonMappings, url2title, pathSegmentMappings, jumpButtonMappings) {
        const curURL = window.location.href;
        const btnContainer = utils.createButtonContainer();
        const btnSubContainer1 = utils.createButtonContainer();

        btnContainer.id = config.CONTAINER_ID;
        btnContainer.appendChild(btnSubContainer1);
        btnContainer.style.display = "flex";
        btnContainer.style.flexDirection = "column"; // container arranged vertically

        // Check for custom button mapping first
        const customMapping = customButtonMappings ? customButtonMappings.find((mapping) => mapping.pattern.test(curURL)) : null;

        let buttonElements = [];
        let buttonPosition = config.BUTTON_POSITION;

        if (customMapping) {
            // Use custom buttons for this URL pattern
            console.log("Using custom button mapping for URL:", curURL);
            buttonElements = customMapping.customButtons(curURL, utils);
            buttonPosition = customMapping.buttonPosition || config.BUTTON_POSITION;
        } else {
            // Use default button logic
            console.log("Using default button logic for URL:", curURL);

            // Get matched URL config and generate titles
            const matchedConfig = url2title.find((config) => config.pattern.test(curURL));

            // Create default button elements
            buttonElements = createDefaultButtons(curURL, config, matchedConfig, pathSegmentMappings, jumpButtonMappings);

            // Use custom position if specified in matchedConfig, otherwise use default position
            buttonPosition =
                matchedConfig && matchedConfig.buttonPosition ? matchedConfig.buttonPosition : config.BUTTON_POSITION;
        }

        // ! add buttons in the containers
        btnSubContainer1.append(...buttonElements);

        // Apply the determined button position
        utils.addFixedPosContainerToPage(btnContainer, buttonPosition);
    }

    // Initialize AddBtn2AnyWebsite with configuration
    utils.initAddBtn2AnyWebsite = async function(config) {
        try {
            const {
                CONFIG,
                customButtonMappings,
                url2title,
                pathSegmentMappings,
                jumpButtonMappings,
                inclusionPatterns,
                exclusionPatterns,
            } = config;

            if (!utils.shouldRunScript(inclusionPatterns || [], exclusionPatterns || [], window.location.href)) {
                return;
            }

            const targetElementId = CONFIG.CONTAINER_ID;

            // Helper function to create buttons if container doesn't exist
            const createButtonsIfNeeded = () => {
                if (!document.getElementById(targetElementId)) {
                    addBtn2AnyWebsiteMain(CONFIG, customButtonMappings, url2title, pathSegmentMappings, jumpButtonMappings);
                }
            };

            // Initial check - create buttons immediately if container doesn't exist
            createButtonsIfNeeded();

            // Set up observer for future DOM changes
            utils.observeDOM(document.body, createButtonsIfNeeded);

            // Start periodic check to handle cases where container disappears after page load
            // Some websites (e.g., AWS console) re-render after initial load, removing the button container
            const checkInterval = CONFIG.PERIODIC_CHECK_INTERVAL || 2000;
            setInterval(createButtonsIfNeeded, checkInterval);
        } catch (error) {
            console.error("Failed to initialize AddBtn2AnyWebsite:", error);
        }
    };

    /* !! -------------------------------------------------------------------------- */
    /*                            !! Expose all the functions and log                */
    /* !! -------------------------------------------------------------------------- */

    window.utils = utils;
})(window);
