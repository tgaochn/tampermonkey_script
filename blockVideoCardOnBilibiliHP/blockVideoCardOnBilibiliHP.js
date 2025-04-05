// ==UserScript==
// @name         blockVideoCardOnBilibiliHP
// @version      0.1.3
// @description  屏蔽B站主页视频卡片
// @author       gtfish
// @match        https://www.bilibili.com/
// @match        https://www.bilibili.com/?spm_id_from=*
// @match        https://space.bilibili.com/*
// @require      https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @license      GNU General Public License v3.0
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/blockVideoCardOnBilibiliHP/blockVideoCardOnBilibiliHP.js
// @downloadURL  https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/blockVideoCardOnBilibiliHP/blockVideoCardOnBilibiliHP.js

// forked from https://greasyfork.org/scripts/467384 by anonymous, version 1.2
// 不能屏蔽左上角大幅滚动视频和直播视频, 这两者可以用 AdBlock 屏蔽

// ==/UserScript==
// 0.1.3: 修复了视频卡片的布局问题, 使其在屏蔽后不会出现空白区域
// 0.1.2: block 按钮改到右下角, 时长之上
// 0.1.1: block 按钮改到左上角
// 0.1.0: 视频卡片屏蔽按钮增加定时刷新的功能, 点reload后可以自动添加屏蔽按钮/在space页面也可以屏蔽up主
// 0.0.1: init, 每个视频卡片上添加屏蔽作者功能/根据视频title屏蔽/title可以在设置栏修改; 不支持reload

(function () {
    "use strict";

    // !! CSS Selectors
    const SELECTORS = {
        // Card related selectors
        VIDEO_CARD: "bili-video-card",
        VIDEO_CARD_RCMD: ".bili-video-card.is-rcmd",
        LIVE_CARD: ".bili-live-card.is-rcmd",
        SINGLE_CARD: ".floor-single-card",
        OWNER_LINK: ".bili-video-card__info--owner",
        BLOCK_BUTTON: "block-uid-button",
        TITLE: '[class="bili-video-card__info--tit"]',

        // Query selectors for finding cards
        ALL_CARDS: ".bili-video-card.is-rcmd, .floor-single-card, .bili-live-card.is-rcmd",

        // 定义需要屏蔽的两种视频卡片类名
        BLOCKED_CLASSES: ["floor-single-card", "bili-live-card is-rcmd"],
        
        // 主要卡片容器选择器，这是整个卡片的顶层容器
        CARD_CONTAINER: ".feed-card",
        
        // 次级卡片容器选择器，作为备用
        CARD_CONTAINER_FALLBACK: ".bili-grid .col",
        
        // 视频卡片网格容器
        GRID_CONTAINER: ".bili-grid",
        
        // 卡片行容器
        ROW_CONTAINER: ".bili-grid .row",
    };

    // !! Other constants
    const MIN_FOLLOWER = 10000; // 定义需要屏蔽的最小的follower数
    const DELAY = 200;
    const API_USERDATA = "https://api.bilibili.com/x/relation/stat?vmid="; // 定义接口前缀

    // ! 使用tampermonkey的GM_getValue和GM_setValue来存储和获取变量
    let blockedUIDs = new Set(GM_getValue("blockedUIDs", []));
    let blockedTitlePatterns = new Set(
        GM_getValue("blockedTitlePatterns", [
            // default patterns
            ".*⚡.*",
            ".*穿搭.*",
            ".*vlog.*",
            ".*❤.*",
        ])
    );

    let processedCards = 0; //定义已处理卡片数量
    let isBlockCardsRunning = false; // 防止多次调用blockCards

    // Wait for utils to load
    function waitForUtils(timeout = 10000) {
        const requiredFunctions = ["observeDOM"];
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            function checkUtils() {
                if (window.utils && requiredFunctions.every((func) => typeof window.utils[func] === "function")) {
                    resolve(window.utils);
                } else if (Date.now() - startTime >= timeout) {
                    reject(
                        new Error(
                            `Timeout waiting for utils. Missing functions: ${requiredFunctions
                                .filter((func) => !window.utils || typeof window.utils[func] !== "function")
                                .join(", ")}`
                        )
                    );
                } else {
                    setTimeout(checkUtils, 100);
                }
            }
            checkUtils();
        });
    }

    // Function to add UID to blocked list
    function addBlockedUID(uid) {
        blockedUIDs.add(uid);
        GM_setValue("blockedUIDs", Array.from(blockedUIDs));
    }

    // Function to remove UID from blocked list
    function removeBlockedUID(uid) {
        blockedUIDs.delete(uid);
        GM_setValue("blockedUIDs", Array.from(blockedUIDs));
    }

    function isTitleBlocked(title) {
        return Array.from(blockedTitlePatterns).some((pattern) => {
            try {
                const regex = new RegExp(pattern, "i"); // case insensitive
                return regex.test(title);
            } catch (e) {
                console.error(`Invalid regex pattern: ${pattern}`, e);
                return false;
            }
        });
    }

    function addBlockUIButton(card, uid, SELECTORS) {
        // Check if card is valid and doesn't already have a button
        if (!card || !card.classList || !card.classList.contains(SELECTORS.VIDEO_CARD)) {
            console.error("Invalid card for button addition:", card);
            return;
        }

        if (card.querySelector(`.${SELECTORS.BLOCK_BUTTON}`)) {
            return;
        }

        try {
            const blockButton = document.createElement("button");
            blockButton.className = SELECTORS.BLOCK_BUTTON;
            blockButton.textContent = "Block";
            blockButton.style.cssText = `
                position: absolute;
                bottom: 100px;
                right: 5px;
                z-index: 999;
                padding: 5px 10px;
                background-color: rgba(220, 20, 20, 0.7);
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            `;

            blockButton.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (blockedUIDs.has(uid)) {
                    removeBlockedUID(uid);
                    blockButton.textContent = "Block";
                } else {
                    addBlockedUID(uid);
                    blockButton.textContent = "Unblock";
                    card.remove();
                    fixGridLayout();
                }
            };

            blockButton.onmouseover = () => {
                blockButton.style.backgroundColor = "rgba(220, 20, 20, 0.9)";
            };
            blockButton.onmouseout = () => {
                blockButton.style.backgroundColor = "rgba(220, 20, 20, 0.7)";
            };

            card.style.position = "relative";
            card.appendChild(blockButton);
        } catch (error) {
            console.error("Error adding block button:", error, "Card:", card, "UID:", uid);
        }
    }

    async function blockCards() {
        if (isBlockCardsRunning) {
            return;
        }
        isBlockCardsRunning = true;

        const cards = document.querySelectorAll(SELECTORS.ALL_CARDS);
        const newCards = Array.from(cards).slice(processedCards);

        console.log(`Processing ${newCards.length} new cards, total cards: ${cards.length}`);

        try {
            // Add buttons first for immediate visual feedback
            newCards.forEach((card) => {
                const uid = getUid(card, SELECTORS);
                if (uid !== -1 && !card.querySelector(`.${SELECTORS.BLOCK_BUTTON}`)) {
                    addBlockUIButton(card, uid, SELECTORS);
                }
            });

            // Then process blocking conditions in parallel
            await Promise.all(
                newCards.map(async (card) => {
                    try {
                        const uid = getUid(card, SELECTORS);
                        
                        // 找到整个卡片容器 - 首先尝试.feed-card，然后是备用选择器
                        let cardContainer = null;
                        
                        // 向上查找最近的feed-card父元素
                        cardContainer = card.closest(SELECTORS.CARD_CONTAINER);
                        
                        // 如果没找到feed-card，尝试其他可能的父容器
                        if (!cardContainer) {
                            cardContainer = card.closest(SELECTORS.CARD_CONTAINER_FALLBACK);
                        }
                        
                        // 最后的备选是卡片本身
                        if (!cardContainer) {
                            cardContainer = card;
                            console.warn("未找到卡片容器，使用卡片本身", card);
                        }

                        // 标记要移除的卡片
                        let shouldRemove = false;
                        let removeReason = "";

                        // 检查uid是否有效
                        if (uid === -1) {
                            shouldRemove = true;
                            removeReason = "无效的UID";
                        }
                        // 检查是否属于屏蔽类名
                        else if (SELECTORS.BLOCKED_CLASSES.includes(card.className)) {
                            shouldRemove = true;
                            removeReason = "屏蔽类名";
                        }
                        // 检查是否是被屏蔽的用户
                        else if (blockedUIDs.has(uid)) {
                            shouldRemove = true;
                            removeReason = "被屏蔽的用户";
                        }
                        else {
                            // 检查粉丝数
                            try {
                                const follower = await getFollower(uid, API_USERDATA);
                                if (follower > 0 && follower < MIN_FOLLOWER) {
                                    shouldRemove = true;
                                    removeReason = `粉丝数低于${MIN_FOLLOWER}`;
                                }
                            } catch (error) {
                                console.error(`获取粉丝数失败, uid: ${uid}`, error);
                            }

                            // 检查标题是否匹配屏蔽关键词
                            if (!shouldRemove) {
                                const titleElem = card.querySelector(SELECTORS.TITLE);
                                const title = titleElem ? titleElem.title || titleElem.textContent : "";
                                if (title && isTitleBlocked(title)) {
                                    shouldRemove = true;
                                    removeReason = "标题含屏蔽关键词";
                                }
                            }
                        }

                        // 如果需要移除，执行移除操作
                        if (shouldRemove && cardContainer) {
                            console.log(`移除卡片 - 原因: ${removeReason}`, cardContainer);
                            
                            // 先标记为已删除，避免DOM刷新时重复处理
                            cardContainer.setAttribute("data-removed", "true");
                            
                            // 移除卡片
                            cardContainer.remove();
                        }
                    } catch (error) {
                        console.error("处理卡片时出错:", error);
                    }
                })
            );

            processedCards = cards.length;

            // 修复布局
            fixGridLayout();
        } catch (error) {
            console.error("Error in blockCards:", error);
        } finally {
            isBlockCardsRunning = false;
        }

        // Double check for any missed buttons
        document.querySelectorAll(SELECTORS.ALL_CARDS).forEach((card) => {
            if (!card.querySelector(`.${SELECTORS.BLOCK_BUTTON}`)) {
                const uid = getUid(card, SELECTORS);
                if (uid !== -1) {
                    addBlockUIButton(card, uid, SELECTORS);
                }
            }
        });
    }

    async function initMenu(utils) {
        GM_registerMenuCommand("编辑标题过滤规则", () => {
            utils.editTitlePatterns(blockedTitlePatterns, GM_setValue);
        });
    }

    function addBlockButtonToSpace(utils) {
        if (!document.body) {
            setTimeout(addBlockButtonToSpace, 100);
            return;
        }

        const pathname = window.location.pathname;
        const uid = pathname.split("/")[1];

        // Verify it's a valid numeric UID
        if (!uid || !uid.match(/^\d+$/)) {
            return;
        }

        const targetElementId = "space-block-button";
        if (document.getElementById(targetElementId)) {
            return;
        }

        let btn = utils.createButtonFromCallback("Block User", () => {
            const numericUid = Number(uid);
            if (blockedUIDs.has(numericUid)) {
                removeBlockedUID(numericUid);
                blockButton.textContent = "Block User";
            } else {
                addBlockedUID(numericUid);
                blockButton.textContent = "Unblock User";
            }
        });
        btn.id = targetElementId;
        utils.addFixedPosContainerToPage(btn, { top: "130px", left: "390px" });
    }

    async function init() {
        const utils = await waitForUtils();

        // Initialize menu
        initMenu(utils);

        // Check if we're on the space page or main page
        if (window.location.hostname === "space.bilibili.com") {
            addBlockButtonToSpace(utils);
            setupObserver(() => addBlockButtonToSpace(utils));
        } else {
            // Homepage functionality - block cards on scroll/timer
            blockCards();

            // Add scroll event listener
            window.addEventListener(
                "scroll",
                throttle(() => {
                    blockCards();
                }, 300)
            );

            // Add periodic trigger every 2 seconds
            setInterval(() => {
                blockCards();
            }, 2000);

            setupObserver(blockCards);
        }
    }

    init();

    // 添加修复布局的函数
    function fixGridLayout() {
        // 获取所有的视频卡片网格容器
        const gridContainers = document.querySelectorAll(SELECTORS.GRID_CONTAINER);
        
        gridContainers.forEach(gridContainer => {
            // 重新排列每行中的卡片
            const visibleCards = Array.from(gridContainer.querySelectorAll(SELECTORS.CARD_CONTAINER))
                .filter(card => !card.hasAttribute('data-removed') && 
                               getComputedStyle(card).display !== 'none');
            
            // 计算每行应有的卡片数量（基于第一行的可见卡片数量）
            const firstRowCards = visibleCards.slice(0, 5); // 假设最多5个卡片一行
            let cardsPerRow = firstRowCards.length;
            if (cardsPerRow === 0 && visibleCards.length > 0) {
                cardsPerRow = Math.min(5, visibleCards.length); // 默认为5或可见卡片总数
            }
            
            if (cardsPerRow > 0) {
                // 重新布置所有卡片
                visibleCards.forEach((card, index) => {
                    // 将卡片添加到对应的行中
                    const rowIndex = Math.floor(index / cardsPerRow);
                    const colIndex = index % cardsPerRow;
                    
                    // 设置卡片在网格中的位置
                    card.style.order = rowIndex * cardsPerRow + colIndex;
                    card.style.display = 'block';
                    card.style.gridColumn = `${colIndex + 1}`;
                    card.style.gridRow = `${rowIndex + 1}`;
                });
            }
        });
    }
})();

// Function to create and set up an observer
function setupObserver(callback) {
    const observer = new MutationObserver(
        throttle(() => {
            callback();
        }, 300)
    );

    // Wait for body to be available before observing
    if (!document.body) {
        window.addEventListener("DOMContentLoaded", () => {
            observer.observe(document.body, {
                childList: true,
                subtree: true,
            });
        });
    } else {
        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    return observer;
}

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

function getUid(card, SELECTORS) {
    const ownerLink = card.querySelector(SELECTORS.OWNER_LINK);
    if (!ownerLink) return -1;

    const uid = ownerLink.href.split("/").pop();
    return uid.match(/^\d+$/) ? Number(uid) : -1;
}

async function getFollower(uid, API_USERDATA) {
    // 传入uid，返回follower数
    const response = await fetch(`${API_USERDATA}${uid}`);
    const data = await response.json();
    if (data.code === 0) {
        return data.data.follower;
    } else {
        console.error(`getFollower error, uid: ${uid}, message: ${data.message}`);
        return -1;
    }
}
