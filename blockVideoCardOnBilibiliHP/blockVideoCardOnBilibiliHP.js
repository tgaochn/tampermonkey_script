// ==UserScript==
// @name         blockVideoCardOnBilibiliHP
// @version      0.2.0
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

// ==/UserScript==
// 0.2.0: 修复了视频卡片的布局问题, 使其在屏蔽后不会出现空白区域
// 0.1.2: block 按钮改到右下角, 时长之上
// 0.1.1: block 按钮改到左上角
// 0.1.0: 视频卡片屏蔽按钮增加定时刷新的功能, 点reload后可以自动添加屏蔽按钮/在space页面也可以屏蔽up主
// 0.0.1: init, 每个视频卡片上添加屏蔽作者功能/根据视频title屏蔽/title可以在设置栏修改; 不支持reload

// forked from https://greasyfork.org/scripts/467384 by anonymous, version 1.2
// 不能屏蔽左上角大幅滚动视频和直播视频, 这两者可以用 AdBlock 屏蔽

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
        
        // 卡片容器选择器 - 更新为正确的选择器结构
        CARD_CONTAINER: ".feed-card",
        VIDEO_CARD_IN_CONTAINER: ".bili-video-card",
        OWNER_LINK_IN_CONTAINER: ".bili-video-card__info--owner",
        TITLE_IN_CONTAINER: ".bili-video-card__info--tit", 
        
        // 备用选择器
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
        // 检查是否已有按钮
        if (card.querySelector(`.${SELECTORS.BLOCK_BUTTON}`)) {
            return;
        }

        try {
            console.log(`尝试为UID ${uid}添加屏蔽按钮`);
            
            // 创建按钮
            const blockButton = document.createElement("button");
            blockButton.className = SELECTORS.BLOCK_BUTTON;
            blockButton.textContent = blockedUIDs.has(uid) ? "Unblock" : "Block";
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
                    // 找到整个卡片容器并删除
                    const container = card.closest(SELECTORS.CARD_CONTAINER);
                    if (container) {
                        container.remove();
                    } else {
                        card.remove();
                    }
                }
            };

            blockButton.onmouseover = () => {
                blockButton.style.backgroundColor = "rgba(220, 20, 20, 0.9)";
            };
            blockButton.onmouseout = () => {
                blockButton.style.backgroundColor = "rgba(220, 20, 20, 0.7)";
            };

            // 确保卡片有relative定位，以便按钮定位正确
            if (getComputedStyle(card).position !== "relative") {
                card.style.position = "relative";
            }
            
            // 添加按钮到卡片
            card.appendChild(blockButton);
            console.log(`成功为UID ${uid}添加了屏蔽按钮`);
        } catch (error) {
            console.error("Error adding block button:", error, "Card:", card, "UID:", uid);
        }
    }

    async function processCardContainers() {
        if (isBlockCardsRunning) {
            return;
        }
        isBlockCardsRunning = true;

        try {
            // 检查页面元素
            const feedCards = document.querySelectorAll(SELECTORS.CARD_CONTAINER);
            const videoCards = document.querySelectorAll(SELECTORS.VIDEO_CARD_IN_CONTAINER);
            
            console.log(`找到 ${feedCards.length} 个卡片容器和 ${videoCards.length} 个视频卡片`);
            
            // 直接处理每个视频卡片，不管它的父容器
            const allVideoCards = Array.from(videoCards);
            
            // 过滤出未处理的卡片（没有屏蔽按钮的卡片）
            const unprocessedCards = allVideoCards.filter(card => {
                return !card.querySelector(`.${SELECTORS.BLOCK_BUTTON}`);
            });
            
            console.log(`找到 ${unprocessedCards.length} 个未处理的视频卡片`);
            
            // 定义卡片处理函数
            const processCard = async (videoCard, retryCount = 0) => {
                try {
                    // 查找UP主链接
                    const ownerLink = videoCard.querySelector(SELECTORS.OWNER_LINK_IN_CONTAINER) || 
                                     videoCard.querySelector(SELECTORS.OWNER_LINK);
                    
                    if (!ownerLink) {
                        if (retryCount < 2) { // 尝试最多3次（初始+2次重试）
                            console.log(`未找到UP主链接，将在1秒后重试 #${retryCount + 1}`);
                            await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒后重试
                            return processCard(videoCard, retryCount + 1);
                        }
                        console.log("多次尝试后仍未找到UP主链接，跳过此卡片", videoCard);
                        return;
                    }
                    
                    // 获取UID
                    const uidMatch = ownerLink.href.match(/\/(\d+)/);
                    if (!uidMatch) {
                        if (retryCount < 2) {
                            console.log(`无法获取有效UID，将在1秒后重试 #${retryCount + 1}`);
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            return processCard(videoCard, retryCount + 1);
                        }
                        console.log("多次尝试后仍无法获取有效UID，跳过此卡片", ownerLink.href);
                        return;
                    }
                    
                    const uid = parseInt(uidMatch[1], 10);
                    
                    // 添加屏蔽按钮
                    addBlockUIButton(videoCard, uid, SELECTORS);
                    
                    // 判断是否需要屏蔽
                    let shouldRemove = false;
                    let removeReason = "";
                    
                    // 检查是否是被屏蔽的用户
                    if (blockedUIDs.has(uid)) {
                        shouldRemove = true;
                        removeReason = "被屏蔽的用户";
                    } else {
                        // 检查粉丝数
                        try {
                            const follower = await getFollower(uid, API_USERDATA);
                            if (follower > 0 && follower < MIN_FOLLOWER) {
                                shouldRemove = true;
                                removeReason = `粉丝数低于${MIN_FOLLOWER}`;
                            }
                        } catch (error) {
                            console.error(`获取粉丝数失败, uid: ${uid}`, error);
                            // 获取粉丝数失败不应导致卡片被移除
                        }
                        
                        // 检查标题是否匹配屏蔽关键词
                        if (!shouldRemove) {
                            const titleElem = videoCard.querySelector(SELECTORS.TITLE_IN_CONTAINER) || 
                                             videoCard.querySelector(SELECTORS.TITLE);
                            const title = titleElem ? titleElem.title || titleElem.textContent : "";
                            if (title && isTitleBlocked(title)) {
                                shouldRemove = true;
                                removeReason = "标题含屏蔽关键词";
                            }
                        }
                    }
                    
                    // 如果需要屏蔽，找到并移除整个卡片容器
                    if (shouldRemove) {
                        // 找到视频卡片所在的feed-card容器
                        const feedCard = videoCard.closest(SELECTORS.CARD_CONTAINER);
                        
                        if (feedCard) {
                            console.log(`移除卡片容器 - 原因: ${removeReason}`, feedCard);
                            feedCard.remove();
                        } else {
                            // 如果找不到feed-card容器，直接移除视频卡片
                            console.log(`移除视频卡片 - 原因: ${removeReason}`, videoCard);
                            videoCard.remove();
                        }
                    }
                    
                } catch (error) {
                    console.error("处理视频卡片时出错:", error);
                    // 错误情况下可以选择重试
                    if (retryCount < 2) {
                        console.log(`处理卡片出错，将在1秒后重试 #${retryCount + 1}`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        return processCard(videoCard, retryCount + 1);
                    }
                }
            };
            
            // 使用Promise.all并发处理所有卡片，提高性能
            if (unprocessedCards.length > 0) {
                await Promise.all(unprocessedCards.map(card => processCard(card)));
                console.log("所有卡片处理完成");
            }
        } catch (error) {
            console.error("处理卡片容器时出错:", error);
        } finally {
            isBlockCardsRunning = false;
        }
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
            // 处理首屏视频卡片 - 确保尽早执行
            console.log("首次执行过滤，处理初始卡片");
            processCardContainers();
            
            // 添加一个短延迟后的第二次处理，捕获可能的延迟加载内容
            setTimeout(processCardContainers, 800);

            // Homepage functionality - block cards on scroll/timer
            window.addEventListener(
                "scroll",
                throttle(() => {
                    processCardContainers();
                }, 300)
            );

            // Add periodic trigger
            setInterval(() => {
                processCardContainers();
            }, 2000);

            setupObserver(() => {
                processCardContainers();
            });
        }
    }

    // 处理所有卡片的函数，重置已处理计数并完全重新处理
    function processAllCards() {
        processedCards = 0;  // 重置计数器，强制处理所有卡片
        processCardContainers();
    }

    init();
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
    // 首先尝试直接使用新选择器
    const ownerLink = card.querySelector(SELECTORS.OWNER_LINK_IN_CONTAINER) || 
                     card.querySelector(SELECTORS.OWNER_LINK);
                     
    if (!ownerLink) {
        console.log("没有找到UP主链接元素");
        return -1;
    }

    const uidMatch = ownerLink.href.match(/\/(\d+)/);
    if (!uidMatch) {
        console.log("无法从链接中提取UID", ownerLink.href);
        return -1;
    }

    return parseInt(uidMatch[1], 10);
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
