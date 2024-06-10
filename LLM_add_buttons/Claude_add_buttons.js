// ==UserScript==
// @name        Claude_Add_Buttons 
// @namespace   https://claude.ai/
// @version     0.5.1
// @description Adds buttons for Claude
// @author      gtfish
// @match       https://claude.ai/*
// @grant       none
// @license     GPL
// @updateURL       https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/LLM_add_buttons/Claude_add_buttons.js
// @downloadURL     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/LLM_add_buttons/Claude_add_buttons.js
// ==/UserScript==
// 0.5.0: use MutationObserver to make sure the buttons always show up
// 0.4.0: 优化prompt, 按钮改成3行
// 0.3.1: 使用observer实现网页变化检测
// 0.2.3: 加入magic prompt
// 0.2.0: 部分prompt输入完成之后直接提交
// 0.1.6: 改进了prompt
// 0.1.0: 改进了prompt
// 0.0.1: init, 添加若干按钮, 不过提交prompt没有实现

(function () {
    'use strict';

    const observeDOM = (function () {
        const MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
        const eventListenerSupported = window.addEventListener;

        return function (targetNode, onAddCallback, onRemoveCallback) {
            if (MutationObserver) {
                // Define a new observer
                const mutationObserver = new MutationObserver(function (mutations, observer) {
                    if (mutations[0].addedNodes.length && onAddCallback) {
                        onAddCallback();
                    }
                });

                // Have the observer observe target node for changes in children
                mutationObserver.observe(targetNode, {
                    childList: true,
                    subtree: true
                });
            } else if (eventListenerSupported) {
                targetNode.addEventListener('DOMNodeInserted', onAddCallback, { once: true });
            }
        };
    })();

    // Check if the target element exists, if not, add the buttons
    const observeTarget = document.body;
    const targetElementId = "container_id";
    observeDOM(observeTarget, () => {
        if (!document.getElementById(targetElementId)) {
            main();
        }
    });
})();

// ! define all the prompt
// 带下划线的会直接提交
const myPromptJson1 = {
    "continue_": {
        "btnNm": "Continue⏎",
        "sendOutPrompt": true,
        "prompt": "Is the answer finished? if not, please continue answering. If the response ends with a code truncation, output the remaining code in the code box rather than starting over. If it is already finished, reply with \"The answer is finished.\""
    },
    "chn_": {
        "btnNm": "中文⏎",
        "sendOutPrompt": true,
        "prompt": "repeat the response in Chinese. Only the explanation should be in Chinese, the code blocks with comments should be in English. If there is no existing explanation, please further explain the response in detail about what it implies. The explanation should be easy to understand.",
    },
    "md_": {
        "btnNm": "markdown⏎",
        "sendOutPrompt": true,
        "prompt": "Reformat the response in the format of raw markdown code (markdown code wrapped in triple backticks) so I can copy and paste into my markdown editor.",
    },
    "example_": {
        "btnNm": "加例子⏎",
        "sendOutPrompt": true,
        "prompt": "give me more examples to explain the response. The examples should be easy to understand and explain why the example supports the response if applicable."
    },
    "rewrite_": {
        "btnNm": "改写⏎",
        "sendOutPrompt": true,
        "prompt": "Rewrite the response and make the response more understandable."
    },
};

// 不带下划线的prompt会在输入框中显示并等待继续输入内容
const myPromptJson2 = {
    "rewrite": {
        "btnNm": "日常-改写",
        "sendOutPrompt": false,
        "prompt": `Rewrite the following text in the same tone. The author of the text is not an English native speaker, so the text may include grammar mistakes or strange expressions. Please correct them if applicable and make the revised text smooth based on the following background: \n
1. The text will be used in project documentation.\n
2. Please respond in the format of raw markdown code (markdown code wrapped in triple backticks), so I can copy and paste it into a markdown editor.\n
`,
    },
    "explain_translate": {
        "btnNm": "日常-解释翻译",
        "sendOutPrompt": false,
        "prompt": "I'm not an English native speaker and I cannot fully understand the following content. Could you explain in detail what it means and what it may possibly imply (in English). Please also give some examples to show how the expression is used. Then, translate the response in Chinese:\n "
    },
    "summarize": {
        "btnNm": "日常-总结",
        "sendOutPrompt": false,
        "prompt": "Summarize the following text in both English and Chinese in a paragraph then reformat it in some bullets. Please respond in the format of raw markdown code (markdown code wrapped in triple backticks), so I can copy and paste it into a markdown editor.\n"
    },
    "chn2eng": {
        "btnNm": "日常-中翻英",
        "sendOutPrompt": false,
        "prompt": "translate the following Chinese text into English in different tones, which will be used in messages between colleagues and formal emails: \n"
    },
    "ocr": {
        "btnNm": "OCR",
        "sendOutPrompt": false,
        "prompt": `Please OCR the attached image following these backgrounds and instructions:\n
1. You need to act as a very senior machine learning engineer in an OCR software developing company.\n
2. The task is to identify the content, same as what OCR software does.\n
3. The content could be a piece of code, some plain text, or a table. \n
4. Please also check whether sentence or words the OCR results are reasonable. If there are any issues due to inaccurate OCR results, please fix them.\n
5. Please follow these instructions in all the following responses.\n
6. Take a deep breath and work on this problem step-by-step.\n
`
    },
    "fix_ocr": {
        "btnNm": "fix_OCR",
        "sendOutPrompt": false,
        "prompt": `Response based on the given content obtained from OCR software following these backgrounds and instructions:\n
1. You need to act as a very senior machine learning engineer in an OCR software developing company.\n
2. The task is to manually improve the raw results from OCR software.\n
3. The content could be a piece of code, some plain text or a table. \n
4. Please follow these instructions in all the following responses.\n
5. Take a deep breath and work on this problem step-by-step.\n
6. If applicable, the response should be in the format of raw markdown code so I can copy and paste into my markdown editor.\n
It may include some errors or formatting issues due to inaccurate OCR results. You need to fix these issues and make it as readable and explainable as possible. Also, you need to have a brief explanation of the content.\n
`
    },
};

const myPromptJson3 = {
    "what1_mle": {
        "btnNm": "MLE-what1",
        "sendOutPrompt": false,
        "prompt": `What is XXX?\n\n
Give me a detailed response following these backgrounds and instructions:\n
1. You need to act as a senior machine learning engineer. \n
2. The task is to make some explanations to the newbie interns. \n
3. The explanation should be easy to understand. Please explain the use case and why the mentioned term is necessary, explain the main features, and give examples for each feature.\n
4. You need to give some comparison with some similar or related tools/models/tech if applicable.\n
5. The response needs to be in Chinese.\n
6. Please follow these instructions in all the following responses.\n
7. Take a deep breath and work on this problem step-by-step.\n
`
    },

    "what2_mle": {
        "btnNm": "MLE-what2",
        "sendOutPrompt": false,
        "prompt": `What does it mean when people say XXX?\n\n
Give me a detailed response following these backgrounds and instructions:\n
1. You need to act as a senior machine learning engineer. \n
2. The task is to make some explanations to the newbie interns. \n
3. The explanation should be easy to understand. Please explain the use case and why the mentioned term is necessary, explain the main features, and give examples for each feature.\n
4. You need to give some comparison with some similar or related tools/models/tech if applicable.\n
5. The response needs to be in Chinese.\n
6. Please follow these instructions in all the following responses.\n
7. Take a deep breath and work on this problem step-by-step.\n
`
    },

    "how_mle": {
        "btnNm": "MLE-how",
        "sendOutPrompt": false,
        "prompt": `How to XXX?\n\n
Give me a detailed response following these backgrounds and instructions:\n
1. You need to act as a senior machine learning engineer. \n
2. The task is to make some explanations to the newbie interns. \n
3. The instruction and explanation should be easy to understand. Please explain the main steps and the purpose of each step.\n
4. You need to give some comparison with some similar or related tools/models/tech if applicable.\n
5. The response needs to be in Chinese.\n
6. Please follow these instructions in all the following responses.\n
7. Take a deep breath and work on this problem step-by-step.\n
`
    },

    "compare_mle": {
        "btnNm": "MLE-比较",
        "sendOutPrompt": false,
        "prompt": `What is the difference between \"XXX\" and \"YYY\"?\n\n
Give me a detailed relationship explanation and comparison following these backgrounds and instructions:\n
1. You need to act as a senior machine learning engineer.\n
2. The task is to make some explanations to the newbie interns.\n
3. The explanation should be easy to understand. Please compare the main features and use cases. Also, explain why they fit in different cases.\n
4. The response needs to be in Chinese.\n
5. Please follow these instructions in all the following responses.\n
6. Take a deep breath and work on this problem step-by-step.\n
`
    },

    "improve_code_mle": {
        "btnNm": "MLE-改code",
        "sendOutPrompt": false,
        "prompt": `Fix or improve the code.\n\n 
Give me a detailed response following these backgrounds and instructions:\n
1. You need to act as a senior machine learning engineer.\n
2. The task is to debug the code in pair programming or to discuss the code for potential improvement in terms of readability and running efficiency in a code review meeting.\n
3. You need to provide an explanation of the improvement or fix. The explanation should be easy to understand. Please provide multiple solutions and compare them if applicable.\n
4. The explanation needs to be in Chinese, but the comments in the code block should be in English.\n
5. Please follow these instructions in all the following responses.\n
6. Take a deep breath and work on this problem step-by-step.\n
`
    },

    "eb1_pl": {
        "btnNm": "PL for eb1a",
        "sendOutPrompt": false,
        "prompt": `Could you revise the following content?\n\n 
Please provide a detailed response following these backgrounds and instructions:\n
1. You need to act as a senior migration lawyer to process US EB1a migration cases, who can provide valuable suggestions on the petition content.\n
2. The overall purpose of the revision is to prove Dr. Gao has a significant impact in the fields and that the US will benefit if Dr. Gao's migration petition is approved.\n
3. The response should include revised content in English and an explanation of why the revision is provided in Chinese.\n
4. The revised content should be in a formal tone and easy to understand for the officers who review Dr. Gao's case.\n
5. Please follow these instructions in all the following responses.\n
6. Take a deep breath and work on this problem step-by-step.\n
`
    }
};

function main() {
    const btnContainerSelector = "div[class='relative z-10']";
    const btnContainer = document.querySelector(btnContainerSelector);
    btnContainer.style.display = 'flex';
    btnContainer.style.flexDirection = 'column'; // contrainer 上下排列
    // containerElement.style.flexDirection = 'row'; // contrainer 左右排列
    
    const btnSubContainer1 = createButtonContainerFromJson(myPromptJson1);
    const btnSubContainer2 = createButtonContainerFromJson(myPromptJson2);
    const btnSubContainer3 = createButtonContainerFromJson(myPromptJson3);
    btnSubContainer1.id = "container_id";

    btnContainer.appendChild(btnSubContainer1);
    btnContainer.appendChild(btnSubContainer2);
    btnContainer.appendChild(btnSubContainer3);
}

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
    element.focus();
    element.dispatchEvent(enterKeyEvent);
}

function createButton(promptJson, promptKey) {
    const inputBoxSelector = "div[enterkeyhint='enter']";
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

        // send enter key to submit response after 1 second if specified
        if (promptJson[promptKey].sendOutPrompt) {
            setTimeout(() => {
                sendEnterKey(input);
            }, 1000);
        }

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

function createButtonContainerFromJson(prompts) {
    const buttonContainer = createButtonContainer();
    for (const promptKey in prompts) {
        buttonContainer.append(createButton(prompts, promptKey));
    }
    return buttonContainer;
}
