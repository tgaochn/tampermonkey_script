// ==UserScript==
// @name        Claude_Add_Buttons
// @namespace   https://claude.ai/
// @version     0.6.6
// @description Adds buttons for Claude
// @author      gtfish
// @match       https://claude.ai/*
// @grant       none
// @license     GPL
// @require     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @updateURL       https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/LLM_add_buttons/Claude_add_buttons.js
// @downloadURL     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/LLM_add_buttons/Claude_add_buttons.js
// ==/UserScript==
// Claude_Add_Buttons 0.6.6: 修改prompt
// Claude_Add_Buttons 0.6.5: 部分重构代码, 用于适配 deepseek
// Claude_Add_Buttons 0.6.4: 增加 prompt; 增加了追加内容的模式
// Claude_Add_Buttons 0.6.3: 增加 prompt
// Claude_Add_Buttons 0.6.2: 更新 wait for selector
// Claude_Add_Buttons 0.6.1: 更新 selector
// Claude_Add_Buttons 0.6.0: use utils from external script
// Claude_Add_Buttons 0.5.9: bug fixed which caused the buttons not showing up on Claude homepage
// Claude_Add_Buttons 0.5.8: 改进prompt
// Claude_Add_Buttons 0.5.6: 改进container的识别方式以适应新版Claude的UI变化
// Claude_Add_Buttons 0.5.5: improved prompt
// Claude_Add_Buttons 0.5.2: add prompt to format latex formula
// Claude_Add_Buttons 0.5.0: use MutationObserver to make sure the buttons always show up
// Claude_Add_Buttons 0.4.0: 优化prompt, 按钮改成3行
// Claude_Add_Buttons 0.3.1: 使用observer实现网页变化检测
// Claude_Add_Buttons 0.2.3: 加入magic prompt
// Claude_Add_Buttons 0.2.0: 部分prompt输入完成之后直接提交
// Claude_Add_Buttons 0.1.6: 改进了prompt
// Claude_Add_Buttons 0.1.0: 改进了prompt
// Claude_Add_Buttons 0.0.1: init, 添加若干按钮, 不过提交prompt没有实现

(function () {
    "use strict";

    let isButtonsAdded = false;
    const addedContainerId = "container_id";

    // ! define all the prompt
    // 带下划线的会直接提交
    const myPromptJson1 = {
        continue_: {
            btnNm: "Continue⏎",
            sendOutPrompt: true,
            prompt: 'Is the answer finished? if not, please continue answering. If the response ends with a code truncation, output the remaining code in the code box rather than starting over. If it is already finished, reply with "The answer is finished."',
        },
        chn_: {
            btnNm: "中文⏎",
            sendOutPrompt: true,
            prompt: "repeat the response in Chinese. Only the explanation should be in Chinese, the code blocks with comments should be in English. If there is no existing explanation, please further explain the response in detail about what it implies. The explanation should be easy to understand.",
        },
        md_: {
            btnNm: "markdown⏎",
            sendOutPrompt: true,
            prompt: "Reformat the response in the format of raw markdown code (markdown code wrapped in triple backticks) so I can copy and paste into my markdown editor.",
        },
        example_: {
            btnNm: "加例子解释⏎",
            sendOutPrompt: true,
            prompt: "Make the response more understandable and give me more examples to explain the response if applicable. The examples should be easy to understand and explain why the example supports the response if applicable.",
        },
        // rewrite_: {
        //     btnNm: "改写⏎",
        //     sendOutPrompt: true,
        //     prompt: "Rewrite the response and make the response more understandable.",
        // },
    };

    // 不带下划线的prompt会在输入框中显示并等待继续输入内容
    const myPromptJson2 = {
        rewrite_doc: {
            btnNm: "日常-改写-doc",
            sendOutPrompt: false,
            prompt: `Rewrite the following text in the same tone. The author of the text is not an native English speaker, so the text may include grammar mistakes or strange expressions. Please correct them if applicable and make the revised text smooth based on the following background: \n
1. The text will be used in project documentation.\n
2. Please respond in the format of raw markdown code (markdown code wrapped in triple backticks), so I can copy and paste it into a markdown editor.\n
`,
        },
        rewrite_slack: {
            btnNm: "日常-改写-slack",
            sendOutPrompt: false,
            prompt: `Rewrite the following text in the same tone. The author of the text is not an native English speaker, so the text may include grammar mistakes or strange expressions. Please correct them if applicable and make the revised text smooth based on the following background: \n
1. The text will be used in discussion on slack btw colleagues.\n
2. Please respond in the format of raw markdown code (markdown code wrapped in triple backticks), so I can copy and paste it into a markdown editor.\n
`,
        },

        reply_on_slack: {
            btnNm: "slack 完整回复优化",
            sendOutPrompt: false,
            prompt: `I'm reviewing a Slack discussion between me (Tian Gao) and my colleagues at high-tech company like google or amazon. As a non-native English speaker, I'd like to ensure my planned reply is clear and appropriate. Could you help analyze my draft response, check for any misunderstandings of the discussion context, and suggest improvements?\n
Requirements:\n
1. Please analyze this from the perspective of a senior ML engineer and native English speaker\n
2. Provide your response in Chinese\n
3. Format suggestions as raw markdown code using triple backticks\n
4. Consider:\n
   - Clarity and professionalism of the response\n
   - Technical accuracy\n
   - Cultural appropriateness in a tech workplace\n
   - Any areas where I may have misunderstood the discussion\n
Context:\n
\n\n
My draft reply:\n
\n\n
`,
        },

        explain_translate: {
            btnNm: "日常-解释翻译",
            sendOutPrompt: false,
            prompt: `I'm not a native English speaker, and I cannot fully understand the following content. Could you explain what it means and what it may possibly imply so that it can be easily understood? More background or requirements of the text are shown below. They should be applied to all the follow-up responses.\n
1. The response should be in Chinese, but the comments in the code block should be in English if applicable.\n
2. The text is from a discussion on Slack between American colleagues or documentation of some projects. The company is high-tech, such as Google, and the colleagues are managers, data scientists, or machine learning engineers on Recsys.\n
3. Please have a separate section to explain all the points that may cause confusing in the background of ML/AI/Recsys.\n
4. If it is a question, explain the background and the main points. Then provide a possible answer.\n
5. If it is a request, explain the main points and the objective. Then provide a possible answer.\n
6. If it is a suggestion, explain the main points, the objective, and the reasons.\n
The text is:`,
        },
        summarize: {
            btnNm: "日常-总结",
            sendOutPrompt: false,
            prompt: "Summarize the following text in both English and Chinese in a paragraph then reformat it in some bullets. The text can be in the format of subtitle, plaintext or others. Please respond in the format of raw markdown code (markdown code wrapped in triple backticks), so I can copy and paste it into a markdown editor.\n",
        },

        chn2eng: {
            btnNm: "日常-中翻英",
            sendOutPrompt: false,
            prompt: "translate the following Chinese text into English in different tones, which will be used in messages between colleagues and formal emails: \n",
        },

        ocr: {
            btnNm: "img_OCR",
            sendOutPrompt: false,
            prompt: `Please OCR the attached image following these backgrounds and instructions:\n
1. You need to act as a very senior machine learning engineer in an OCR software developing company.\n
2. The task is to identify the content, same as what OCR software does.\n
3. The content could be a piece of code, some plain text, or a table. \n
4. Please also check whether sentence or words the OCR results are reasonable. If there are any issues due to inaccurate OCR results, please fix them.\n
5. Please follow these instructions in all the responses in this session for the further questions.\n
6. Please respond in the format of raw markdown code (markdown code wrapped in triple backticks), so I can copy and paste it into a markdown editor.\n
`,
        },

        fix_ocr: {
            btnNm: "fix_cont_OCR",
            sendOutPrompt: false,
            prompt: `Response based on the given content obtained from OCR software following these backgrounds and instructions:\n
1. You need to act as a very senior machine learning engineer in an OCR software developing company.\n
2. The task is to manually improve the raw results from OCR software.\n
3. The content could be a piece of code, some plain text or a table. \n
4. Please follow these instructions in all the responses in this session for further questions.\n
5. Take a deep breath and work on this problem step-by-step.\n
6. If applicable, the response should be in the format of raw markdown code so I can copy and paste into my markdown editor.\n
7. Please respond in the format of raw markdown code (markdown code wrapped in triple backticks), so I can copy and paste it into a markdown editor.\n
It may include some errors or formatting issues due to inaccurate OCR results. You need to fix these issues and make it as readable and explainable as possible. Also, you need to have a brief explanation of the content.\n
`,
        },

        mermaid_ocr: {
            btnNm: "mermaid_OCR",
            sendOutPrompt: false,
            prompt: `Please transform the attached flowchart into mermaid code following these backgrounds and instructions:\n
1. You need to act as a very senior machine learning engineer and a mermaid expert in an OCR software developing company.\n
2. Check whether sentences or words in the flowchart are reasonable. If there are any issues due to inaccurate OCR results, please fix them and list the changes.\n
3. Follow these instructions in all the responses in this session for further questions.\n
4. Respond in the format of raw markdown code (\`\`\`mermaid\n\`\`\`), so I can copy and paste it into a markdown editor. Don't respond with raw mermaid code.\n
5. Use "classDef defaultNode fill:#f9f9f9,stroke:#0000ff,stroke-width:2px,color:black" as the default style for all the nodes.\n
`,
        },

//         format_tex_formula: {
//             btnNm: "format tex formula",
//             sendOutPrompt: false,
//             prompt: `Could you format the following tex formula and make it more readable?\n\n 
// Please provide the response following these backgrounds and instructions:\n
// 1. You need to act as a senior latex expert and a senior machine learning engineer.\n
// 2. The overall purpose of the revision is to make the formula more readable so the reader of the latex code can easily understand it.\n
// 3. Please respond in the format of raw markdown code (markdown code wrapped in triple backticks), so I can copy and paste it into a markdown editor.\n
// 4. The latex code for the formula is from OCR, so it may include errors. If there are errors, please correct them and explain the changes in detail.\n
// 5. Please follow these instructions in all the responses in this session for further questions.\n
// 6. Take a deep breath and work on this problem step-by-step.\n
// `,
//         },

        //         online_debate: {
        //             btnNm: "网上吵架",
        //             sendOutPrompt: false,
        //             prompt: `请你作为一位资深的网络辩论专家，精通分析对方观点中的漏洞并激怒对方. 帮我分析并改进以下网络辩论中的回复。我的一部分目的是激怒对方, 所以请不要在意语气和态度. 可以使用反讽、挖苦等语言技巧. 重点是论据的锐利性和对方情绪的操控.\n
        // 1. 如果不改变我回复的大致结构, 请分析我的回复中有什么逻辑漏洞. 对方之前的论述中有什么我遗漏的弱点可以利用. 以及对方的情绪触发点在哪里, 如何让对方失去理性陷入情绪化. 另外请预判对方可能的反驳并给出后续应对策略.\n
        // 2. 如果完全改变我回复的结构, 请给出新的回复建议并说明理由. 另外请预判对方可能的反驳并给出后续应对策略\n
        // 争论背景：\n
        // \n\n
        // 我的预计回复：\n
        // \n\n
        // `,
        //         },
    };

    const myPromptJson3 = {
        what_mle: {
            btnNm: "MLE-what",
            sendOutPrompt: false,
            prompt: `What is XXX?\n\n
Give me a detailed response following these backgrounds and instructions:\n
1. You need to act as a senior machine learning engineer. \n
2. The task is to make some explanations to the newbie interns. \n
3. The explanation should be easy to understand. Please explain the use case and why the mentioned term is necessary, explain the main features, and give examples for each feature.\n
4. You need to give some comparison with some similar or related tools/models/tech if applicable.\n
5. The response needs to be in Chinese.\n
6. Please follow these instructions in all the responses in this session for the further questions.\n
7. Take a deep breath and work on this problem step-by-step.\n
8. Please respond in the format of raw markdown code (markdown code wrapped in triple backticks), so I can copy and paste it into a markdown editor.\n
`,
        },

        how_mle: {
            btnNm: "MLE-how",
            sendOutPrompt: false,
            prompt: `How to XXX?\n\n
Give me a detailed response following these backgrounds and instructions:\n
1. You need to act as a senior machine learning engineer. \n
2. The task is to make some explanations to the newbie interns. \n
3. The instruction and explanation should be easy to understand. Please explain the main steps and the purpose of each step.\n
4. You need to give some comparison with some similar or related tools/models/tech if applicable.\n
5. The response needs to be in Chinese.\n
6. Please follow these instructions in all the responses in this session for the further questions.\n
7. Take a deep breath and work on this problem step-by-step.\n
8. Please respond in the format of raw markdown code (markdown code wrapped in triple backticks), so I can copy and paste it into a markdown editor.\n
`,
        },

        compare_mle: {
            btnNm: "MLE-比较",
            sendOutPrompt: false,
            prompt: `What is the difference between \"XXX\" and \"YYY\"?\n\n
Give me a detailed relationship explanation and comparison following these backgrounds and instructions:\n
1. You need to act as a senior machine learning engineer.\n
2. The task is to make some explanations to the newbie interns.\n
3. The explanation should be easy to understand. Please compare the main features and use cases. Also, explain why they fit in different cases.\n
4. The response needs to be in Chinese.\n
5. Please follow these instructions in all the responses in this session for the further questions.\n
6. Take a deep breath and work on this problem step-by-step.\n
7. Please respond in the format of raw markdown code (markdown code wrapped in triple backticks), so I can copy and paste it into a markdown editor.\n
`,
        },

        improve_code_mle: {
            btnNm: "MLE-改code",
            sendOutPrompt: false,
            prompt: `Fix or improve the code.\n\n 
Give me a detailed response following these backgrounds and instructions:\n
1. You need to act as a senior machine learning engineer.\n
2. The task is to debug the code in pair programming or to discuss the code for potential improvement in terms of readability and running efficiency in a code review meeting.\n
3. You need to provide an explanation of the improvement or fix. The explanation should be easy to understand. Please provide multiple solutions and compare them if applicable.\n
4. The explanation needs to be in Chinese, but the comments in the code block should be in English.\n
5. Please follow these instructions in all the responses in this session for the further questions.\n
6. Take a deep breath and work on this problem step-by-step.\n
`,
        },
    };

    const myPromptJson4 = {
        in_chn: {
            btnNm: "中文",
            sendOutPrompt: false,
            prompt: `\n
The response should be in Chinese. To be exact, only the explanation should be in Chinese, the possible code blocks with comments/table should be in English. \n
`,
        },

        in_md: {
            btnNm: "markdown",
            sendOutPrompt: false,
            prompt: `\n
The response should be in the format of raw markdown code (markdown code wrapped in triple backticks) so I can copy and paste into my markdown editor.
`,
        },

        in_chn_md: {
            btnNm: "md且中文",
            sendOutPrompt: false,
            prompt: `\n
The response should be in Chinese. To be exact, only the explanation should be in Chinese, the possible code blocks with comments/table should be in English. \n
The response should be in the format of raw markdown code (markdown code wrapped in triple backticks) so I can copy and paste into my markdown editor.
`,
        },

        as_mle: {
            btnNm: "MLE身份",
            sendOutPrompt: false,
            prompt: `\n
Give me a detailed response following these backgrounds and instructions:\n
1. You need to act as a senior machine learning engineer. \n
2. The task is to make some explanations to the newbie interns. \n
3. The explanation should be easy to understand. Please explain the use case and why the mentioned term is necessary, explain the main features, and give examples for each feature.\n
4. You need to give some comparison with some similar or related tools/models/tech if applicable.\n
5. The response needs to be in Chinese.\n
6. Please follow these instructions in all the responses in this session for the further questions.\n
7. Take a deep breath and work on this problem step-by-step.\n
8. Please respond in the format of raw markdown code (markdown code wrapped in triple backticks), so I can copy and paste it into a markdown editor.\n
`,
        },
    };

    // Wait for utils to load
    function waitForUtils(timeout = 10000) {
        console.log("Starting to wait for utils...");
        const requiredFunctions = ["createButtonContainerFromJson", "observeDOM"];

        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            function checkUtils() {
                console.log("Checking utils:", window.utils);
                console.log("Available functions:", window.utils ? Object.keys(window.utils) : "none");

                if (
                    window.utils &&
                    requiredFunctions.every((func) => {
                        const hasFunc = typeof window.utils[func] === "function";
                        console.log(`Checking function ${func}:`, hasFunc);
                        return hasFunc;
                    })
                ) {
                    console.log("All required functions found");
                    resolve(window.utils);
                } else if (Date.now() - startTime >= timeout) {
                    const missingFunctions = requiredFunctions.filter(
                        (func) => !window.utils || typeof window.utils[func] !== "function"
                    );
                    console.log("Timeout reached. Missing functions:", missingFunctions);
                    reject(new Error(`Timeout waiting for utils. Missing functions: ${missingFunctions.join(", ")}`));
                } else {
                    console.log("Not all functions available yet, checking again in 100ms");
                    setTimeout(checkUtils, 100);
                }
            }

            checkUtils();
        });
    }

    async function initScript() {
        try {
            const utils = await waitForUtils();
            utils.createPageObserver(addedContainerId, () => main(utils));
        } catch (error) {
            console.error("Failed to initialize:", error);
        }
    }

    async function main(utils) {
        try {
            if (isButtonsAdded || document.getElementById(addedContainerId)) return;

            const inputBoxSelector = "div[enterkeyhint='enter']";
            const btnContainerSelector1 = "div[aria-label='Write your prompt to Claude']";
            const btnContainerSelector2 = "div[aria-label='Write your prompt to Claude']";

            const btnContainer = await utils.waitForAliasedElement([btnContainerSelector1, btnContainerSelector2]);

            // Double-check again after await
            if (isButtonsAdded || document.getElementById(addedContainerId)) return;

            btnContainer.style.display = "flex";
            btnContainer.style.flexDirection = "column";

            const inputBoxElement = document.querySelector(inputBoxSelector);
            const btnSubContainer1 = utils.createButtonContainerFromJson(inputBoxElement, myPromptJson1);
            const btnSubContainer2 = utils.createButtonContainerFromJson(inputBoxElement, myPromptJson2);
            const btnSubContainer3 = utils.createButtonContainerFromJson(inputBoxElement, myPromptJson3);
            const btnSubContainer4 = utils.createButtonContainerFromJson(inputBoxElement, myPromptJson4, "append");

            btnSubContainer1.id = addedContainerId;

            btnContainer.appendChild(btnSubContainer1);
            btnContainer.appendChild(btnSubContainer2);
            btnContainer.appendChild(btnSubContainer3);
            btnContainer.appendChild(btnSubContainer4);

            isButtonsAdded = true;
        } catch (error) {
            console.error("Failed to add buttons:", error);
            isButtonsAdded = false; // Reset flag if failed
        }
    }

    // Start the script
    initScript();
})();
