// ==UserScript==
// @name                monarch advanced
// @version             0.1.0
// @description         改进 monarch 的脚本
// @author              gtfish
// @license             MIT
// @match               https://app.monarch.com/*
// @match               https://app.monarchmoney.com/*
// @grant               none
// @run-at              document-idle
// @require             https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @updateURL           https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_common/monarch_adv.js
// @downloadURL         https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_common/monarch_adv.js

// ==/UserScript==
// 0.1.0: init, 在 Expenses 标题旁显示总金额

(function () {
    "use strict";

    let isUpdating = false;
    let debounceTimer = null;

    // ! 计算 Expenses 卡片中所有分类金额的总和, 并显示在标题旁边
    function addExpenseTotal() {
        if (isUpdating) return;

        const titleElements = document.querySelectorAll('[class*="CardHeader__Title"]');
        for (const title of titleElements) {
            const text = title.textContent.trim();
            if (!text.startsWith("Expenses")) continue;

            const card = title.closest('[class*="Card__CardRoot"]');
            if (!card) continue;

            const priceElements = card.querySelectorAll('[class*="CashFlowCurrency__Root"]');
            let total = 0;
            priceElements.forEach((el) => {
                const amount = parseFloat(el.textContent.replace(/[$,]/g, ""));
                if (!isNaN(amount)) total += amount;
            });

            if (total > 0) {
                const formatted = "$" + total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                const newText = `Expenses (${formatted})`;
                if (title.textContent.trim() !== newText) {
                    isUpdating = true;
                    title.textContent = newText;
                    isUpdating = false;
                }
            }
        }
    }

    function debouncedAddExpenseTotal() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(addExpenseTotal, 300);
    }

    function initScript() {
        addExpenseTotal();

        const observer = new MutationObserver(debouncedAddExpenseTotal);
        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initScript);
    } else {
        initScript();
    }
})();
