// utils.js
(function (window) {
    "use strict";

    console.log("Utils script starting to load");
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

    utils.createButtonFromPromptKey = function (inputBoxElement, prompts, promptKey, inputProcessorType = "claude", mode = "replace") {
        const button = document.createElement("button");
        utils.setBtnStyle(button);
        button.innerHTML = prompts[promptKey].btnNm;
        button.onclick = () => {
            const inputNewCont = prompts[promptKey].prompt;
            if (inputBoxElement && inputBoxElement instanceof HTMLElement) {
                let processedInput = "";
                if (inputProcessorType === "claude") {
                    processedInput = claudeLongStringProcessor(inputNewCont);
                } else if (inputProcessorType === "gemini") {
                    processedInput = geminiLongStringProcessor(inputNewCont);
                } else {
                    // Default or error handling
                    processedInput = inputNewCont; 
                }

                if (mode === "append") {
                    // Append new content to existing content
                    const currentContent = inputBoxElement.innerHTML;
                    // Ensure the appended content is also processed if needed, though current use case might not require it for append.
                    // For simplicity, directly concatenating. If complex appends are needed, this might need review.
                    inputBoxElement.innerHTML = currentContent + processedInput; 
                } else {
                    // Replace existing content (default behavior)
                    inputBoxElement.innerHTML = processedInput;
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

    utils.createTextNode = function (btnText) {
        return document.createTextNode(btnText);
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
        container.style.display = "inline-block";
        container.style.justifyContent = "center";
        container.style.marginTop = "10px";
        container.style.marginLeft = "10px";
        return container;
    };

    utils.createButtonContainerFromJson = function (inputBoxElement, prompts, inputProcessorType = "claude", mode = "replace") {
        const buttonContainer = utils.createButtonContainer();
        for (const promptKey in prompts) {
            buttonContainer.append(utils.createButtonFromPromptKey(inputBoxElement, prompts, promptKey, inputProcessorType, mode));
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
        const MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
        const eventListenerSupported = window.addEventListener;

        if (MutationObserver) {
            const mutationObserver = new MutationObserver(function (mutations, observer) {
                if (mutations[0].addedNodes.length && onAddCallback) {
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
    /*                            !! Expose all the functions and log                */
    /* !! -------------------------------------------------------------------------- */

    window.utils = utils;
})(window);
