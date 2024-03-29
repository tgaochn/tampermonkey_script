// ==UserScript==
// @name         jira_add_buttons
// @description  Add buttons in JIRA
// @author       gtfish
// @version      0.1.0
// @match        http*://bugs.indeed.com/*
// @grant        GM_addStyle
// @updateURL           https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/JiraTicketAddBtn/JiraTicketAddBtn.js
// @downloadURL         https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/JiraTicketAddBtn/JiraTicketAddBtn.js
// ==/UserScript==
// 0.1.0: 优化了copy hypertext
// 0.0.1: 修改部分btn


(function () {
    'use strict';

    GM_addStyle(`
      #snackbar {
  visibility: hidden;
  min-width: 250px;
  margin-left: -125px;
  background-color: #333;
  color: #fff;
  text-align: center;
  border-radius: 2px;
  padding: 16px;
  position: fixed;
  z-index: 1;
  left: 50%;
  top: 50px;
  font-size: 17px;
}

#snackbar.show {
  visibility: visible;
  -webkit-animation: fadein 0.5s, fadeout 0.5s 2.5s;
  animation: fadein 0.5s, fadeout 0.5s 2.5s;
}

@-webkit-keyframes fadein {
  from {top: 0; opacity: 0;}
  to {top: 50px; opacity: 1;}
}

@keyframes fadein {
  from {top: 0; opacity: 0;}
  to {top: 50px; opacity: 1;}
}

@-webkit-keyframes fadeout {
  from {top: 50px; opacity: 1;}
  to {top: 0; opacity: 0;}
}

@keyframes fadeout {
  from {top: 50px; opacity: 1;}
  to {top: 0; opacity: 0;}
}
    `);
    var observeDOM = (function () {
        var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
        var eventListenerSupported = window.addEventListener;

        return function (obj, onAddCallback, onRemoveCallback) {
            if (MutationObserver) {
                // define a new observer
                var mutationObserver = new MutationObserver(function (mutations, observer) {
                    if (mutations[0].addedNodes.length && onAddCallback != undefined) {
                        onAddCallback();
                    }
                });
                // have the observer observe foo for changes in children
                mutationObserver.observe(obj, {
                    childList: true
                });
            } else if (eventListenerSupported) {
                obj.addEventListener('DOMNodeInserted', onAddCallback, false);
            }
        };
    })();


    var ff = function () {
        setTimeout(function () {
            if (document.getElementById("copy_id") == null) {
                addCopyBtn();
            }
        }, 0);
    }
    var target = document.getElementsByTagName('body')[0];
    observeDOM(target, /*onAdd*/ ff, /*onRemove*/ ff);

})();

function addCopyBtn() {
    if (!document.getElementById('stalker')) return;

    const id = document.getElementById("key-val").childNodes[0].data;
    const summary = document.getElementById("summary-val").childNodes[0].data;
    const link = "https://bugs.indeed.com/browse/" + id

    const idBtn = document.createElement("a");
    idBtn.innerHTML = "Copy id";
    idBtn.id = "copy_id";
    idBtn.onclick = (e) => {
        navigator.clipboard.writeText(id);
    };

    // const summaryBtn = document.createElement("a");
    // summaryBtn.innerHTML = "Copy summary";
    // summaryBtn.id = "copy_summary";
    // summaryBtn.onclick = (e) => {
    //     navigator.clipboard.writeText(summary);
    // };

    const linkBtn = document.createElement("a");
    linkBtn.innerHTML = "Copy link";
    linkBtn.id = "copy_link";
    linkBtn.onclick = (e) => {
        navigator.clipboard.writeText(link);
    };

    const idHypertextBtn = document.createElement("a");
    idHypertextBtn.innerHTML = "hypertext: (id)";
    idHypertextBtn.id = "copy_text_link";
    idHypertextBtn.onclick = (e) => {
        // 复制hypertext再修改, 否则page上的元素也会被修改
        var idCont = document.querySelector("a.issue-link");
        let idContDup = idCont.cloneNode(true);
        // 可以在这里修改 text/link, 不过这里的text都会被当成hypertext的一部分
        // idContDup.textContent = "(" + id + ")";
        // idContDup.href = 'https://www.example.com';

        // 创建一个新的span元素,用于包裹超链接和括号
        var spanElem = document.createElement('span');
        spanElem.appendChild(document.createTextNode('('));
        spanElem.appendChild(idContDup);
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
    };

    const idHypertextBtn2 = document.createElement("a");
    idHypertextBtn2.innerHTML = "hypertext: id";
    idHypertextBtn2.id = "copy_text_link2";
    idHypertextBtn2.onclick = (e) => {
        // 复制hypertext再修改, 否则page上的元素也会被修改
        var idCont = document.querySelector("a.issue-link");
        let idContDup = idCont.cloneNode(true);
        // 可以在这里修改 text/link, 不过这里的text都会被当成hypertext的一部分
        // idContDup.textContent = "(" + id + ")";
        // idContDup.href = 'https://www.example.com';

        // 创建一个新的span元素,用于包裹超链接和括号
        var spanElem = document.createElement('span');
        spanElem.appendChild(idContDup);
        spanElem.appendChild(document.createTextNode(' '));

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
    };

    // const descBtn = document.createElement("a");
    // descBtn.innerHTML = "Copy desc";
    // descBtn.id = "copy_desc";
    // descBtn.onclick = (e) => {
    //     var descElement = document.getElementsByClassName("activity-new-val");
    //     var descVal = descElement[descElement.length - 1].innerText;
    //     navigator.clipboard.writeText(descVal);
    // };

    const idLinkBtn = document.createElement("a");
    idLinkBtn.innerHTML = "[id|link]";
    idLinkBtn.id = "copy_id_link";
    idLinkBtn.onclick = (e) => {
        navigator.clipboard.writeText("[" + id + "|" + link + "]");
    };

    const idLinkMdBtn = document.createElement("a");
    idLinkMdBtn.innerHTML = "[id](link)";
    idLinkMdBtn.id = "copy_id_md_link";
    idLinkMdBtn.onclick = (e) => {
        navigator.clipboard.writeText("[" + id + "](" + link + ")");
    };

    const idSummaryBtn = document.createElement("a");
    idSummaryBtn.innerHTML = "id: summary";
    idSummaryBtn.id = "copy_id_summary";
    idSummaryBtn.onclick = (e) => {
        navigator.clipboard.writeText(id + ": " + summary);
    };

    // const idSummaryBtn2 = document.createElement("a");
    // idSummaryBtn2.innerHTML = "id summary";
    // idSummaryBtn2.id = "copy_id_summary2";
    // idSummaryBtn2.onclick = (e) => {
    //     navigator.clipboard.writeText(id + " " + summary);
    // };

    // const idSummaryBtn3 = document.createElement("a");
    // idSummaryBtn3.innerHTML = "[id] summary";
    // idSummaryBtn3.id = "copy_id_summary3";
    // idSummaryBtn3.onclick = (e) => {
    //     navigator.clipboard.writeText("[" + id + "] " + summary);
    // };

    const btnArray = [
        idBtn,
        idHypertextBtn,
        idHypertextBtn2,
        linkBtn,
        // summaryBtn,
        // descBtn,
        idLinkBtn,
        idLinkMdBtn,
        idSummaryBtn,
        // idSummaryBtn2,
        // idSummaryBtn3,
    ];
    btnArray.forEach(element => {
        element.className = "aui-button aui-button-primary aui-style";
        document.getElementById("key-val").parentNode.parentNode.appendChild(document.createElement("li").appendChild(element));
    });
}

