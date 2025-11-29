// ==UserScript==
// @name         Amazon Subscribe & Save Batch Canceller
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  Batch cancel all Amazon subscriptions on the Subscribe & Save page.
// @match        https://www.amazon.com/auto-deliveries/*
// @grant        none
// @license      MIT
// @updateURL       https://raw.githubusercontent.com/tgaochn/tampermonkey_script/refs/heads/master/_common/Amazon%E5%8F%96%E6%B6%88%E6%89%80%E6%9C%89%E8%AE%A2%E9%98%85/cancelAmazonSubscribe.js
// @downloadURL     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/refs/heads/master/_common/Amazon%E5%8F%96%E6%B6%88%E6%89%80%E6%9C%89%E8%AE%A2%E9%98%85/cancelAmazonSubscribe.js

// ==/UserScript==
// 0.1.0: Initial version

// URL: `https://www.amazon.com/auto-deliveries/subscriptionList?listFilter=active&ref_=rodx_mys_subscriptionFilter_d_ret_active`

(function () {
    "use strict";

    /* !! --------------------------------------------- */
    /* !! Configuration                                 */
    /* !! --------------------------------------------- */

    const CONFIG = {
        // Amazon AJAX endpoint for cancellation
        baseUrl: "https://www.amazon.com/auto-deliveries/ajax/cancelSubscriptionAction",
        // Delay between requests in milliseconds to avoid rate limiting
        requestDelay: 1500,
        // The timestamp used in the original snippet.
        // Note: This might need updating if Amazon validates the date strictly.
        mockNextDeliveryDate: 1730880000000,
    };

    // Button position configuration (Matched style with your reference script)
    const BUTTON_CONFIG = {
        position: "fixed",
        top: "110px", // Lowered slightly to avoid search bar overlap
        left: "800px",
        zIndex: "9999",
        text: "Batch Cancel Subscriptions",
    };

    /* !! -------------------------------------------------------------------------- */
    /* !! UI Logic                                     */
    /* !! -------------------------------------------------------------------------- */

    // Show tip message that disappears automatically (Reused from your reference)
    function showTip(message, isSuccess = true, duration = 3000) {
        const existingTip = document.getElementById("batchCancelTip");
        if (existingTip) {
            existingTip.remove();
        }

        const tip = document.createElement("div");
        tip.id = "batchCancelTip";
        tip.textContent = message;
        tip.style.position = "fixed";
        tip.style.top = "50%";
        tip.style.left = "50%";
        tip.style.transform = "translate(-50%, -50%)";
        tip.style.zIndex = "10000";
        tip.style.padding = "20px 30px";
        tip.style.borderRadius = "8px";
        tip.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.3)";
        tip.style.fontFamily = "Arial, sans-serif";
        tip.style.fontSize = "16px";
        tip.style.fontWeight = "bold";
        tip.style.textAlign = "center";
        tip.style.minWidth = "200px";
        tip.style.maxWidth = "500px";
        tip.style.backgroundColor = isSuccess ? "#4caf50" : "#f44336";
        tip.style.color = "#fff";
        tip.style.transition = "opacity 0.3s ease";

        document.body.appendChild(tip);

        // Keep the tip visible longer if it's a progress update (duration 0 means manual remove)
        if (duration > 0) {
            setTimeout(() => {
                tip.style.opacity = "0";
                setTimeout(() => {
                    if (tip.parentNode) tip.remove();
                }, 300);
            }, duration);
        }
    }

    /* !! -------------------------------------------------------------------------- */
    /* !! Core Logic                                   */
    /* !! -------------------------------------------------------------------------- */

    // Extract Subscription IDs from the DOM
    function getSubscriptionIds() {
        const spans = document.querySelectorAll('span[data-action="edit-link-subscription-tablet"]');
        const ids = [...spans]
            .map((span) => {
                const data = span.getAttribute("data-edit-link-subscription-tablet");
                // Regex to extract subscriptionId
                const match = data.match(/subscriptionId=([^&"]+)/);
                return match ? match[1] : null;
            })
            .filter((id) => id); // Remove nulls

        return [...new Set(ids)]; // Remove duplicates
    }

    // Cancel a single subscription via fetch
    async function cancelSubscription(id) {
        const url = `${CONFIG.baseUrl}?actionType=cancelSubscription&canceledNextDeliveryDate=${CONFIG.mockNextDeliveryDate}&subscriptionId=${id}`;

        try {
            // Using fetch instead of window.open to keep it in the background
            const response = await fetch(url, {
                method: "GET", // The original snippet implied a GET request
                headers: {
                    Accept: "application/json", // Assuming JSON response
                },
            });

            if (response.ok) {
                return { success: true, id };
            } else {
                return { success: false, id, error: response.statusText };
            }
        } catch (err) {
            return { success: false, id, error: err.message };
        }
    }

    // Process the queue with delays
    async function processQueue(ids) {
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < ids.length; i++) {
            const currentId = ids[i];

            // Update UI
            showTip(`Processing ${i + 1}/${ids.length}...\nDo not close this tab.`, true, 0);

            // Execute cancellation
            const result = await cancelSubscription(currentId);

            if (result.success) {
                successCount++;
                console.log(`[Success] Cancelled ID: ${currentId}`);
            } else {
                failCount++;
                console.error(`[Failed] ID: ${currentId}, Error: ${result.error}`);
            }

            // Wait before next request to be polite to the server
            if (i < ids.length - 1) {
                await new Promise((r) => setTimeout(r, CONFIG.requestDelay));
            }
        }

        // Final report
        showTip(
            `Batch Job Complete! \nSuccess: ${successCount} \nFailed: ${failCount} \nPlease refresh the page to see changes.`,
            successCount > 0,
            5000
        );
    }

    function init() {
        // Create the button
        const button = document.createElement("button");
        button.innerHTML = BUTTON_CONFIG.text;
        button.style.position = BUTTON_CONFIG.position;
        button.style.top = BUTTON_CONFIG.top;
        button.style.left = BUTTON_CONFIG.left;
        button.style.zIndex = BUTTON_CONFIG.zIndex;
        button.style.padding = "10px 16px";
        button.style.borderRadius = "25px";
        button.style.border = "none";
        button.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
        button.style.backgroundColor = "#d32f2f"; // Red color for caution
        button.style.color = "#fff";
        button.style.fontFamily = "Arial, sans-serif";
        button.style.fontSize = "14px";
        button.style.fontWeight = "bold";
        button.style.cursor = "pointer";
        button.style.transition = "all 0.3s ease";

        // Hover effects
        button.addEventListener("mouseenter", function () {
            this.style.backgroundColor = "#b71c1c";
            this.style.transform = "translateY(-2px)";
        });

        button.addEventListener("mouseleave", function () {
            this.style.backgroundColor = "#d32f2f";
            this.style.transform = "translateY(0)";
        });

        // Click event
        button.addEventListener("click", function () {
            const ids = getSubscriptionIds();

            if (ids.length === 0) {
                showTip("No subscriptions found on this page.", false);
                return;
            }

            // Confirm dialog
            const confirmed = window.confirm(
                `Found ${
                    ids.length
                } subscriptions.\n\nAre you sure you want to CANCEL ALL of them?\n\nThis process will take about ${Math.ceil(
                    (ids.length * CONFIG.requestDelay) / 1000
                )} seconds.`
            );

            if (confirmed) {
                processQueue(ids);
            }
        });

        document.body.appendChild(button);
    }

    // Run
    init();
})();
