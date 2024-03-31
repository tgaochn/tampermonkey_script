// ==UserScript==
// @name                Butterfly_webapp_btn
// @version             0.2.3
// @description         Add btn on Butterfly webapp
// @author              gtfish
// @license             MIT
// @match               https://butterfly.sandbox.indeed.net/*
// @run-at              document-idle
// @grant               GM_getValue
// @grant               GM_setValue
// @grant               GM_registerMenuCommand
// @updateURL           https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/Butterfly_webapp_btn/Butterfly_webapp_btn.js
// @downloadURL         https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/Butterfly_webapp_btn/Butterfly_webapp_btn.js
// ==/UserScript==
// 0.2.0: 增加copy build id
// 0.1.0: 优化了hypertext的复制逻辑
// 0.0.1: init, 添加若干按钮

(async function () {
    'use strict';

    // ! function to create button/container/selection
    function setBtnStyle(btn) {
        btn.style.backgroundColor = '#009688';
        btn.style.color = 'white';
        btn.style.padding = '5px 5px';
        btn.style.height = '10px';
        btn.style.fontSize = '14px';
        btn.style.border = '1px solid #ccc';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';
        btn.style.outline = 'none';
        btn.style.boxSizing = 'border-box';
    }

    function createButton(text, callbackFunc) {
        const button = document.createElement('button');
        button.className = 'model-view--status-label badge bg-info';
        // button.className = 'text-nowrap btn btn-warning btn-sm';
        // setBtnStyle(button);
        button.innerHTML = text;
        button.onclick = callbackFunc;
        return button;
    }

    function createButtonContainer() {
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'inline-block';
        buttonContainer.style.justifyContent = 'center';
        buttonContainer.style.marginTop = '10px';
        buttonContainer.style.marginLeft = '10px';

        return buttonContainer;
    }

    // ! wait until the page is loaded
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
    const hyperLinkSelector = 'div[class="model-view--header-model-name-row"]';
    while (true) {
        await delay(100);
        if (document.querySelector(hyperLinkSelector)) {
            break;
        }
    }

    // ! add button in the container and define click func
    const buttonContainer = createButtonContainer();
    const hyperlink = document.querySelector(hyperLinkSelector).childNodes[0];
    const id = hyperlink.childNodes[0].innerText;
    const url = 'https://butterfly.sandbox.indeed.net/#/model/' + id;
    const buildsTagsSelector = 'span[class="row no-gutters justify-content-start"]';

    buttonContainer.append(
        createButton('copy_id', () => {
            navigator.clipboard.writeText(id);
        })
    );

    buttonContainer.append(
        createButton('copy_url', () => {
            navigator.clipboard.writeText(url);
        })
    );

    buttonContainer.append(
        createButton('md_[model](url)', () => {
            const cont = '[model](' + url + ')';
            navigator.clipboard.writeText(cont);
        })
    );

    buttonContainer.append(
        createButton('md_[model|url]', () => {
            const cont = '[model|' + url + ']';
            navigator.clipboard.writeText(cont);
        })
    );

    buttonContainer.append(
        createButton('copy_last_build_id', () => {
            const buildsTags = document.querySelector(buildsTagsSelector).childNodes[0].childNodes;
            const lastBuildId = buildsTags[buildsTags.length - 1].id;
            navigator.clipboard.writeText(lastBuildId);
        })
    );

    buttonContainer.append(
        createButton('copy_all_build_id', () => {
            const buildsTags = document.querySelector(buildsTagsSelector).childNodes[0].childNodes;
            const buildIds = [];
            
            buildsTags.forEach((div) => {
                buildIds.push(div.id);
            });
            
            const textToCopy = buildIds.join("\n");
            navigator.clipboard.writeText(textToCopy);
        })
    );

    buttonContainer.append(
        createButton('hyperLink: (model)', () => {
            // 复制hypertext再修改, 否则page上的元素也会被修改
            let hyperlinkDup = hyperlink.cloneNode(true);
            // 可以在这里修改 text/link, 不过这里的text都会被当成hypertext的一部分
            hyperlinkDup.textContent = "model";
            // hyperlinkDup.href = 'https://www.example.com';

            // 创建一个新的span元素,用于包裹超链接和括号
            var spanElem = document.createElement('span');
            spanElem.appendChild(document.createTextNode('('));
            spanElem.appendChild(hyperlinkDup);
            spanElem.appendChild(document.createTextNode(')'));

            // 临时将span元素插入到页面中(隐藏不可见), 这样才能选中并复制
            spanElem.style.position = 'absolute';
            spanElem.style.left = '-9999px';
            document.body.appendChild(spanElem);

            // 选择临时元素并复制
            var range = document.createRange();
            range.selectNode(spanElem);
            var selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            document.execCommand('copy');
            selection.removeAllRanges();

            // 把临时的元素从页面中移除
            document.body.removeChild(spanElem);
        })
    );

    // ! add container to the table
    const table = document.querySelector('.table.table-sm.model-view--table');
    const newRow = document.createElement('tr');
    const cell1 = document.createElement('td');
    const cell2 = document.createElement('td');
    cell1.textContent = 'My Btn';
    cell2.appendChild(buttonContainer);
    newRow.appendChild(cell1);
    newRow.appendChild(cell2);
    table.appendChild(newRow);
})();