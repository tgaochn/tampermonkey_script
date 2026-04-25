// ==UserScript==
// @name                monarch advanced
// @version             0.3.0
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
// 0.3.0: 支持中键/Ctrl+点击类别在新标签页打开详情
// 0.2.0: 每个类别前添加多选框, 标题显示选中金额/总金额/百分比
// 0.1.0: init, 在 Expenses 标题旁显示总金额

(function () {
    "use strict";

    let isUpdating = false;
    let debounceTimer = null;

    // ! 拦截 history.pushState, 支持中键/Ctrl+点击在新标签页打开
    let openInNewTab = false;
    const originalPushState = history.pushState.bind(history);
    history.pushState = function (...args) {
        if (openInNewTab) {
            openInNewTab = false;
            const url = args[2];
            if (url) {
                window.open(new URL(url, location.origin).href, "_blank");
            }
            return;
        }
        return originalPushState(...args);
    };

    const CHECKBOX_STYLE = `
        width: 16px;
        height: 16px;
        cursor: pointer;
        flex-shrink: 0;
        accent-color: #e74c3c;
        position: relative;
        z-index: 10;
    `;

    const WRAPPER_STYLE = `
        display: flex;
        align-items: center;
        gap: 4px;
    `;

    const BTN_STYLE = `
        cursor: pointer;
        border: 1px solid #ccc;
        border-radius: 4px;
        background: #fff;
        padding: 2px 8px;
        font-size: 12px;
        color: #555;
        margin-right: 4px;
    `;

    function formatMoney(amount) {
        return "$" + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    // ! 获取每个分类行的金额
    function getAmountFromItem(item) {
        const priceEl = item.querySelector('[class*="CashFlowCurrency__Root"]');
        if (!priceEl) return 0;
        const amount = parseFloat(priceEl.textContent.replace(/[$,]/g, ""));
        return isNaN(amount) ? 0 : amount;
    }

    // ! 更新标题显示: 选中金额 / 总金额 (百分比)
    function updateTitle(card) {
        const title = card.querySelector('[class*="CardHeader__Title"]');
        if (!title) return;

        const items = card.querySelectorAll('[class*="BreakdownItem__Container"]');
        let total = 0;
        let selected = 0;
        let checkedCount = 0;

        items.forEach((item) => {
            const amount = getAmountFromItem(item);
            total += amount;
            const wrapper = item.closest(".monarch-adv-wrapper");
            const cb = wrapper ? wrapper.querySelector(".monarch-adv-checkbox") : null;
            if (cb && cb.checked) {
                selected += amount;
                checkedCount++;
            }
        });

        if (total > 0) {
            let newText;
            const allChecked = checkedCount === items.length;
            const noneChecked = checkedCount === 0;
            if (allChecked || noneChecked) {
                newText = `Expenses (${formatMoney(total)})`;
            } else {
                const pct = ((selected / total) * 100).toFixed(1);
                newText = `Expenses (${formatMoney(selected)} / ${formatMoney(total)} = ${pct}%)`;
            }
            if (title.textContent.trim() !== newText) {
                isUpdating = true;
                title.textContent = newText;
                isUpdating = false;
            }
        }
    }

    // ! 在每个分类行前添加多选框, 并计算总金额
    function addExpenseTotal() {
        if (isUpdating) return;

        const titleElements = document.querySelectorAll('[class*="CardHeader__Title"]');
        for (const title of titleElements) {
            const text = title.textContent.trim();
            if (!text.startsWith("Expenses")) continue;

            const card = title.closest('[class*="Card__CardRoot"]');
            if (!card) continue;

            // 在标题前添加 全选/清空 按钮
            if (!card.querySelector(".monarch-adv-select-all")) {
                const btnContainer = document.createElement("span");
                btnContainer.style.cssText = "margin-right: 8px; white-space: nowrap;";

                const selectAllBtn = document.createElement("button");
                selectAllBtn.textContent = "All";
                selectAllBtn.className = "monarch-adv-select-all";
                selectAllBtn.style.cssText = BTN_STYLE;
                selectAllBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    card.querySelectorAll(".monarch-adv-checkbox").forEach((cb) => (cb.checked = true));
                    updateTitle(card);
                });

                const clearBtn = document.createElement("button");
                clearBtn.textContent = "Clear";
                clearBtn.className = "monarch-adv-clear";
                clearBtn.style.cssText = BTN_STYLE;
                clearBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    card.querySelectorAll(".monarch-adv-checkbox").forEach((cb) => (cb.checked = false));
                    updateTitle(card);
                });

                const invertBtn = document.createElement("button");
                invertBtn.textContent = "Invert";
                invertBtn.className = "monarch-adv-invert";
                invertBtn.style.cssText = BTN_STYLE;
                invertBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    card.querySelectorAll(".monarch-adv-checkbox").forEach((cb) => (cb.checked = !cb.checked));
                    updateTitle(card);
                });

                btnContainer.appendChild(selectAllBtn);
                btnContainer.appendChild(clearBtn);
                btnContainer.appendChild(invertBtn);
                title.parentNode.insertBefore(btnContainer, title);
            }

            // 为每个分类行添加 checkbox (放在整个 Container 外面, 避免触发详情链接)
            const items = card.querySelectorAll('[class*="BreakdownItem__Container"]');
            items.forEach((item) => {
                // 已经被包裹过则跳过
                if (item.parentElement && item.parentElement.classList.contains("monarch-adv-wrapper")) return;

                const cb = document.createElement("input");
                cb.type = "checkbox";
                cb.className = "monarch-adv-checkbox";
                cb.checked = true; // 默认全部选中
                cb.style.cssText = CHECKBOX_STYLE;
                // 阻止点击事件冒泡, 防止触发类别详情导航
                cb.addEventListener("click", (e) => e.stopPropagation());
                cb.addEventListener("change", () => updateTitle(card));

                // Ctrl+点击: 拦截 pushState, 在新标签页打开
                item.addEventListener("click", (e) => {
                    if (e.ctrlKey || e.metaKey) {
                        openInNewTab = true;
                    }
                }, true); // capture phase, 在 React handler 之前设置标志

                // 中键按下: 阻止默认的自动滚动行为
                item.addEventListener("mousedown", (e) => {
                    if (e.button === 1) {
                        e.preventDefault();
                    }
                });

                // 中键释放: 模拟带 ctrl 的点击, 通过 pushState 拦截在新标签页打开
                item.addEventListener("mouseup", (e) => {
                    if (e.button === 1) {
                        e.preventDefault();
                        e.stopPropagation();
                        openInNewTab = true;
                        // 安全重置, 防止标志残留
                        setTimeout(() => (openInNewTab = false), 500);
                        const clickEvent = new MouseEvent("click", {
                            bubbles: true,
                            cancelable: true,
                            view: window,
                            ctrlKey: true,
                        });
                        item.dispatchEvent(clickEvent);
                    }
                });

                // 创建 wrapper, 将 checkbox 和原始 item 并排放置
                const wrapper = document.createElement("div");
                wrapper.className = "monarch-adv-wrapper";
                wrapper.style.cssText = WRAPPER_STYLE;

                item.parentNode.insertBefore(wrapper, item);
                wrapper.appendChild(cb);
                wrapper.appendChild(item);
            });

            updateTitle(card);
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
