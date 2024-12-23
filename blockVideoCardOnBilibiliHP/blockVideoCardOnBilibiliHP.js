// ==UserScript==
// @name         blockVideoCardOnBilibiliHP
// @version      0.0.1
// @description  屏蔽部分B站（bilibili）主页推荐的视频卡片，屏蔽up主粉丝少于一定数量的，屏蔽直播与右侧推广，屏蔽带广告标签的
// @author       gtfish
// @match        https://www.bilibili.com/
// @match        https://www.bilibili.com/?spm_id_from=*
// @grant        GM_getValue
// @grant        GM_setValue
// @license      GNU General Public License v3.0
// ==/UserScript==
// 0.0.1: init, 添加视频作者黑名单功能/每个视频卡片上添加屏蔽作者功能/
// forked from https://greasyfork.org/scripts/467384 by anonymous, version 1.2

(function () {
    "use strict";

    // 定义需要屏蔽的两种视频卡片类名
    const BLOCKED_CLASSES = ["floor-single-card", "bili-live-card is-rcmd"];
    // 定义需要屏蔽的最小的follower数
    const MIN_FOLLOWER = 10000;

    // 定义接口前缀
    const api_userdata = "https://api.bilibili.com/x/relation/stat?vmid=";

    // 定义已处理卡片数量
    let processedCards = 0;
    // 防止多次调用blockCards
    let isBlockCardsRunning = false;

    async function isBlockCard(card) {
        // ! 判断是否需要屏蔽

        // 直播与右侧推广，屏蔽带广告标签的
        if (BLOCKED_CLASSES.includes(card.className)) {
            return true;
        }

        // 获取uid，如果获取失败，就remove
        const uid = getUid(card, processedCards);
        if (uid === -1) {
            console.error(`remove because getUid error, uid: ${uid}`);
            return true;
        }

        // 如果follower小于MIN_FOLLOWER，就remove
        const follower = await getFollower(uid, api_userdata);
        if (follower < MIN_FOLLOWER) {
            return true;
        }
    }

    async function blockCards() {
        if (isBlockCardsRunning) {
            return;
        }
        isBlockCardsRunning = true;

        const cards = document.querySelectorAll(
            ".bili-video-card.is-rcmd, .floor-single-card, .bili-live-card.is-rcmd"
        );
        for (let i = processedCards; i < cards.length; i++) {
            const card = cards[i];
            if (await isBlockCard(card)) {
                card.remove();
                continue;
            }

            processedCards++;
        }
        isBlockCardsRunning = false;
    }

    window.addEventListener("scroll", throttle(blockCards, 400));
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

function getUid(card, processedCards) {
    // 传入一个视频卡片，获取其中的uid并转化为数字并返回
    const ownerLink = card.querySelector(".bili-video-card__info--owner");
    if (ownerLink) {
        const uid = ownerLink.href.split("/").pop();

        if (uid.match(/^\d+$/)) {
            return Number(uid);
            // return uid;
        } else {
            console.error(`getUid error, processedCards: ${processedCards}, uid: ${uid}`);
            return -1;
        }
    }

    console.error(`getUid error, ownerLink error, processedCards: ${processedCards}, ownerLink: ${ownerLink}`);
    return -1;
}

async function getFollower(uid, api_userdata) {
    // 传入uid，返回follower数
    const response = await fetch(`${api_userdata}${uid}`);
    const data = await response.json();
    if (data.code === 0) {
        return data.data.follower;
    } else {
        console.error(`getFollower error, uid: ${uid}, message: ${data.message}`);
        return -1;
    }
}
