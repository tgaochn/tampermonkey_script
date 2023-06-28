// ==UserScript==
// @name        chatGPT_add_buttons 
// @namespace   https://chat.openai.com/
// @version     0.1.6
// @description Adds more buttons for chatGPT; modified from "Add continue button (页面优化) v1.2.1"
// @author      gtfish
// @match       https://chat.openai.com/*
// @grant       none
// @license     GPL
// @updateURL       https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/chatGPT_add_buttons/chatGPT_add_buttons.js
// @downloadURL     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/chatGPT_add_buttons/chatGPT_add_buttons.js
// ==/UserScript==

// 0.1.6: 增加新按钮
// 0.1.5: 优化按钮功能, 可以直接send msg
// 0.1.4: 优化按钮功能
// 0.1.3: debug
// 0.1.2: 测试自动更新
// 0.1.1: 测试自动更新
// 0.1.0: 优化按钮功能
// 0.0.2: 添加自动更新
// 0.0.1: init, 添加若干按钮

// 修改自 Add continue button (页面优化) v1.2.1
// https://greasyfork.org/en/scripts/456240-chatgpt-continue-button

(function () {
    'use strict';

    function createButton(text, handler) {
        const button = document.createElement('button');
        button.className = 'custombtn btn relative btn-neutral border-0 md:border';
        button.innerHTML = text;
        button.onclick = handler;
        return button;
    }

    function addButtonIfNotExists() {
        if (document.querySelector('.custombtn')) {
            return;
        }

        const textBox = document.querySelector('#__next main form > div > div:first-of-type');
        if (!textBox) {
            return;
        }

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'inline';
        buttonContainer.style.justifyContent = 'center';
        buttonContainer.style.marginBottom = '10px';
        buttonContainer.style.marginLeft = '10px';

        // button: continue
        buttonContainer.append(
            createButton('Continue⏎', function () {
                const textArea = document.querySelector('textarea');
                textArea.value = 'Is the answer finished? if not, please continue answering. If the response ends with a code truncation, output the remaining code in the code box rather than starting over. If it is already finished, reply with "The answer is finished."'
                textArea.focus();

                // Trigger the input event to make the textarea send the message
                const inputEvent = new Event('input', { bubbles: true });
                textArea.dispatchEvent(inputEvent);
            })
        );

        // button: Rewrite
        buttonContainer.append(
            createButton('Rewrite⏎', function () {
                const textArea = document.querySelector('textarea');
                textArea.value = 'Rewrite the response';
                textArea.focus();

                // Trigger the input event to make the textarea send the message
                const inputEvent = new Event('input', { bubbles: true });
                textArea.dispatchEvent(inputEvent);
            })
        );       

        // button: repeat the response in chinese
        buttonContainer.append(
            createButton('Chinese⏎', function () {
                const textArea = document.querySelector('textarea');
                textArea.value = 'repeat the response in chinese and explain in details what it implies';
                textArea.focus();

                // Trigger the input event to make the textarea send the message
                const inputEvent = new Event('input', { bubbles: true });
                textArea.dispatchEvent(inputEvent);
            })                
        );

        // button: Example
        buttonContainer.append(
            createButton('Example⏎', function () {
                const textArea = document.querySelector('textarea');
                textArea.value = 'give me more examples to explain the response';
                textArea.focus();
                
                // Trigger the input event to make the textarea send the message
                const inputEvent = new Event('input', { bubbles: true });
                textArea.dispatchEvent(inputEvent);
            })
        );
 
        // button: 中翻英
        buttonContainer.append(
            createButton('中翻英', function () {
                const textArea = document.querySelector('textarea');
                textArea.value = 'translate the following Chinese text into English in a conversational tone: ';
                textArea.focus();
            })
        );
 
        // button: 改写
        buttonContainer.append(
            createButton('改写', function () {
                const textArea = document.querySelector('textarea');
                textArea.value = 'Rewrite the following text in different tones, which will be used in project documents, daily messages between colleagues, and formal emails: ';
                textArea.focus();
            })
        );

        // button: 翻译
        buttonContainer.append(
            createButton('解释翻译', function () {
                const textArea = document.querySelector('textarea');
                textArea.value = 'For the following test, explain in detail what it implies in English. Then, translate it and do the explanation again in Chinese: ';
                textArea.focus();
            })
        );

        // button: 总结
        buttonContainer.append(
            createButton('总结', function () {
                const textArea = document.querySelector('textarea');
                textArea.value = 'Summarize the following text in both English and Chinese in a paragraph then reformat it in some bullets: ';
                textArea.focus();
            })
        );

        textBox.appendChild(buttonContainer);
        textBox.style.display = 'inline';

        const divElements = textBox.querySelectorAll('div');
        for (let i = 0; i < divElements.length; i++) {
            divElements[i].style.display = 'inline';
        }
    }

    function disableJustifyCenterForBtn() {
        const btnToCheck = document.getElementsByClassName('btn relative btn-neutral border-0 md:border');
        if (btnToCheck.length === 0) {
            return false;
        }
        for (let i = 0; i < btnToCheck.length; i++) {
            const parentDiv = btnToCheck[i].parentNode;
            parentDiv.classList.remove('justify-center');
        }
        return true;
    }

    function adjustModelSwitcher() {
        const modelSwitcher = document.getElementById('chatgpt-model-switcher');
        if (modelSwitcher) {
            modelSwitcher.style.display = 'inline';
            modelSwitcher.style.width = 'auto';
            modelSwitcher.style.marginLeft = '10px';
            return true;
        }
        return false;
    }

    const targetNode = document.body;
    const config = { childList: true, subtree: true };
    const observer = new MutationObserver((mutationsList, observer) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                const buttonAdded = addButtonIfNotExists();
                const btnDisabled = disableJustifyCenterForBtn();
                const modelSwitcherAdjusted = adjustModelSwitcher();
                if (buttonAdded && btnDisabled && modelSwitcherAdjusted) {
                    observer.disconnect();
                }
            }
        }
    });

    observer.observe(targetNode, config);
})();