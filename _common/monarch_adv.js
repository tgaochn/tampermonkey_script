// ==UserScript==
// @name                monarch advanced
// @version             0.4.0
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
// 0.4.0: 修复切换月份时偶发的 React removeChild 报错 (不再移动/改写 React 管理的 DOM 节点)
// 0.3.2: Sankey Diagram 节点支持中键/Ctrl+点击在新标签页打开
// 0.3.1: Income 部分也支持多选框/总金额/中键Ctrl+点击
// 0.3.0: 支持中键/Ctrl+点击类别在新标签页打开详情
// 0.2.0: 每个类别前添加多选框, 标题显示选中金额/总金额/百分比
// 0.1.0: init, 在 Expenses 标题旁显示总金额

(function () {
    "use strict";

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

    const SUPPORTED_SECTIONS = ["Expenses", "Income"];

    const CHECKBOX_BASE_STYLE = `
        width: 16px;
        height: 16px;
        cursor: pointer;
        flex-shrink: 0;
        margin: 0;
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        z-index: 10;
    `;

    const ACCENT_COLORS = {
        Expenses: "#e74c3c",
        Income: "#27ae60",
    };

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

    // ! 为元素添加中键/Ctrl+点击在新标签页打开的功能
    function addNewTabClickHandlers(el) {
        if (el.dataset.monarchNewTab) return;
        el.dataset.monarchNewTab = "1";

        // Ctrl+点击: 拦截 pushState, 在新标签页打开
        el.addEventListener("click", (e) => {
            if (e.ctrlKey || e.metaKey) {
                openInNewTab = true;
            }
        }, true);

        // 中键按下: 阻止默认的自动滚动行为
        el.addEventListener("mousedown", (e) => {
            if (e.button === 1) {
                e.preventDefault();
            }
        });

        // 中键释放: 模拟带 ctrl 的点击, 通过 pushState 拦截在新标签页打开
        el.addEventListener("mouseup", (e) => {
            if (e.button === 1) {
                e.preventDefault();
                e.stopPropagation();
                openInNewTab = true;
                setTimeout(() => (openInNewTab = false), 500);
                const clickEvent = new MouseEvent("click", {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    ctrlKey: true,
                });
                el.dispatchEvent(clickEvent);
            }
        });
    }

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
    // 不改写 React 管理的标题文本, 而是在标题内追加我们自己的 span, 避免触发 React 的 removeChild 报错
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
            const cb = item.querySelector(".monarch-adv-checkbox");
            if (cb && cb.checked) {
                selected += amount;
                checkedCount++;
            }
        });

        if (total > 0) {
            let suffix;
            const allChecked = checkedCount === items.length;
            const noneChecked = checkedCount === 0;
            if (allChecked || noneChecked) {
                suffix = ` (${formatMoney(total)})`;
            } else {
                const pct = ((selected / total) * 100).toFixed(1);
                suffix = ` (${formatMoney(selected)} / ${formatMoney(total)} = ${pct}%)`;
            }

            let span = title.querySelector(".monarch-adv-total");
            if (!span) {
                span = document.createElement("span");
                span.className = "monarch-adv-total";
                title.appendChild(span);
            }
            if (span.textContent !== suffix) {
                span.textContent = suffix;
            }
        }
    }

    // ! 在每个分类行前添加多选框, 并计算总金额
    function addExpenseTotal() {
        const titleElements = document.querySelectorAll('[class*="CardHeader__Title"]');
        for (const title of titleElements) {
            const text = title.textContent.trim();
            const sectionName = SUPPORTED_SECTIONS.find((s) => text.startsWith(s));
            if (!sectionName) continue;

            const card = title.closest('[class*="Card__CardRoot"]');
            if (!card) continue;

            const accentColor = ACCENT_COLORS[sectionName] || "#e74c3c";

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

            // 为每个分类行添加 checkbox
            // 注意: 不再创建 wrapper 把 item 搬家 (那会改变 React 管理节点的父子关系,
            // 切换月份 React 重渲染时会抛 removeChild NotFoundError 导致整页崩溃)。
            // 改为把 checkbox 作为 item 的子节点用绝对定位放在左侧, item 被卸载时 checkbox 随之消失, React 无感。
            const items = card.querySelectorAll('[class*="BreakdownItem__Container"]');
            items.forEach((item) => {
                addNewTabClickHandlers(item);

                // 已经添加过则跳过
                if (item.querySelector(":scope > .monarch-adv-checkbox")) return;

                const cb = document.createElement("input");
                cb.type = "checkbox";
                cb.className = "monarch-adv-checkbox";
                cb.checked = true; // 默认全部选中
                cb.style.cssText = CHECKBOX_BASE_STYLE + `accent-color: ${accentColor};`;
                // 阻止点击事件冒泡, 防止触发类别详情导航
                cb.addEventListener("click", (e) => e.stopPropagation());
                cb.addEventListener("change", () => updateTitle(card));

                // 给 item 留出左侧空间并作为定位上下文, checkbox 绝对定位在最左
                item.style.position = "relative";
                item.style.paddingLeft = "24px";
                item.insertBefore(cb, item.firstChild);
            });

            updateTitle(card);
        }
    }

    // ! Sankey Diagram 节点: 添加中键/Ctrl+点击在新标签页打开
    function addSankeyNewTabSupport() {
        const sankeyNodes = document.querySelectorAll('g.node.is-clickable');
        sankeyNodes.forEach((node) => addNewTabClickHandlers(node));
    }

    function debouncedUpdate() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            addExpenseTotal();
            addSankeyNewTabSupport();
        }, 300);
    }

    function initScript() {
        addExpenseTotal();
        addSankeyNewTabSupport();

        const observer = new MutationObserver(debouncedUpdate);
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
