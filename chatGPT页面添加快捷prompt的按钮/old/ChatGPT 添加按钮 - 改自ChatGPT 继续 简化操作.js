// ==UserScript==
// @name         ChatGPT 添加按钮 - 改自ChatGPT 继续 简化操作
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  ChatGPT 新增若干按钮并自适应宽度
// @author       gtfish
// @author       Geetesh.Gupta (original)
// @match        https://chat.openai.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// @grant        none
// @license      MIT
// ==/UserScript==

/*
changelog:
0.0.1: init
*/

(function () {
    'use strict';
    function insertButton(elem) {
        let content = document.getElementById('btnContent');
        content.append(elem);
    }

    function createBtn(name) {
        let continueBtn = document.createElement('button');
        continueBtn.textContent = name;
        continueBtn.setAttribute('style', 'display: inline-flex; cursor: pointer;');
        continueBtn.className = 'btn flex gap-2 justify-center btn-neutral';
        continueBtn.style.flexGrow = '1';
        continueBtn.style.width = 'auto';
        continueBtn.style.maxWidth = '100%';

        return continueBtn;
    }

    function getPrevNodeValues() {
        let codeBlocks = document.querySelectorAll('code.hljs');
        let lastCodeBlock = codeBlocks[codeBlocks.length - 1];
        let children = lastCodeBlock.innerText.split("\n")
        let res = "";
        for (let i = children.length - 1; i >= 0 && res.trim().length < 20; i--) {
            res += children[i];
        }
        return res;
    }

    function updateTextArea(value) {
        document.getElementsByTagName('textarea')[0].value = value
    }

    function main() {
        const div = document.createElement('div');
        div.id = "btnContent";
        div.setAttribute('style', 'display: flex;');
        let formElem = document.getElementsByTagName('form')[0];
        let btnsParent = formElem.getElementsByTagName('button')[0].parentElement;
        btnsParent.insertBefore(div, btnsParent.firstElementChild);

        // const btn = createBtn('补全代码');
        // insertButton(btn);
        // btn.onclick = () => {
        //     try {
        //         updateTextArea("从" + getPrevNodeValues() + "这里以代码格式接着写");
        //     } catch (error) {
        //         console.log("Some error occured. Possible reasons:- Previous ChatGPT response does not include any code block or Website structure changed. The actual error: ", error)
        //     }
        // }

        const btnNext = createBtn('continue');
        insertButton(btnNext);
        btnNext.onclick = () => {
            try {
                updateTextArea("continue");
            } catch (error) {
                console.log("Some error occured. Possible reasons:- Previous ChatGPT response does not include any code block or Website structure changed. The actual error: ", error)
            }
        }

        const btnInChn = createBtn('Chinese');
        insertButton(btnInChn);
        btnInChn.onclick = () => {
            try {
                updateTextArea("in chinese");
            } catch (error) {
                console.log("Some error occured. Possible reasons:- Previous ChatGPT response does not include any code block or Website structure changed. The actual error: ", error)
            }
        }

        const btnExample = createBtn('example');
        insertButton(btnExample);
        btnExample.onclick = () => {
            try {
                updateTextArea("more example");
            } catch (error) {
                console.log("Some error occured. Possible reasons:- Previous ChatGPT response does not include any code block or Website structure changed. The actual error: ", error)
            }
        }

        const btnExplain = createBtn('explain');
        insertButton(btnExplain);
        btnExplain.onclick = () => {
            try {
                updateTextArea("explain it in English and Chinese");
            } catch (error) {
                console.log("Some error occured. Possible reasons:- Previous ChatGPT response does not include any code block or Website structure changed. The actual error: ", error)
            }
        }
    }
    main();

    const targetNode = document.getElementById('__next');
    // 创建一个新的 MutationObserver 对象
    const observer = new MutationObserver((mutationsList) => {
        const content = document.getElementById('btnContent');
        if (!content) {
            main();
        }
    });
    // 配置观察选项（我们只关心子元素变化）
    const config = { childList: true };

    // 开始观察目标节点
    observer.observe(targetNode, config);
})();

