// ==UserScript==
// @name         jira_add_buttons
// @description  Add buttons in JIRA
// @author       gtfish
// @version      1.0.1
// @match        http*://indeed.atlassian.net/browse/*
// @grant        GM_addStyle
// @require     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @require     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/text2url_patterns.js
// @updateURL    https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/JiraTicketAddBtn/JiraTicketAddBtn.js
// @downloadURL  https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/JiraTicketAddBtn/JiraTicketAddBtn.js

// ==/UserScript==
// 1.0.1: refactor with generic waitForResource function to reduce code duplication
// 1.0.0: add waitForPatterns function to ensure text2url_patterns is loaded before use
// 0.9.9: refactor to use shared text2url_patterns from external config
// 0.9.8: added new url pattern for butterfly
// 0.9.7: add html2md link
// 0.9.6: add more model patterns
// 0.9.5: extract CONFIG constants for better maintainability
// 0.9.4: add more model patterns
// 0.9.3: add more model patterns
// 0.9.2: 更新 model patterns 的替换范围为全局页面
// 0.9.1: 更新 model patterns
// 0.9.0: 重构代码, use utils from external script;
// 0.8.0: 重构代码, 提取函数
// 0.7.3: change the disable btn tex
// 0.7.1: fix the bug which cause the links not clickable
// 0.7.0: add the function to disable the click to edit and the button to enable it
// 0.6.0: improve the layout and fixed the bug with in-page links
// 0.5.0: align the script with the new jira version
// 0.4.0: added function to fix the position of the button
// 0.3.2: added more btn
// 0.3.0: deeply refactor
// 0.2.0: 把添加hypertext弄成函数了
// 0.1.0: 优化了copy hypertext
// 0.0.1: 修改部分btn

(async function () {
    "use strict";

    // Configuration constants
    const CONFIG = {
        UTILS_TIMEOUT: 10000,
        CONTAINER_ID: "container_id",
        BUTTON_POSITION: { top: "50px", left: "650px" },
        IS_FIXED_POS: false,
        REQUIRED_UTILS: [
            "createButtonContainerFromJson",
            "observeDOM",
            "createButtonContainer",
            "createTextNode",
            "createButtonCopyText",
            "createButtonCopyHypertext",
            "createButtonFromCallback",
            "addFixedPosContainerToPage",
            "addContainerNextToElement1",
            "setBtnStyle",
            "convertTextToLinks",
        ],
        SELECTORS: {
            TICKET_ID: '[data-testid="issue.views.issue-base.foundation.breadcrumbs.current-issue.item"]',
            SUMMARY: '[data-testid="issue.views.issue-base.foundation.summary.heading"]',
        },
        CONTENT_AREAS: [
            {
                selector: '[data-testid="issue.views.field.rich-text.description"]',
                label: "Description",
            },
            {
                selector: '[data-testid="issue.views.field.rich-text.customfield_11767"]',
                label: "Planning Notes",
            },
            {
                selector: '[data-testid="issue.views.field.rich-text.customfield_11694"]',
                label: "Implementation Details",
            },
        ],
    };

    let lastProcessedTicketId = null;
    let isProcessing = false;

    const utils = await waitForUtils();
    const text2url_patterns = await waitForPatterns();

    // Wait for the DOM to be fully loaded
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", observeDOM);
    } else {
        observeDOM();
    }

    // run main
    setTimeout(processChanges, 1000);

    function processChanges() {
        if (isProcessing) return;
        isProcessing = true;

        try {
            // !! new UI (2024-09-29)
            const ticketIdElement = document.querySelector(CONFIG.SELECTORS.TICKET_ID);

            if (ticketIdElement) {
                const currentTicketId = ticketIdElement.textContent.trim();
                if (currentTicketId && currentTicketId !== lastProcessedTicketId) {
                    lastProcessedTicketId = currentTicketId;
                    console.log("Ticket ID changed to:", currentTicketId);

                    // Add a small delay before fetching the summary
                    setTimeout(() => {
                        // !! new UI (2024-09-29)
                        const summaryElement = document.querySelector(CONFIG.SELECTORS.SUMMARY);
                        const currentSummary = summaryElement ? summaryElement.textContent.trim() : "";

                        console.log("Fetched summary:", currentSummary);

                        main(
                            currentTicketId,
                            currentSummary,
                            CONFIG.SELECTORS.TICKET_ID,
                            CONFIG.CONTENT_AREAS,
                            text2url_patterns,
                            utils
                        );
                    }, 1000); // 1000ms delay, adjust if needed
                }
            }
        } catch (error) {
            console.error("Error in processChanges:", error);
        } finally {
            isProcessing = false;
        }
    }

    function observeDOM() {
        const targetNode = document.body;
        const config = { childList: true, subtree: true };

        const callback = function (mutationsList, observer) {
            processChanges();
        };

        const observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
    }

    // Generic function to wait for a resource to load
    function waitForResource(resourceName, checkFunction, timeout = CONFIG.UTILS_TIMEOUT) {
        console.log(`Starting to wait for ${resourceName}...`);

        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            function check() {
                const result = checkFunction();

                if (result.isReady) {
                    console.log(`${resourceName} loaded successfully`);
                    resolve(result.value);
                } else if (Date.now() - startTime >= timeout) {
                    const errorMsg = result.errorMessage || `Timeout waiting for ${resourceName}`;
                    console.log(errorMsg);
                    reject(new Error(errorMsg));
                } else {
                    console.log(`${resourceName} not ready yet, checking again in 100ms`);
                    setTimeout(check, 100);
                }
            }

            check();
        });
    }

    // Wait for utils to load
    function waitForUtils(timeout = CONFIG.UTILS_TIMEOUT) {
        return waitForResource(
            "utils",
            () => {
                const requiredFunctions = CONFIG.REQUIRED_UTILS;

                if (
                    window.utils &&
                    requiredFunctions.every((func) => typeof window.utils[func] === "function")
                ) {
                    return { isReady: true, value: window.utils };
                }

                const missingFunctions = requiredFunctions.filter(
                    (func) => !window.utils || typeof window.utils[func] !== "function"
                );

                return {
                    isReady: false,
                    errorMessage: `Timeout waiting for utils. Missing functions: ${missingFunctions.join(", ")}`,
                };
            },
            timeout
        );
    }

    // Wait for text2url patterns to load
    function waitForPatterns(timeout = CONFIG.UTILS_TIMEOUT) {
        return waitForResource(
            "text2urlPatterns",
            () => {
                if (window.text2urlPatterns && Array.isArray(window.text2urlPatterns)) {
                    return {
                        isReady: true,
                        value: window.text2urlPatterns,
                    };
                }

                return {
                    isReady: false,
                    errorMessage: "Timeout waiting for text2urlPatterns",
                };
            },
            timeout
        );
    }

    async function main(ticketId, summary, contrainerLocSelectorStr, contentAreasForDsiable, text2url_patterns, utils) {
        // setup the disabled editing and the btn to enable it
        setClickToEdit(false, contentAreasForDsiable, text2url_patterns, utils);
        const enableEditBtn = createEnableEditingBtn(contentAreasForDsiable, text2url_patterns, utils);

        // Remove existing container if any
        const existingContainer = document.getElementById(CONFIG.CONTAINER_ID);
        if (existingContainer) {
            existingContainer.remove();
        }

        const ticket_url = "https://indeed.atlassian.net/browse/" + ticketId;

        const buttonContainer = utils.createButtonContainer();
        buttonContainer.id = CONFIG.CONTAINER_ID;

        buttonContainer.append(
            enableEditBtn,

            utils.createTextNode("text: "),
            utils.createButtonCopyText("ticketId", ticketId),
            utils.createButtonCopyText("ticket_url", ticket_url),
            utils.createButtonCopyText("summary", `${summary}`),

            utils.createTextNode("\thref: "),
            utils.createButtonCopyHypertext("ticket", ticketId, ticket_url),
            utils.createButtonFromCallback("(ticket) summary", () =>
                utils.copyHypertext(ticketId, ticket_url, "(", `) ${summary}`)
            ),

            utils.createTextNode("\tmd: "),
            utils.createButtonCopyText("[ticket](ticket_url)", `[${ticketId}](${ticket_url})`),

            utils.createTextNode("\tlinks: "),
            utils.createButtonOpenUrl(
                "html2md",
                "https://www.docstomarkdown.pro/convert-word-to-markdown/"
            ),            
        );

        if (CONFIG.IS_FIXED_POS) {
            utils.addFixedPosContainerToPage(buttonContainer, CONFIG.BUTTON_POSITION);
        } else {
            const ticketIdElement = document.querySelector(contrainerLocSelectorStr);
            utils.addContainerNextToElement1(buttonContainer, ticketIdElement);
        }
    }
})();

function setClickToEdit(enabled, contentAreasForDsiable, text2url_patterns, utils) {
    contentAreasForDsiable.forEach((area) => {
        const element = document.querySelector(area.selector);
        if (element) {
            if (enabled) {
                element.style.pointerEvents = "auto";
            } else {
                // ! disable all except some elements below
                element.style.pointerEvents = "none";

                utils.convertTextToLinks(document.body, text2url_patterns);

                // Enable regular links
                element.querySelectorAll("a").forEach((link) => {
                    link.style.pointerEvents = "auto";
                    link.style.cursor = "pointer";
                });

                // Enable inline card structures (ticket)
                element.querySelectorAll('[data-inline-card="true"]').forEach((card) => {
                    card.style.pointerEvents = "auto";
                    let link = card.querySelector('a[data-testid="inline-card-resolved-view"]');
                    if (link) {
                        link.style.pointerEvents = "auto";
                        link.style.cursor = "pointer";
                    }
                });

                // Enable name tags
                element.querySelectorAll('[data-testid="mention-with-profilecard-trigger"]').forEach((mention) => {
                    mention.style.pointerEvents = "auto";
                    mention.style.cursor = "pointer";
                });
            }
        }
    });
}

function createEnableEditingBtn(contentAreasForDsiable, text2url_patterns, utils) {
    let enableEditBtn = document.createElement("button");
    enableEditBtn.className = "text-nowrap btn btn-warning btn-sm";
    enableEditBtn.textContent = "Editing Disabled";
    enableEditBtn = utils.setBtnStyle(enableEditBtn);
    enableEditBtn.style.backgroundColor = "#ff991f";

    enableEditBtn.onclick = () => {
        setClickToEdit(true, contentAreasForDsiable, text2url_patterns, utils);
        enableEditBtn.textContent = "Editing Enabled";
        enableEditBtn.style.backgroundColor = "#00875A"; // Change color to indicate enabled state
    };

    return enableEditBtn;
}
