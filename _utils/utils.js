// utils.js
module.exports = class Utils {
    constructor() {
    }

    // ! 额外的pattern判断是否执行脚本
    shouldRunScript(inclusionPatterns, exclusionPatterns, url) {
        // Check if the URL matches any inclusion pattern
        if (inclusionPatterns.length > 0 && !inclusionPatterns.some(pattern => pattern.test(url))) {
            return false;
        }

        // Check if the URL matches any exclusion pattern
        if (exclusionPatterns.length > 0 && exclusionPatterns.some(pattern => pattern.test(url))) {
            return false;
        }

        // Default behavior for other pages
        return true;
    }

    // ! 生成装btn的容器
    createButtonContainer() {
        const container = document.createElement('div');
        container.style.display = 'inline-block';
        container.style.marginTop = '10px';
        container.style.marginLeft = '10px';
        return container;
    }

    // ! btn: 通用
    createButton(text, callbackFunc) {
        var button = document.createElement('button');
        button = this.setBtnStyle(button);
        button.innerHTML = text;
        button.onclick = callbackFunc;
        return button;
    }

    // ! btn: 普通text
    createTextNode(text) {
        return document.createTextNode(text);
    }

    // ! btn: 复制text
    createButtonCopyText(text, copyText) {
        return this.createButton(text, () => {
            navigator.clipboard.writeText(copyText);
        });
    }

    // ! btn: 打开url
    createButtonOpenUrl(text, targetUrl) {
        return this.createButton(text, () => {
            window.open(targetUrl);
        })
    }

    // ! btn: 改变样式, 变成绿底白字按钮 
    setBtnStyle(btn) {
        btn.style.backgroundColor = '#009688';
        btn.style.color = 'white';
        btn.style.padding = '5px 5px';
        btn.style.height = '30px';
        btn.style.fontSize = '14px';
        btn.style.border = '1px solid #ccc';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';
        btn.style.outline = 'none';
        btn.style.boxSizing = 'border-box';

        return btn;
    }

    // ! 根据text/url生成href
    copyHypertext(text, url, leftPart = '', rightPart = '') {
        // Create a new anchor element
        const hyperlinkElem = document.createElement('a');
        hyperlinkElem.textContent = text;
        hyperlinkElem.href = url;

        // 创建一个新的span元素,用于包裹超链接和括号
        const tempContainerElem = document.createElement('span');
        tempContainerElem.appendChild(document.createTextNode(leftPart));
        tempContainerElem.appendChild(hyperlinkElem);
        tempContainerElem.appendChild(document.createTextNode(rightPart));

        // 临时将span元素插入到页面中(隐藏不可见), 这样才能选中并复制
        tempContainerElem.style.position = 'absolute';
        tempContainerElem.style.left = '-9999px';
        document.body.appendChild(tempContainerElem);

        // 选择临时元素并复制
        const range = document.createRange();
        range.selectNode(tempContainerElem);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand('copy');
        selection.removeAllRanges();

        // 把临时的元素从页面中移除
        document.body.removeChild(tempContainerElem);
    }

    // ! 把container添加到页面固定位置
    addFixedPosContainerToPage(container, { top, left }) {
        document.body.appendChild(container);
        container.style.position = 'fixed';
        container.style.zIndex = '1000';  // Ensure it's above other elements
        container.style.top = top;
        container.style.left = left;
    }

    observeDOM = (function () {
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

};
