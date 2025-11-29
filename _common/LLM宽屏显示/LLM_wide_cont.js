// ==UserScript==
// @name        LLM 宽屏显示
// @namespace   https://claude.ai/
// @version     0.1.2
// @description 使 LLM 的内容更宽敞，提升阅读体验
// @author      gtfish
// @match       https://claude.ai/*
// @match       https://gemini.google.com/*
// @grant        GM_addStyle
// @grant        GM_log
// @license     GPL
// @updateURL       https://github.com/tgaochn/tampermonkey_script/raw/refs/heads/master/_common/LLM%E5%AE%BD%E5%B1%8F%E6%98%BE%E7%A4%BA/LLM_wide_cont.js
// @downloadURL     https://github.com/tgaochn/tampermonkey_script/raw/refs/heads/master/_common/LLM%E5%AE%BD%E5%B1%8F%E6%98%BE%E7%A4%BA/LLM_wide_cont.js
// ==/UserScript==
// forked from `更宽的AI对话窗口`: https://greasyfork.org/zh-CN/scripts/499377-wider-ai-chat/code
// 0.1.1: 更新 @match, 换账户也可以使用 gemini
// 0.1.0: 增加claude初始页面input box宽度修改; 增加gemini的input box宽度修改
// 0.0.1: 只保留claude/gemini

(function () {
    var limit_answer_height = false;

    if (/gemini.google.com/.test(location.href)) {
        console.log("gemini");
        GM_addStyle(`
      #chat-history > infinite-scroller > div {
        max-width: calc(100% - 20px);
      }
      #app-root > main > side-navigation-v2 > bard-sidenav-container > bard-sidenav-content > div > div > div.content-container > chat-window > div.chat-container.ng-star-inserted > div.bottom-container.response-optimization.ng-star-inserted {
        max-width: calc(100% - 20px);
      }

      /* --- Rules for input area container and text field --- */
      div.input-area-container.ng-star-inserted {
        display: flex !important;
        flex-direction: column !important;
        max-width: calc(100% - 40px) !important; /* Centered with some padding */
        margin: 0 auto !important; /* Center the container */
        width: 100%; /* Use available width up to max-width */
      }
      div.input-area-container.ng-star-inserted .text-input-field {
        width: 100% !important;
      }
      /* --- End rules for input area --- */
      `);
    } else if (/claude.ai/.test(location.href)) {
        console.log("claude"); // Explicitly for claude.ai

        const chatWiderStyle = `
      .xl\:max-w-\[48rem\] {
        width:95% !important;
        max-width:96% !important;
      }
      div.mx-auto.md:max-w-3xl {
        max-width: calc(100% - 10px);
      }
      div.mx-auto.flex {
        max-width: calc(100% - 10px);
      }
      div.ProseMirror.break-words.ProseMirror-focused {
        max-width:100%;
      }
      body > div.flex.min-h-screen.w-full div.flex.flex-col div.flex.gap-2 div.mt-1.max-h-96.w-full.overflow-y-auto.break-words > div.ProseMirror.break-words{
        max-width:90%;
      }
  
      body > div.flex.min-h-screen.w-full > div > main > div.top-5.z-10.mx-auto.w-full.max-w-2xl.md{
        max-width:100%;
      }
  
      body > div.flex.min-h-screen.w-full > div > main > div.mx-auto.w-full.max-w-2xl.px-1.md {
        max-width:100%;
      }
      body > div.flex.min-h-screen.w-full > div > main.max-w-7xl {
        max-width: 90rem;
      }
      main > div.composer-parent  article > div.text-base > div.mx-auto {
        max-width: 95%;
      }
      main article > div.text-base > div.mx-auto {
        max-width: 95%;
      }

      /* --- Rules for input area container for claude initial page --- */
      body > div.flex.min-h-screen.w-full > div > main > div.top-5.z-10.mx-auto.w-full > div.mx-auto.max-w-2xl { max-width: 95% !important; }
      /* --- End rules for input area --- */
      `;

        if (limit_answer_height) {
            GM_addStyle(`
      pre > div.rounded-md > div.overflow-y-auto {
        max-height: 50vh;
        overflow: auto;
        scrollbar-width: thin;
        scrollbar-color: #aaaa #1111;
      }
      .code-block__code {
        max-height: 50vh;
        overflow: auto;
        scrollbar-width: thin;
        scrollbar-color: #aaaa #1111;
      }
      pre > div.rounded-md > div.overflow-y-auto ::-webkit-scrollbar-track {
        background: #1111;
      }
      pre > div.rounded-md > div.overflow-y-auto ::-webkit-scrollbar-thumb {
        background: #aaaa;
      }
      pre > div.rounded-md > div.overflow-y-auto ::-webkit-scrollbar-thumb:hover {
        background: #0008;
      }
      `);
        }

        GM_addStyle(chatWiderStyle);

        enhanceAddStyle();

        function enhanceAddStyle(setStyle) {
            const chat = document.querySelector("main > div.composer-parent  article > div.text-base > div.mx-auto");
            if (chat) {
                if (window.getComputedStyle(chat).maxWidth != "95%") {
                    GM_addStyle(chatWiderStyle);
                }
            } else {
                setTimeout(enhanceAddStyle, 1100);
            }
        }

        function link_addhref() {
            document.querySelectorAll('div[data-message-id] a[rel="noreferrer"]').forEach(function (item) {
                if (!item.href) {
                    item.href = item.innerText;
                    item.target = "_blank";
                }
            });
            setTimeout(link_addhref, 1800);
        }
        link_addhref();
    }
})();
