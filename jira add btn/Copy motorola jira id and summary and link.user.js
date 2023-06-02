// ==UserScript==
// @name         Copy motorola jira id and summary and link
// @name:zh-CN   快速复制jira id和summary/link
// @namespace    http://tampermonkey.net/
// @description  Add three button to copy the jira id and summary and link
// @author       Andy
// @version      0.3
// @match        http*://bugs.indeed.com/*
// @grant        GM_addStyle
// ==/UserScript==

// 1. 加入了copy超链接
// 2. 修改了summary的格式
// 3. 加了copy desc带格式


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

    const summaryBtn = document.createElement("a");
    summaryBtn.innerHTML = "Copy summary";
    summaryBtn.id = "copy_summary";
    summaryBtn.onclick = (e) => {
        navigator.clipboard.writeText(summary);
    };

    const linkBtn = document.createElement("a");
    linkBtn.innerHTML = "Copy link";
    linkBtn.id = "copy_link";
    linkBtn.onclick = (e) => {
        navigator.clipboard.writeText(link);
    };

    const idHypertextBtn = document.createElement("a");
    idHypertextBtn.innerHTML = "Copy id (hypertext)";
    idHypertextBtn.id = "copy_text_link";
    idHypertextBtn.onclick = (e) => {
        var idCont = document.querySelector("a.issue-link");
        var range = document.createRange();
        range.selectNode(idCont);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand('copy');
    };

    const descBtn = document.createElement("a");
    descBtn.innerHTML = "Copy desc";
    descBtn.id = "copy_desc";
    descBtn.onclick = (e) => {
        var descElement = document.getElementsByClassName("activity-new-val");
        var descVal = descElement[descElement.length - 1].innerText;
        navigator.clipboard.writeText(descVal);
    };

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

    const idSummaryBtn2 = document.createElement("a");
    idSummaryBtn2.innerHTML = "id summary";
    idSummaryBtn2.id = "copy_id_summary2";
    idSummaryBtn2.onclick = (e) => {
        navigator.clipboard.writeText(id + " " + summary);
    };

    const idSummaryBtn3 = document.createElement("a");
    idSummaryBtn3.innerHTML = "[id] summary";
    idSummaryBtn3.id = "copy_id_summary3";
    idSummaryBtn3.onclick = (e) => {
        navigator.clipboard.writeText("[" + id + "] " + summary);
    };

    const btnArray = [
        idBtn,
        idHypertextBtn,
        linkBtn,
        summaryBtn,
        descBtn,
        idLinkBtn,
        idLinkMdBtn,
        idSummaryBtn,
        idSummaryBtn2,
        idSummaryBtn3,
    ];
    btnArray.forEach(element => {
        element.className = "aui-button aui-button-primary aui-style";
        document.getElementById("key-val").parentNode.parentNode.appendChild(document.createElement("li").appendChild(element));
    });
}

