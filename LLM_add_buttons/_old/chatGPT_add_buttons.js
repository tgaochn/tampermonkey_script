// ==UserScript==
// @name        chatGPT_add_buttons 
// @namespace   https://chat.openai.com/
// @version     0.3.4
// @description Adds more buttons for chatGPT; modified from "Add continue button (页面优化) v1.2.1"
// @author      gtfish
// @match       https://chat.openai.com/*
// @grant       none
// @license     GPL
// @updateURL       https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/LLM_add_buttons/chatGPT_add_buttons.js
// @downloadURL     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/LLM_add_buttons/chatGPT_add_buttons.js
// ==/UserScript==

// 0.3.3: 增加了几个重要prompt
// 0.3.3: bug fix
// 0.3.0: 增加了几个重要prompt
// 0.2.0: 优化按钮位置, 优化输入框位置
// 0.1.8: 修改某些按钮, 现在可以配合 Superpower ChatGPT 插件使用
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
        buttonContainer.style.display = 'inline-block';
        buttonContainer.style.justifyContent = 'center';
        buttonContainer.style.marginBottom = '10px';
        buttonContainer.style.marginLeft = '10px';

        const buttonContainer2 = document.createElement('div');
        buttonContainer2.style.display = 'inline-block';
        buttonContainer2.style.justifyContent = 'center';
        buttonContainer2.style.marginBottom = '10px';
        buttonContainer2.style.marginLeft = '10px';

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
            createButton('中文⏎', function () {
                const textArea = document.querySelector('textarea');
                textArea.value = 'repeat the response in chinese and explain in details what it implies';
                textArea.focus();

                // Trigger the input event to make the textarea send the message
                const inputEvent = new Event('input', { bubbles: true });
                textArea.dispatchEvent(inputEvent);
            })
        );

        // button: repeat the response in chinese
        buttonContainer.append(
            createButton('markdown⏎', function () {
                const textArea = document.querySelector('textarea');
                textArea.value = 'Reformat the response in markdown code format so I can copy and paste.';
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

        // button: 改写
        buttonContainer2.append(
            createButton('改写', function () {
                const textArea = document.querySelector('textarea');
                textArea.value = 'Rewrite the following text in different tones, which will be used in project documents, messages between colleagues, and formal emails: \n';
                textArea.focus();
            })
        );

        // button: 翻译
        buttonContainer2.append(
            createButton('解释翻译', function () {
                const textArea = document.querySelector('textarea');
                textArea.value = 'For the following test, explain in detail what it means and what it may possibly imply (in English). Then, translate it and do the explanation again in Chinese:\n ';
                textArea.focus();
            })
        );

        // button: 总结
        buttonContainer2.append(
            createButton('总结', function () {
                const textArea = document.querySelector('textarea');
                textArea.value = 'Summarize the following text in both English and Chinese in a paragraph then reformat it in some bullets: \n';
                textArea.focus();
            })
        );

        // button: 解释, 英翻中
        buttonContainer2.append(
            createButton('解释, 英翻中', function () {
                const textArea = document.querySelector('textarea');
                textArea.value = 'What is "XXX". What does it mean in this content. Give me a detailed explanation and some examples in English. Then translate the response into Chinese.';
                textArea.focus();
            })
        );

        // button: 中翻英
        buttonContainer2.append(
            createButton('中翻英', function () {
                const textArea = document.querySelector('textarea');
                textArea.value = 'translate the following Chinese text into English in different tones, which will be used in messages between colleagues and formal emails: \n';
                textArea.focus();
            })
        );

        // button: fix-OCR
        buttonContainer2.append(
            createButton('fix-OCR', function () {
                const textArea = document.querySelector('textarea');
                textArea.value = `Response based on the given content obtained from OCR softwares following these backgrounds and instructions:

                    1. You need to act as a very senior machine learning engineer in a OCR software developing company.
                    2. The task is to manually improve the raw results from OCR softwares.
                    3. The content could be a piece of code or some plaintext. It may include some errors or formatting issues due to the inaccurate OCR results. You need to fix these issues and make it as readable and explainable as possible. Also, you need to have a brief explanation about the content.
                `
                textArea.focus();
            })
        );

        // button: what-MLE
        buttonContainer2.append(
            createButton('what-MLE', function () {
                const textArea = document.querySelector('textarea');
                textArea.value = `Give me a detailed intro about "XXX" following these backgrounds and instructions:

                    1. You need to act as a very senior machine learning engineer in Indeed. 
                    2. The task is to make some explanations to the newbie interns. 
                    3. The explanation should be easy to understand. Please explain the use case and why the mentioned term is necessary, explain the main features, and give examples for each feature. Also, you need to give some comparison with some similar or related tools/models/tech if applicable.
                `;
                textArea.focus();
            })
        );

        // button: how-MLE
        buttonContainer2.append(
            createButton('how-MLE', function () {
                const textArea = document.querySelector('textarea');
                textArea.value = `Give me a detailed instruction about "how to XXX" following these backgrounds and instructions:

                    1. You need to act as a very senior machine learning engineer in Indeed. 
                    2. The task is to make some explanations to the newbie interns. 
                    3. The instruction and explanation should be easy to understand. Please explain the main steps and the purpose for each step. Also, you need to give some comparison with some similar or related tools/models/tech if applicable.
                `;
                textArea.focus();
            })
        );

        // button: 比较-MLE
        buttonContainer2.append(
            createButton('比较-MLE', function () {
                const textArea = document.querySelector('textarea');
                textArea.value = `For "XXX" and "YYY", give me a detailed relationship explanation and comparison following these backgrounds and instructions:

                    1. You need to act as a very senior machine learning engineer in Indeed.
                    2. The task is to make some explanations to the newbie interns.
                    3. The explanation should be easy to understand. Please compare the main features and use cases. Also, explain why they fit in different cases.
                `;
                textArea.focus();
            })
        );

        // button: 改code-MLE
        buttonContainer2.append(
            createButton('改code-MLE', function () {
                const textArea = document.querySelector('textarea');
                textArea.value = `Explain the given code and improve it following these backgrounds and instructions:

                    1. You need to act as a very senior machine learning engineer in Indeed.
                    2. The task is to discuss the code for potential improvement in terms of readability and running efficiency in a code review meeting.
                    3. The explanation should be easy to understand. Please provide multiple solutions and compare them if applicable.
                `;
                textArea.focus();
            })
        );

        textBox.appendChild(buttonContainer);
        textBox.style.display = 'inline-block';
        textBox.parentNode.insertBefore(buttonContainer2, textBox.nextSibling);

        // !! not a good way to make the textarea higher
        // textBox.appendChild(buttonContainer2);
        // textBox.append(buttonContainer);
        // textBox.style.display = 'inline-block';
        // textBox.style.height = '100px';
        // const textArea = document.querySelector('textarea');
        // textArea.style.minHeight = '80px';

        const divElements = textBox.querySelectorAll('div');
        for (let i = 0; i < divElements.length; i++) {
            divElements[i].style.display = 'inline-block';
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
            modelSwitcher.style.display = 'inline-block';
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