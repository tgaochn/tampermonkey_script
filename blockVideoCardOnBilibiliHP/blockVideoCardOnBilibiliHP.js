// ==UserScript==
// @name         blockVideoCardOnBilibiliHP
// @version      0.0.1
// @description  屏蔽部分B站（bilibili）主页推荐的视频卡片，屏蔽up主粉丝少于一定数量的，屏蔽直播与右侧推广，屏蔽带广告标签的
// @author       gtfish
// @match        https://www.bilibili.com/
// @match        https://www.bilibili.com/?spm_id_from=*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @license      GNU General Public License v3.0
// ==/UserScript==
// 0.0.1: init, 每个视频卡片上添加屏蔽作者功能/根据视频title屏蔽
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
    // 定义需要屏蔽的两种视频卡片类名
    const BLOCKED_CLASSES = ["floor-single-card", "bili-live-card is-rcmd"];

    // !! Other constants
    const MIN_FOLLOWER = 10000; // 定义需要屏蔽的最小的follower数
    const API_USERDATA = "https://api.bilibili.com/x/relation/stat?vmid="; // 定义接口前缀

    // ! 使用tampermonkey的GM_getValue和GM_setValue来存储和获取变量
    let blockedUIDs = new Set(GM_getValue("blockedUIDs", []));
    let blockedTitlePatterns = new Set(
        GM_getValue("blockedTitlePatterns", [
            // default patterns
            ".*⚡.*",
            ".*⚡1.*",
            ".*⚡2.*",
        ])
    );

    let processedCards = 0; //定义已处理卡片数量
    let isBlockCardsRunning = false; // 防止多次调用blockCards

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
        if (!card.classList.contains(SELECTORS.VIDEO_CARD) || card.querySelector(SELECTORS.BLOCK_BUTTON)) {
            return;
        }

        const blockButton = document.createElement("button");
        blockButton.className = SELECTORS.BLOCK_BUTTON;
        blockButton.textContent = "Block";
        blockButton.style.cssText = `
            position: absolute;
            top: 5px;
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
    }

    async function isBlockedCard(card, uid) {
        // ! 判断是否需要屏蔽

        // 直播与右侧推广，屏蔽带广告标签的
        if (BLOCKED_CLASSES.includes(card.className)) {
            return true;
        }

        // 如果follower小于MIN_FOLLOWER，就remove
        const follower = await getFollower(uid, API_USERDATA);
        if (follower < MIN_FOLLOWER) {
            return true;
        }

        // Remove if UID is in blocked list
        if (blockedUIDs.has(uid)) {
            return true;
        }

        // 根据视频title屏蔽
        const title = card.querySelector(SELECTORS.TITLE).title;
        if (isTitleBlocked(title)) {
            return true;
        }

        return false;
    }

    async function blockCards() {
        if (isBlockCardsRunning) {
            return;
        }
        isBlockCardsRunning = true;

        const cards = document.querySelectorAll(SELECTORS.ALL_CARDS);

        for (let i = processedCards; i < cards.length; i++) {
            const card = cards[i];
            const uid = getUid(card, SELECTORS);

            // 获取uid，如果获取失败，就remove
            if (uid === -1) {
                console.error(`remove because getUid error, uid: ${uid}`);
                card.remove();
                continue;
            }

            // 判断是否需要屏蔽
            if (await isBlockedCard(card, uid)) {
                card.remove();
                continue;
            }

            addBlockUIButton(card, uid, SELECTORS); // 添加屏蔽按钮
            processedCards++;
        }

        isBlockCardsRunning = false;
    }

    async function initMenu() {
        GM_registerMenuCommand("编辑标题过滤规则", editTitlePatterns);
    }

    async function editTitlePatterns() {
        try {
            const currentPatterns = Array.from(blockedTitlePatterns).join("\n");
            const newPatterns = await createMultilineDialog(
                "编辑标题过滤规则",
                currentPatterns,
                "每行输入一个正则表达式\n例如：\n广告\n.*赞助.*\n.*合作.*"
            );

            if (newPatterns !== null) {
                blockedTitlePatterns.clear();
                const patterns = newPatterns.split("\n");
                patterns
                    .map((p) => p.trim())
                    .filter((p) => p)
                    .forEach((p) => {
                        try {
                            new RegExp(p);
                            blockedTitlePatterns.add(p);
                        } catch (e) {
                            console.error(`Invalid regex pattern: ${p}`, e);
                        }
                    });
                GM_setValue("blockedTitlePatterns", Array.from(blockedTitlePatterns));
                location.reload();
            }
        } catch (error) {
            console.error("Error in editTitlePatterns:", error);
        }
    }

    async function init() {
        // Initialize menu
        initMenu();

        // Initial run
        blockCards();

        // Add scroll event listener
        window.addEventListener(
            "scroll",
            throttle(() => {
                blockCards();
            }, 400)
        );

        // Add mutation observer to detect new cards
        const observer = new MutationObserver(
            throttle(() => {
                blockCards();
            }, 400)
        );

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    init();
})();

function throttle(func, delay) {
    // 节流函数，防止过于频繁的调用
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
    if (ownerLink) {
        const uid = ownerLink.href.split("/").pop();

        if (uid.match(/^\d+$/)) {
            return Number(uid);
        } else {
            console.error(`getUid error, uid: ${uid}`);
            return -1;
        }
    }

    console.error(`getUid error, ownerLink error, ownerLink: ${ownerLink}`);
    return -1;
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

function createMultilineDialog(title, currentText, placeholder) {
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
        textarea.value = currentText;
        textarea.placeholder = placeholder;
        textarea.style.cssText = `
            width: 100%;
            height: 200px;
            margin-bottom: 15px;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            resize: vertical;
        `;

        // Add buttons
        const buttonContainer = document.createElement("div");
        buttonContainer.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        `;

        const saveButton = document.createElement("button");
        saveButton.textContent = "保存";
        saveButton.style.cssText = `
            padding: 8px 16px;
            background: #fb7299;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;

        const cancelButton = document.createElement("button");
        cancelButton.textContent = "取消";
        cancelButton.style.cssText = `
            padding: 8px 16px;
            background: #e0e0e0;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;

        // Event handlers
        function handleSave() {
            const value = textarea.value;
            modal.remove();
            resolve(value);
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
}
