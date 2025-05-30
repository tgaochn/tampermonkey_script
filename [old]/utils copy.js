// utils.js
module.exports = class Utils {
    constructor() {
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

    // ! 使用json生成装btn的容器
    createButtonContainerFromJson(prompts) {
        const buttonContainer = this.createButtonContainer();
        for (const promptKey in prompts) {
            buttonContainer.append(this.createButton(prompts, promptKey));
        }
        return buttonContainer;
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

    // ! 把container添加到页面某元素旁边, 有两种方式...
    addContainerNextToElement1(container, element) {
        element.parentNode.insertBefore(container, element.parentNode.nextSibling);
    }
    addContainerNextToElement2(container, element) {
        element.parentNode.insertBefore(container, element.nextSibling);
    }

    // ! 根据url找到匹配的pattern, 返回title
    findBestMatch(url, patterns) {
        for (const { pattern, title } of patterns) {
            if (pattern.test(url)) {
                return title;
            }
        }
        return "link"; // Default to the hostname if no match found
    }
};

(function (window) {
    'use strict';

    // At the start of utils1.js
    console.log('Utils script starting to load');
    const btnUtils = {};
    console.log('btnUtils object created');

    /* !! -------------------------------------------------------------------------- */
    /*                     !! Internal functions - not exposed                       */
    /* !! -------------------------------------------------------------------------- */
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

    function createButtonContainer() {
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'inline-block';
        buttonContainer.style.justifyContent = 'center';
        buttonContainer.style.marginTop = '10px';
        buttonContainer.style.marginLeft = '10px';
        return buttonContainer;
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

    // claude need <p></p> tags to format the long string into multiple lines
    function claudeLongStringProcessor(longString) {
        let lines = longString.split('\n');
        let formattedLines = lines.map(line => `<p>${line}</p>`);
        return formattedLines.join('');
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

    /* !! -------------------------------------------------------------------------- */
    /*                            !! Exposed functions                               */
    /* !! -------------------------------------------------------------------------- */

    btnUtils.observeDOM = function (targetNode, onAddCallback, onRemoveCallback) {
        console.log('observeDOM function added to btnUtils');

        const MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
        const eventListenerSupported = window.addEventListener;

        if (MutationObserver) {
            const mutationObserver = new MutationObserver(function (mutations, observer) {
                if (mutations[0].addedNodes.length && onAddCallback) {
                    onAddCallback();
                }
            });

            mutationObserver.observe(targetNode, {
                childList: true,
                subtree: true
            });
        } else if (eventListenerSupported) {
            targetNode.addEventListener('DOMNodeInserted', onAddCallback, { once: true });
        }
    };

    btnUtils.createButton = function (prompts, promptKey) {
        console.log('createButton function added to btnUtils');
        
        const inputBoxSelector = "div[enterkeyhint='enter']";
        const button = document.createElement('button');
        setBtnStyle(button);
        button.innerHTML = prompts[promptKey].btnNm;
        button.onclick = () => {
            const input = document.querySelector(inputBoxSelector);
            const inputNewCont = prompts[promptKey].prompt;
            if (input && input instanceof HTMLElement) {
                input.innerHTML = claudeLongStringProcessor(inputNewCont);
                setSelection(input);
            }

            if (prompts[promptKey].sendOutPrompt) {
                setTimeout(() => {
                    sendEnterKey(input);
                }, 1000);
            }
        };
        return button;
    };

    btnUtils.createButtonContainerFromJson = function (prompts) {
        console.log('createButtonContainerFromJson function added to btnUtils');

        const buttonContainer = createButtonContainer();
        for (const promptKey in prompts) {
            buttonContainer.append(btnUtils.createButton(prompts, promptKey));
        }
        return buttonContainer;
    };

    window.btnUtils = btnUtils;
    console.log('createButtonContainerFromJson function added to btnUtils');

})(window);