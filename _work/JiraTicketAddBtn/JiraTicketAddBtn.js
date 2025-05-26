// ==UserScript==
// @name         jira_add_buttons
// @description  Add buttons in JIRA
// @author       gtfish
// @version      0.9.5
// @match        http*://indeed.atlassian.net/browse/*
// @grant        GM_addStyle
// @require     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @updateURL    https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/JiraTicketAddBtn/JiraTicketAddBtn.js
// @downloadURL  https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/JiraTicketAddBtn/JiraTicketAddBtn.js

// ==/UserScript==
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

    // Define text2url_patterns and their corresponding URL templates
    const text2url_patterns = [
        // RJQ tickets
        {
            regex: /^RJQ-[0-9]{1,6}$/gi,
            urlTemplate: "https://indeed.atlassian.net/browse/$1",
        },

        // ! single/multiple target hp/serp models
        // pre-apply: applyperseen_rj_hp_jp_52684ee / ctr_rj_sjhp_jp_a3683b0 / applyperseen_mobweb_rotw_a3683b0 / applyperseen_and_ctr_rj_hp_jp_15339e0
        // bidding: ac-per-click_rj_hp_us_5a303d3 / apply_rj_hp_us_fbed164 / ac-per-click_sjmobweb_rotw_60306c6 / apply_sjmobweb_rotw_e60cca4
        // post-apply: qualifiedapply_mob_global_6156574 / qualified_mob_global_e9b72c9
        // glassdoor model: gd_sjmobweb_rotw_3c86644
        // default MTM: multi_rj_hp_us_15339e0
        // others: dislike_rj_hp_us_b734f31
        {
            regex: /^((gd_)?((applyperseen)|(ctr)|(applyperseen_and_ctr)|(dislike)|(apply)|(ac-per-click)|(qualifiedapply)|(qualified)|(multi)|(preapply))_((rj_sjhp)|(rj_hp)|(mobweb)|(mob)|(sjmobweb))_((us)|(rotw)|(jp)|(global))_[a-zA-Z0-9]{7})$/g,
            urlTemplate: "https://butterfly.sandbox.indeed.net/#/model/$1/PUBLISHED/config",
        },

        // ! SERP models: sjmobweb_us_15339e0
        {
            regex: /^(sjmobweb_((us)|(rotw)|(jp))_[a-zA-Z0-9]{7})$/g,
            urlTemplate: "https://butterfly.sandbox.indeed.net/#/model/$1/PUBLISHED/config",
        },

        // ! I2A models: elephant-multi-en-all_en-4e18057
        {
            regex: /^(elephant-multi-en-all_en-[a-zA-Z0-9]{7})$/g,
            urlTemplate: "https://butterfly.sandbox.indeed.net/#/model/$1/PUBLISHED/config",
        },
    ];

    const utils = await waitForUtils();

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
            utils.createButtonCopyHypertext("href: ticket", ticketId, ticket_url),
            utils.createButtonFromCallback("href: (ticket) summary", () =>
                utils.copyHypertext(ticketId, ticket_url, "(", `) ${summary}`)
            ),

            utils.createTextNode("\tmd: "),
            utils.createButtonCopyText("md: [ticket](ticket_url)", `[${ticketId}](${ticket_url})`)
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
