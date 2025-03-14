// ==UserScript==
// @name         blockVideoCardOnBilibiliHP
// @version      0.1.2
// @description  屏蔽部分B站（bilibili）主页推荐的视频卡片，屏蔽up主粉丝少于一定数量的，屏蔽直播与右侧推广，屏蔽带广告标签的
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
// 0.1.2: block 按钮改到右下角, 时长之上
// 0.1.1: block 按钮改到左上角
// 0.1.0: 视频卡片屏蔽按钮增加定时刷新的功能, 点reload后可以自动添加屏蔽按钮/在space页面也可以屏蔽up主
// 0.0.1: init, 每个视频卡片上添加屏蔽作者功能/根据视频title屏蔽/title可以在设置栏修改; 不支持reload
// forked from https://greasyfork.org/scripts/467384 by anonymous, version 1.2

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
                    const uid = getUid(card, SELECTORS);

                    // Skip invalid cards
                    if (uid === -1) {
                        console.error(`remove because getUid error, uid: ${uid}`);
                        card.remove();
                        return;
                    }

                    // Check blocking conditions
                    if (SELECTORS.BLOCKED_CLASSES.includes(card.className) || blockedUIDs.has(uid)) {
                        card.remove();
                        return;
                    }

                    // Check follower count
                    const follower = await getFollower(uid, API_USERDATA);
                    if (follower < MIN_FOLLOWER) {
                        card.remove();
                        return;
                    }

                    // Check title blocking
                    const title = card.querySelector(SELECTORS.TITLE)?.title;
                    if (title && isTitleBlocked(title)) {
                        card.remove();
                        return;
                    }
                })
            );

            processedCards = cards.length;
        } catch (error) {
            console.error("Error in blockCards:", error);
        } finally {
            isBlockCardsRunning = false;
        }

        // Double check for any missed buttons
        cards.forEach((card) => {
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
