// ==UserScript==
// @name        LLM_add_buttons
// @namespace   https://claude.ai/
// @version     1.1.4
// @description Adds buttons for Claude and Gemini (more LLMs will be supported in the future)
// @author      gtfish
// @match       https://claude.ai/*
// @match       https://gemini.google.com/*
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_registerMenuCommand
// @require     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @updateURL       https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/LLM_add_buttons/LLM_add_buttons.js
// @downloadURL     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/LLM_add_buttons/LLM_add_buttons.js
// ==/UserScript==
// LLM_add_buttons 1.1.4: add prompt for slack content understanding
// LLM_add_buttons 1.1.3: extract CONFIG constants for better maintainability
// LLM_add_buttons 1.1.2: 更新storage, 使得storage的值可以在Tampermonkey的storage tab中显示
// LLM_add_buttons 1.1.1: 更新 @match, 换账户也可以使用 gemini
// LLM_add_buttons 1.1.0: Added feature to load/edit prompts from GM_storage via menu command.
// LLM_add_buttons 1.0.0: script改名, 增加 Gemini 支持
// Claude_Add_Buttons 0.6.8: 修改了从主页跳转到chat页面后按钮不能第一时间显示的问题
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

    // Configuration constants
    const CONFIG = {
        UTILS_TIMEOUT: 10000,
        CONTAINER_ID: "container_id",
        REQUIRED_UTILS: [
            "createButtonContainerFromJson",
            "observeDOM",
            "createMultilineDialog",
            "monitorUrlChanges",
            "createPageObserver",
            "waitForAliasedElement",
            "setBtnStyle",
        ],
        WAIT_ATTEMPTS: 20,
        WAIT_INTERVAL: 300,
        URL_MONITOR_INTERVAL: 1000,
    };

    let isButtonsAdded = false;
    const addedContainerId = CONFIG.CONTAINER_ID;

    const siteConfigs = {
        claude: {
            inputBoxSelector: "div[enterkeyhint='enter']",
            btnContainerSelectors: ["div[aria-label='Write your prompt to Claude']"],
            hostnames: ["claude.ai"],
            inputProcessor: "claude",
        },
        gemini: {
            inputBoxSelector: "rich-textarea[enterkeyhint='send'] div.ql-editor",
            btnContainerSelectors: ["div.input-area[data-node-type='input-area']"],
            hostnames: ["gemini.google.com"],
            inputProcessor: "gemini",
        },
    };

    const getCurrentSiteConfig = () => {
        const currentHostname = window.location.hostname;
        for (const siteKey in siteConfigs) {
            if (siteConfigs[siteKey].hostnames.some((h) => currentHostname.includes(h))) {
                return siteConfigs[siteKey];
            }
        }
        return null;
    };

    // ! Define Default Prompts (renamed with a '_default' suffix)
    const myPromptJson1_default = {
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
    const myPromptJson2_default = {
        rewrite_doc: {
            btnNm: "日常-改写-doc",
            sendOutPrompt: false,
            prompt: `Rewrite the following text in the same tone. The author of the text is not an native English speaker, so the text may include grammar mistakes or strange expressions. Please correct them if applicable and make the revised text smooth based on the following background: 
1. The text will be used in project documentation.
2. Please respond in the format of raw markdown code (markdown code wrapped in triple backticks), so I can copy and paste it into a markdown editor.
`,
        },
        rewrite_slack: {
            btnNm: "日常-改写-slack",
            sendOutPrompt: false,
            prompt: `Rewrite the following text in the same tone. The author of the text is not an native English speaker, so the text may include grammar mistakes or strange expressions. Please correct them if applicable and make the revised text smooth based on the following background: 
1. The text will be used in discussion on slack btw colleagues.
2. Please respond in the format of raw markdown code (markdown code wrapped in triple backticks), so I can copy and paste it into a markdown editor.
`,
        },

        explain_translate: {
            btnNm: "日常-解释翻译",
            sendOutPrompt: false,
            prompt: `I'm not a native English speaker, and I cannot fully understand the following content. Could you explain what it means and what it may possibly imply so that it can be easily understood? More background or requirements of the text are shown below. They should be applied to all the follow-up responses.
1. The response should be in Chinese, but the comments in the code block should be in English if applicable.
2. The text is from a discussion on Slack between American colleagues or documentation of some projects. The company is high-tech, such as Google, and the colleagues are managers, data scientists, or machine learning engineers on Recsys.
3. Please have a separate section to explain all the points that may cause confusing in the background of ML/AI/Recsys.
4. If it is a question, explain the background and the main points. Then provide a possible answer.
5. If it is a request, explain the main points and the objective. Then provide a possible answer.
6. If it is a suggestion, explain the main points, the objective, and the reasons.
The text is:`,
        },
        summarize: {
            btnNm: "日常-总结",
            sendOutPrompt: false,
            prompt: "Summarize the following text in both English and Chinese in a paragraph then reformat it in some bullets. The text can be in the format of subtitle, plaintext or others. Please respond in the format of raw markdown code (markdown code wrapped in triple backticks), so I can copy and paste it into a markdown editor.",
        },

        chn2eng: {
            btnNm: "日常-中翻英",
            sendOutPrompt: false,
            prompt: "translate the following Chinese text into English in different tones, which will be used in messages between colleagues and formal emails: ",
        },

        //         ocr: {
        //             btnNm: "img_OCR",
        //             sendOutPrompt: false,
        //             prompt: `Please OCR the attached image following these backgrounds and instructions:
        // 1. You need to act as a very senior machine learning engineer in an OCR software developing company.
        // 2. The task is to identify the content, same as what OCR software does.
        // 3. The content could be a piece of code, some plain text, or a table.
        // 4. Please also check whether sentence or words the OCR results are reasonable. If there are any issues due to inaccurate OCR results, please fix them.
        // 5. Please follow these instructions in all the responses in this session for the further questions.
        // 6. Please respond in the format of raw markdown code (markdown code wrapped in triple backticks), so I can copy and paste it into a markdown editor.
        // `,
        //         },

        //         fix_ocr: {
        //             btnNm: "fix_cont_OCR",
        //             sendOutPrompt: false,
        //             prompt: `Response based on the given content obtained from OCR software following these backgrounds and instructions:
        // 1. You need to act as a very senior machine learning engineer in an OCR software developing company.
        // 2. The task is to manually improve the raw results from OCR software.
        // 3. The content could be a piece of code, some plain text or a table.
        // 4. Please follow these instructions in all the responses in this session for further questions.
        // 5. Take a deep breath and work on this problem step-by-step.
        // 6. If applicable, the response should be in the format of raw markdown code so I can copy and paste into my markdown editor.
        // 7. Please respond in the format of raw markdown code (markdown code wrapped in triple backticks), so I can copy and paste it into a markdown editor.
        // It may include some errors or formatting issues due to inaccurate OCR results. You need to fix these issues and make it as readable and explainable as possible. Also, you need to have a brief explanation of the content.
        // `,
        //         },

        //         mermaid_ocr: {
        //             btnNm: "mermaid_OCR",
        //             sendOutPrompt: false,
        //             prompt: `Please transform the attached flowchart into mermaid code following these backgrounds and instructions:
        // 1. You need to act as a very senior machine learning engineer and a mermaid expert in an OCR software developing company.
        // 2. Check whether sentences or words in the flowchart are reasonable. If there are any issues due to inaccurate OCR results, please fix them and list the changes.
        // 3. Follow these instructions in all the responses in this session for further questions.
        // 4. Respond in the format of raw markdown code (\`\`\`mermaid\`\`\`), so I can copy and paste it into a markdown editor. Don't respond with raw mermaid code.
        // 5. Use "classDef defaultNode fill:#f9f9f9,stroke:#0000ff,stroke-width:2px,color:black" as the default style for all the nodes.
        // `,
        //         },

        //         format_tex_formula: {
        //             btnNm: "format tex formula",
        //             sendOutPrompt: false,
        //             prompt: `Could you format the following tex formula and make it more readable?
        // Please provide the response following these backgrounds and instructions:
        // 1. You need to act as a senior latex expert and a senior machine learning engineer.
        // 2. The overall purpose of the revision is to make the formula more readable so the reader of the latex code can easily understand it.
        // 3. Please respond in the format of raw markdown code (markdown code wrapped in triple backticks), so I can copy and paste it into a markdown editor.
        // 4. The latex code for the formula is from OCR, so it may include errors. If there are errors, please correct them and explain the changes in detail.
        // 5. Please follow these instructions in all the responses in this session for further questions.
        // 6. Take a deep breath and work on this problem step-by-step.
        // `,
        //         },

        //         online_debate: {
        //             btnNm: "网上吵架",
        //             sendOutPrompt: false,
        //             prompt: `请你作为一位资深的网络辩论专家，精通分析对方观点中的漏洞并激怒对方. 帮我分析并改进以下网络辩论中的回复。我的一部分目的是激怒对方, 所以请不要在意语气和态度. 可以使用反讽、挖苦等语言技巧. 重点是论据的锐利性和对方情绪的操控.
        // 1. 如果不改变我回复的大致结构, 请分析我的回复中有什么逻辑漏洞. 对方之前的论述中有什么我遗漏的弱点可以利用. 以及对方的情绪触发点在哪里, 如何让对方失去理性陷入情绪化. 另外请预判对方可能的反驳并给出后续应对策略.
        // 2. 如果完全改变我回复的结构, 请给出新的回复建议并说明理由. 另外请预判对方可能的反驳并给出后续应对策略
        // 争论背景：
        //
        // 我的预计回复：
        //
        // `,
        //         },
    };
    const myPromptJson3_default = {
        what_mle: {
            btnNm: "MLE-what",
            sendOutPrompt: false,
            prompt: `What is XXX?
Give me a detailed response following these backgrounds and instructions:
1. You need to act as a senior machine learning engineer. 
2. The task is to make some explanations to the newbie interns. 
3. The explanation should be easy to understand. Please explain the use case and why the mentioned term is necessary, explain the main features, and give examples for each feature.
4. You need to give some comparison with some similar or related tools/models/tech if applicable.
5. The response needs to be in Chinese.
6. Please follow these instructions in all the responses in this session for the further questions.
7. Take a deep breath and work on this problem step-by-step.
8. Please respond in the format of raw markdown code (markdown code wrapped in triple backticks), so I can copy and paste it into a markdown editor.
`,
        },

        how_mle: {
            btnNm: "MLE-how",
            sendOutPrompt: false,
            prompt: `How to XXX?
Give me a detailed response following these backgrounds and instructions:
1. You need to act as a senior machine learning engineer. 
2. The task is to make some explanations to the newbie interns. 
3. The instruction and explanation should be easy to understand. Please explain the main steps and the purpose of each step.
4. You need to give some comparison with some similar or related tools/models/tech if applicable.
5. The response needs to be in Chinese.
6. Please follow these instructions in all the responses in this session for the further questions.
7. Take a deep breath and work on this problem step-by-step.
8. Please respond in the format of raw markdown code (markdown code wrapped in triple backticks), so I can copy and paste it into a markdown editor.
`,
        },

        compare_mle: {
            btnNm: "MLE-比较",
            sendOutPrompt: false,
            prompt: `What is the difference between \"XXX\" and \"YYY\"?
Give me a detailed relationship explanation and comparison following these backgrounds and instructions:
1. You need to act as a senior machine learning engineer.
2. The task is to make some explanations to the newbie interns.
3. The explanation should be easy to understand. Please compare the main features and use cases. Also, explain why they fit in different cases.
4. The response needs to be in Chinese.
5. Please follow these instructions in all the responses in this session for the further questions.
6. Take a deep breath and work on this problem step-by-step.
7. Please respond in the format of raw markdown code (markdown code wrapped in triple backticks), so I can copy and paste it into a markdown editor.
`,
        },

        improve_code_mle: {
            btnNm: "MLE-改code",
            sendOutPrompt: false,
            prompt: `Fix or improve the code. 
Give me a detailed response following these backgrounds and instructions:
1. You need to act as a senior machine learning engineer.
2. The task is to debug the code in pair programming or to discuss the code for potential improvement in terms of readability and running efficiency in a code review meeting.
3. You need to provide an explanation of the improvement or fix. The explanation should be easy to understand. Please provide multiple solutions and compare them if applicable.
4. The explanation needs to be in Chinese, but the comments in the code block should be in English.
5. Please follow these instructions in all the responses in this session for the further questions.
6. Take a deep breath and work on this problem step-by-step.
`,
        },

        reply_on_slack: {
            btnNm: "slack 完整回复优化",
            sendOutPrompt: false,
            prompt: `I'm reviewing a Slack discussion between me (Tian Gao) and my colleagues at high-tech company like google or amazon. As a non-native English speaker, I'd like to ensure my planned reply is clear and appropriate. Could you help analyze my draft response, check for any misunderstandings of the discussion context, and suggest improvements?
Requirements:
1. Please analyze this from the perspective of a senior ML engineer and native English speaker
2. Provide your response in Chinese
3. Format suggestions as raw markdown code using triple backticks
4. Consider:
   - Clarity and professionalism of the response
   - Technical accuracy
   - Cultural appropriateness in a tech workplace
   - Any areas where I may have misunderstood the discussion
Context:

My draft reply:

`,
        },        

        slack_content_understand: {
            btnNm: "slack 完整内容理解",
            sendOutPrompt: false,
            prompt: `I'm reviewing a Slack discussion between me (Tian Gao) and my colleagues at high-tech company like google or amazon. As a non-native English speaker, I'm concerned about misunderstanding the meaning of the conversation. Could you read the conversation and answer my questions based on it in our future chats?
Questions:
What does it mean when XXX?

Requirements:
1. Please analyze this from the perspective of a senior ML engineer and native English speaker
2. Provide your response in Chinese

Full conversation:

`,
        },        
    };

    const myPromptJson4_default = {
        in_chn: {
            btnNm: "中文",
            sendOutPrompt: false,
            prompt: `
The response should be in Chinese. To be exact, only the explanation should be in Chinese, the possible code blocks with comments/table should be in English. 

`,
        },

        in_md: {
            btnNm: "markdown",
            sendOutPrompt: false,
            prompt: `
The response should be in the format of raw markdown code (markdown code wrapped in triple backticks) so I can copy and paste into my markdown editor.
`,
        },

        in_chn_md: {
            btnNm: "md且中文",
            sendOutPrompt: false,
            prompt: `
The response should be in Chinese. To be exact, only the explanation should be in Chinese, the possible code blocks with comments/table should be in English. 

The response should be in the format of raw markdown code (markdown code wrapped in triple backticks) so I can copy and paste into my markdown editor.
`,
        },

        as_mle: {
            btnNm: "MLE身份",
            sendOutPrompt: false,
            prompt: `
Give me a detailed response following these backgrounds and instructions:
1. You need to act as a senior machine learning engineer. 
2. The task is to make some explanations to the newbie interns. 
3. The explanation should be easy to understand. Please explain the use case and why the mentioned term is necessary, explain the main features, and give 
examples for each feature.
4. You need to give some comparison with some similar or related tools/models/tech if applicable.
5. The response needs to be in Chinese.
6. Please follow these instructions in all the responses in this session for the further questions.
7. Take a deep breath and work on this problem step-by-step.
8. Please respond in the format of raw markdown code (markdown code wrapped in triple backticks), so I can copy and paste it into a markdown editor.
`,
        },
    };

    // Define Storage Keys and a helper array for defaults
    const PROMPT_STORAGE_KEYS = [
        "customUserPrompts_Group1",
        "customUserPrompts_Group2",
        "customUserPrompts_Group3",
        "customUserPrompts_Group4",
    ];

    const DEFAULT_PROMPTS_ARRAY = [
        myPromptJson1_default,
        myPromptJson2_default,
        myPromptJson3_default,
        myPromptJson4_default,
    ];

    // Function to initialize storage - will make storage values visible in Tampermonkey UI
    function initializeStorage() {
        // For each prompt group, initialize it with the stored value or default if not present
        for (let i = 0; i < PROMPT_STORAGE_KEYS.length; i++) {
            const key = PROMPT_STORAGE_KEYS[i];
            const defaultValue = DEFAULT_PROMPTS_ARRAY[i];
            const currentValue = GM_getValue(key, defaultValue);

            // Always set the value to ensure it appears in the Tampermonkey Storage tab
            GM_setValue(key, currentValue);
        }
    }

    // Load Prompts from Storage or Use Defaults
    let myPromptJson1 = GM_getValue(PROMPT_STORAGE_KEYS[0], myPromptJson1_default);
    let myPromptJson2 = GM_getValue(PROMPT_STORAGE_KEYS[1], myPromptJson2_default);
    let myPromptJson3 = GM_getValue(PROMPT_STORAGE_KEYS[2], myPromptJson3_default);
    let myPromptJson4 = GM_getValue(PROMPT_STORAGE_KEYS[3], myPromptJson4_default);

    // Wait for utils to load
    function waitForUtils(timeout = CONFIG.UTILS_TIMEOUT) {
        console.log("Starting to wait for utils...");
        const requiredFunctions = CONFIG.REQUIRED_UTILS;

        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            function checkUtils() {
                if (
                    window.utils &&
                    requiredFunctions.every((func) => {
                        const hasFunc = typeof window.utils[func] === "function";
                        return hasFunc;
                    })
                ) {
                    console.log("All required utils functions found for LLM_add_buttons");
                    resolve(window.utils);
                } else if (Date.now() - startTime >= timeout) {
                    const missingFunctions = requiredFunctions.filter(
                        (func) => !window.utils || typeof window.utils[func] !== "function"
                    );
                    console.error("Timeout waiting for utils. Missing functions:", missingFunctions);
                    reject(new Error(`Timeout waiting for utils. Missing functions: ${missingFunctions.join(", ")}`));
                } else {
                    setTimeout(checkUtils, 100);
                }
            }
            checkUtils();
        });
    }

    // Function to handle editing a specific prompt group
    async function handleEditPromptGroup(groupIndex, utils) {
        const key = PROMPT_STORAGE_KEYS[groupIndex];
        const defaultDataForGroup = DEFAULT_PROMPTS_ARRAY[groupIndex];
        const storedData = GM_getValue(key, defaultDataForGroup);

        const placeholder = `Enter valid JSON for prompt group ${groupIndex + 1}.
Example structure for a prompt:
{
  "prompt_key": {
    "btnNm": "Button Text",
    "sendOutPrompt": false,
    "prompt": "This is the prompt text. Use \\\\n for newlines."
  },
  "another_key_with_enter_char": { 
    "btnNm": "Submit Me With Enter Char", 
    "sendOutPrompt": true, 
    "prompt": "This prompt will be sent automatically."
  }
}
Note: For keys ending with '_', sendOutPrompt will be treated as true by default convention if not specified.
The '⏎' character in button names (btnNm) is purely visual for buttons that auto-submit;
it is not required in btnNm, nor does it affect the key of the prompt itself.
To reset to default, you can save an empty JSON object like {}
(or manually paste the default JSON from the script).`;

        try {
            const newJsonData = await utils.createMultilineDialog(
                `Edit Prompts for Group ${groupIndex + 1} (Key: ${key})`,
                storedData,
                placeholder,
                "object"
            );

            if (newJsonData !== null) {
                GM_setValue(key, newJsonData);

                // Update the in-memory version for the current session
                if (groupIndex === 0) myPromptJson1 = GM_getValue(PROMPT_STORAGE_KEYS[0], myPromptJson1_default);
                else if (groupIndex === 1) myPromptJson2 = GM_getValue(PROMPT_STORAGE_KEYS[1], myPromptJson2_default);
                else if (groupIndex === 2) myPromptJson3 = GM_getValue(PROMPT_STORAGE_KEYS[2], myPromptJson3_default);
                else if (groupIndex === 3) myPromptJson4 = GM_getValue(PROMPT_STORAGE_KEYS[3], myPromptJson4_default);

                alert(`Prompts for Group ${groupIndex + 1} updated! Reloading page to apply changes.`);
                location.reload(); // Reload to re-draw buttons with new prompts
            }
        } catch (e) {
            console.error("Error during prompt editing or parsing:", e);
            alert(
                `Error parsing JSON: ${e.message}. Please ensure you entered valid JSON. Your changes were not saved.`
            );
        }
    }

    // Main function for the menu command
    async function showEditPromptsDialog(utils) {
        const dialogId = "editPromptGroupDialog";
        if (document.getElementById(dialogId)) return; // Prevent multiple dialogs

        const container = document.createElement("div");
        container.id = dialogId;
        Object.assign(container.style, {
            padding: "20px",
            backgroundColor: "white",
            border: "1px solid #ccc",
            borderRadius: "8px",
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: "10001", // Ensure it's above most things
            textAlign: "center",
        });

        const title = document.createElement("h3");
        title.textContent = "Select Prompt Group to Edit";
        title.style.marginBottom = "15px";
        container.appendChild(title);

        for (let i = 0; i < 4; i++) {
            const btn = document.createElement("button");
            utils.setBtnStyle(btn);
            btn.textContent = `Edit Prompts - Group ${i + 1}`;
            Object.assign(btn.style, {
                display: "block",
                margin: "10px auto",
                padding: "8px 15px",
            });
            btn.onclick = async () => {
                container.remove();
                await handleEditPromptGroup(i, utils);
            };
            container.appendChild(btn);
        }

        const closeBtn = document.createElement("button");
        utils.setBtnStyle(closeBtn);
        Object.assign(closeBtn.style, {
            display: "block",
            margin: "20px auto 0",
            padding: "8px 15px",
            backgroundColor: "#f0f0f0", // Different color for close
            color: "#333",
        });
        closeBtn.textContent = "Cancel";
        closeBtn.onclick = () => container.remove();
        container.appendChild(closeBtn);

        document.body.appendChild(container);
        // Close on escape key
        const escapeListener = (event) => {
            if (event.key === "Escape") {
                container.remove();
                document.removeEventListener("keydown", escapeListener);
            }
        };
        document.addEventListener("keydown", escapeListener);
    }

    async function initScript() {
        try {
            // Initialize storage to make values visible in Tampermonkey storage tab
            initializeStorage();

            const utils = await waitForUtils();

            GM_registerMenuCommand(
                "Edit Custom Prompts",
                () => {
                    showEditPromptsDialog(utils).catch(console.error);
                },
                "p"
            ); // Access key 'p'

            await checkAndAddButtons(utils);
            utils.monitorUrlChanges((newUrl, oldUrl) => {
                isButtonsAdded = false;
                setTimeout(() => checkAndAddButtons(utils), CONFIG.URL_MONITOR_INTERVAL);
            });
            utils.createPageObserver(addedContainerId, () => checkAndAddButtons(utils));
        } catch (error) {
            console.error("Failed to initialize LLM_add_buttons script:", error);
        }
    }

    async function checkAndAddButtons(utils) {
        try {
            if (isButtonsAdded || document.getElementById(addedContainerId)) {
                return;
            }

            const currentConfig = getCurrentSiteConfig();
            if (!currentConfig) {
                console.warn("No site configuration found for current hostname:", window.location.hostname);
                return;
            }

            const btnContainer = await utils.waitForAliasedElement(
                currentConfig.btnContainerSelectors,
                CONFIG.WAIT_ATTEMPTS,
                CONFIG.WAIT_INTERVAL
            );

            if (isButtonsAdded || document.getElementById(addedContainerId)) {
                return;
            }

            btnContainer.style.display = "flex";
            btnContainer.style.flexDirection = "column";
            btnContainer.style.alignItems = "flex-start";

            const inputBoxElement = document.querySelector(currentConfig.inputBoxSelector);
            if (!inputBoxElement) {
                console.warn("Input box element not found using selector:", currentConfig.inputBoxSelector);
                return;
            }

            // Use the potentially custom-loaded prompts
            const btnSubContainer1 = utils.createButtonContainerFromJson(
                inputBoxElement,
                myPromptJson1,
                currentConfig.inputProcessor
            );
            const btnSubContainer2 = utils.createButtonContainerFromJson(
                inputBoxElement,
                myPromptJson2,
                currentConfig.inputProcessor
            );
            const btnSubContainer3 = utils.createButtonContainerFromJson(
                inputBoxElement,
                myPromptJson3,
                currentConfig.inputProcessor
            );
            const btnSubContainer4 = utils.createButtonContainerFromJson(
                inputBoxElement,
                myPromptJson4,
                currentConfig.inputProcessor,
                "append"
            );

            btnSubContainer1.id = addedContainerId;

            btnContainer.appendChild(btnSubContainer1);
            btnContainer.appendChild(btnSubContainer2);
            btnContainer.appendChild(btnSubContainer3);
            btnContainer.appendChild(btnSubContainer4);

            console.log("Buttons added successfully for", currentConfig.hostnames[0]);
            isButtonsAdded = true;
        } catch (error) {
            console.error("Failed to add buttons:", error);
            isButtonsAdded = false;
        }
    }
    initScript();
})();
