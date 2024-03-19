// ==UserScript==
// @name        Claude_Add_Buttons 
// @namespace   https://claude.ai/
// @version     0.1.2
// @description Adds buttons for Claude
// @author      gtfish
// @match       https://claude.ai/*
// @grant       none
// @license     GPL
// @updateURL       https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/LLM_add_buttons/Claude_add_buttons.js
// @downloadURL     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/LLM_add_buttons/Claude_add_buttons.js
// ==/UserScript==
// 0.0.1: init, 添加若干按钮, 不过提交prompt没有实现
// 0.1.0: 改进了prompt

(async function () {
    'use strict';
    // ! define all the prompt
    // 带下划线的会直接提交
    const myPromptJson1 = {
        "continue_": {
            "btnNm": "Continue⏎",
            "prompt": "Is the answer finished? if not, please continue answering. If the response ends with a code truncation, output the remaining code in the code box rather than starting over. If it is already finished, reply with \"The answer is finished.\""
        },
        'chn_': {
            'btnNm': '中文⏎',
            'prompt': 'repeat the response in chinese and explain in details what it implies. The explanation should be easy to understand.',
        },
        'md_': {
            'btnNm': 'markdown⏎',
            'prompt': 'Reformat the response in format of raw markdown code so I can copy and paste in my markdown editor.',
        },
        "example_": {
            "btnNm": "加例子⏎",
            "prompt": "give me more examples to explain the response. The examples should be easy to understand and explain why the example supports the response if applicable."
        },
        "rewrite_": {
            "btnNm": "改写⏎",
            "prompt": "Rewrite the response and make the response more understandable."
        },
    };

    // 不带下划线的prompt会在输入框中显示并等待继续输入内容
    const myPromptJson2 = {
        'rewrite': {
            'btnNm': '改写',
            'prompt': 'Rewrite the following text in different tones, which will be used in project documents (objective), messages between colleagues (informal), and emails (formal and polite): \n',
        },
        "explain_translate": {
            "btnNm": "解释翻译",
            "prompt": "For the following test, explain in detail what it means and what it may possibly imply (in English). Then, translate it and do the explanation again in Chinese:\n "
        },
        "summarize": {
            "btnNm": "总结",
            "prompt": "Summarize the following text in both English and Chinese in a paragraph then reformat it in some bullets: \n"
        },
        "explain_eng_chn": {
            "btnNm": "解释, 英翻中",
            "prompt": "What is \"XXX\". What does it mean in this content. Give me a detailed explanation and some examples in English. Then translate the response into Chinese."
        },
        "chn2eng": {
            "btnNm": "中翻英",
            "prompt": "translate the following Chinese text into English in different tones, which will be used in messages between colleagues and formal emails: \n"
        },
        "fix_ocr": {
            "btnNm": "fix-OCR",
            "prompt": `Response based on the given content obtained from OCR softwares following these backgrounds and instructions:\n
1. You need to act as a very senior machine learning engineer in a OCR software developing company.\n
2. The task is to manually improve the raw results from OCR softwares.\n
3. The content could be a piece of code or some plaintext. \n
It may include some errors or formatting issues due to the inaccurate OCR results. You need to fix these issues and make it as readable and explainable as possible. Also, you need to have a brief explanation about the content.`
        },

        "what_mle": {
            "btnNm": "what-MLE",
            "prompt": `Give me a detailed intro about \"XXX\" following these backgrounds and instructions:\n
1. You need to act as a very senior machine learning engineer in Indeed. \n
2. The task is to make some explanations to the newbie interns. \n
3. The explanation should be easy to understand. Please explain the use case and why the mentioned term is necessary, explain the main features, and give examples for each feature.\n
4. You need to give some comparison with some similar or related tools/models/tech if applicable.\n
5. The response needs to be in Chinese.
`
        },

        "how_mle": {
            "btnNm": "how-MLE",
            "prompt": `Give me a detailed instruction about \"how to XXX\" following these backgrounds and instructions:\n
1. You need to act as a very senior machine learning engineer in Indeed. \n
2. The task is to make some explanations to the newbie interns. \n
3. The instruction and explanation should be easy to understand. Please explain the main steps and the purpose for each step.\n
4. You need to give some comparison with some similar or related tools/models/tech if applicable.\n
5. The response needs to be in Chinese.
`
        },

        "compare_mle": {
            "btnNm": "比较-MLE",
            "prompt": `For \"XXX\" and \"YYY\", give me a detailed relationship explanation and comparison following these backgrounds and instructions:\n
1. You need to act as a very senior machine learning engineer in Indeed.\n
2. The task is to make some explanations to the newbie interns.\n
3. The explanation should be easy to understand. Please compare the main features and use cases. Also, explain why they fit in different cases.\n
4. The response needs to be in Chinese.
`
        },

        "improve_code_mle": {
            "btnNm": "改code-MLE",
            "prompt": `Explain the given code and improve it following these backgrounds and instructions:\n
1. You need to act as a very senior machine learning engineer in Indeed.\n
2. The task is to discuss the code for potential improvement in terms of readability and running efficiency in a code review meeting.\n
3. The explanation should be easy to understand. Please provide multiple solutions and compare them if applicable.\n
4. The explanation need to be in Chinese, but the comments in the code block should be in English.
`
        }
    };

    // ! define the selectors
    const inputBoxSelector = "div[enterkeyhint='enter']";
    const btnContainerPosSelector = "div[class='relative z-10']";
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));

    // ! function to create button/container/selection
    function setBtnStyle(btn) {
        btn.style.backgroundColor = '#009688';
        btn.style.color = 'white';
        btn.style.padding = '5px 5px';
        btn.style.fontSize = '14px';
        btn.style.border = '1px solid #ccc';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';
        btn.style.outline = 'none';
        btn.style.boxSizing = 'border-box';
    }

    // claude need <p></p> tags to format the long string into multiple lines
    function claudeLongStringProcessor(longString) {
        let lines = longString.split('\n');
        let formattedLines = lines.map(line => `<p>${line}</p>`);
        let formattedString = formattedLines.join('');

        return formattedString;
    }

    function sendEnterKey(element) {
        const enterKeyEvent = new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13
        });
        element.dispatchEvent(enterKeyEvent);
    }

    function createButton(promptJson, promptKey) {
        const button = document.createElement('button');
        setBtnStyle(button);
        button.innerHTML = promptJson[promptKey].btnNm;
        button.onclick = () => {
            const input = document.querySelector(inputBoxSelector);
            const inputNewCont = promptJson[promptKey].prompt;
            if (input && input instanceof HTMLElement) {
                input.innerHTML = claudeLongStringProcessor(inputNewCont);
                setSelection(input);
            }

            // TODO: add prompt submission
            // Trigger the input event to make the textarea send the message
            // const inputEvent = new Event('input', { bubbles: true });
            // input.dispatchEvent(inputEvent);
            // input.focus();
            // const inputElement = document.getElementById('myInput');
            // sendEnterKey(input);
        };

        return button;
    }

    function setSelection(input) {
        const range = document.createRange();
        range.selectNodeContents(input);
        range.collapse(false);
        const sel = window.getSelection();
        if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }

    function createButtonContainer() {
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'inline-block';
        buttonContainer.style.justifyContent = 'center';
        buttonContainer.style.marginTop = '10px';
        // buttonContainer.style.marginBottom = '10px';
        buttonContainer.style.marginLeft = '10px';

        return buttonContainer;
    }

    // ! add buttons in the containers
    const buttonContainer1 = createButtonContainer();
    const buttonContainer2 = createButtonContainer();
    for (const promptKey in myPromptJson1) {
        buttonContainer1.append(
            createButton(myPromptJson1, promptKey)
        );
    }
    for (const promptKey in myPromptJson2) {
        buttonContainer2.append(
            createButton(myPromptJson2, promptKey)
        );
    }

    // ! add containers on the page 
    while (true) {
        await delay(100);
        const btnContainerPosElement = document.querySelector(btnContainerPosSelector);
        if (btnContainerPosElement) {
            // contrainer 上下排列
            btnContainerPosElement.appendChild(buttonContainer1);
            btnContainerPosElement.parentNode.insertBefore(buttonContainer2, btnContainerPosElement.nextSibling);

            // contrainer 左右排列
            // btnContainerPosElement.insertAdjacentElement('afterend', buttonContainer);
            // btnContainerPosElement.insertAdjacentElement('afterend', buttonContainer2);
            break;
        }
    }

})();