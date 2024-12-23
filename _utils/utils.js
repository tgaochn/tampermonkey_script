// utils.js
(function (window) {
    "use strict";

    console.log("Utils script starting to load");
    const utils = {};
    console.log("utils object created");

    /* !! -------------------------------------------------------------------------- */
    /*                     !! Internal functions - not exposed                       */
    /* !! -------------------------------------------------------------------------- */
    function createButtonContainer() {
        const buttonContainer = document.createElement("div");
        buttonContainer.style.display = "inline-block";
        buttonContainer.style.justifyContent = "center";
        buttonContainer.style.marginTop = "10px";
        buttonContainer.style.marginLeft = "10px";
        return buttonContainer;
    }

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

    function createButtonFromPromptKey(prompts, promptKey) {
        const inputBoxSelector = "div[enterkeyhint='enter']";
        const button = document.createElement("button");
        this.setBtnStyle(button);
        button.innerHTML = prompts[promptKey].btnNm;
        button.onclick = () => {
            const input = document.querySelector(inputBoxSelector);
            const inputNewCont = prompts[promptKey].prompt;
            if (input && input instanceof HTMLElement) {
                input.innerHTML = claudeLongStringProcessor(inputNewCont);
                setSelection(input);
            }

            if (prompts[promptKey].sendOutPrompt) {
                setTimeout(() => {
                    sendEnterKey(input);
                }, 1000);
            }
        };
        return button;
    }

    // 节流函数，防止过于频繁的调用
    function throttle(func, delay) {
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

    // ! create buttons
    utils.createButtonFromCallback = function (btnText, callbackFunc) {
        var button = document.createElement("button");
        button = this.setBtnStyle(button);
        button.innerHTML = btnText;
        button.onclick = callbackFunc;
        return button;
    };

    utils.createTextNode = function (btnText) {
        return document.createTextNode(btnText);
    };

    utils.createButtonCopyText = function (btnText, copyText) {
        return this.createButtonFromCallback(btnText, () => {
            navigator.clipboard.writeText(copyText);
        });
    };

    utils.createButtonCopyHypertext = function (btnText, pageTitle, curURL) {
        return this.createButtonFromCallback(btnText, () => {
            this.copyHypertext(pageTitle, curURL);
        });
    };

    utils.createButtonOpenUrl = function (btnText, targetUrl) {
        return this.createButtonFromCallback(btnText, () => {
            window.open(targetUrl);
        });
    };

    // ! create button containers
    utils.createButtonContainer = function () {
        const container = document.createElement("div");
        container.style.display = "inline-block";
        container.style.marginTop = "10px";
        container.style.marginLeft = "10px";
        return container;
    };

    utils.createButtonContainerFromJson = function (prompts) {
        const buttonContainer = createButtonContainer();
        for (const promptKey in prompts) {
            buttonContainer.append(createButtonFromPromptKey(prompts, promptKey));
        }
        return buttonContainer;
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

    // 带节流函数的 observeDOM
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
        const throttledCallback = throttle(callback, throttleDelay);

        // Create observer
        const observer = new MutationObserver(throttledCallback);

        // Start observing
        observer.observe(targetNode, config);

        // Return the observer for potential cleanup
        return observer;
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
    console.log("createButtonContainerFromJson function added to utils");
})(window);
