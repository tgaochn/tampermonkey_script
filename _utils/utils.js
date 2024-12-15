// utils.js
(function (window) {
    'use strict';

    console.log('Utils script starting to load');
    const utils = {};
    console.log('utils object created');

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

    function createButtonFromPromptKey(prompts, promptKey) {
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

    /* !! -------------------------------------------------------------------------- */
    /*                            !! Exposed functions                               */
    /* !! -------------------------------------------------------------------------- */

    utils.observeDOM = function (targetNode, onAddCallback, onRemoveCallback) {
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

    utils.shouldRunScript = function(inclusionPatterns, exclusionPatterns, url) {
        if (inclusionPatterns.length > 0 && !inclusionPatterns.some(pattern => pattern.test(url))) {
            return false;
        }
        if (exclusionPatterns.length > 0 && exclusionPatterns.some(pattern => pattern.test(url))) {
            return false;
        }
        return true;
    };    

    utils.createButtonFromCallback = function(text, callbackFunc) {
        var button = document.createElement('button');
        button = setBtnStyle(button);
        button.innerHTML = text;
        button.onclick = callbackFunc;
        return button;
    };    

    utils.createTextNode = function(text) {
        return document.createTextNode(text);
    };

    utils.createButtonCopyText = function(text, copyText) {
        return this.createButtonFromCallback(text, () => {
            navigator.clipboard.writeText(copyText);
        });
    };

    utils.createButtonOpenUrl = function(text, targetUrl) {
        return this.createButtonFromCallback(text, () => {
            window.open(targetUrl);
        });
    };

    utils.createButtonContainer = function() {
        const container = document.createElement('div');
        container.style.display = 'inline-block';
        container.style.marginTop = '10px';
        container.style.marginLeft = '10px';
        return container;
    };

    utils.createButtonContainerFromJson = function (prompts) {
        const buttonContainer = createButtonContainer();
        for (const promptKey in prompts) {
            buttonContainer.append(createButtonFromPromptKey(prompts, promptKey));
        }
        return buttonContainer;
    };

    utils.copyHypertext = function(text, url, leftPart = '', rightPart = '') {
        const hyperlinkElem = document.createElement('a');
        hyperlinkElem.textContent = text;
        hyperlinkElem.href = url;

        const tempContainerElem = document.createElement('span');
        tempContainerElem.appendChild(document.createTextNode(leftPart));
        tempContainerElem.appendChild(hyperlinkElem);
        tempContainerElem.appendChild(document.createTextNode(rightPart));

        tempContainerElem.style.position = 'absolute';
        tempContainerElem.style.left = '-9999px';
        document.body.appendChild(tempContainerElem);

        const range = document.createRange();
        range.selectNode(tempContainerElem);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand('copy');
        selection.removeAllRanges();

        document.body.removeChild(tempContainerElem);
    };

    utils.addFixedPosContainerToPage = function(container, { top, left }) {
        document.body.appendChild(container);
        container.style.position = 'fixed';
        container.style.zIndex = '1000';
        container.style.top = top;
        container.style.left = left;
    };

    utils.addContainerNextToElement1 = function(container, element) {
        element.parentNode.insertBefore(container, element.parentNode.nextSibling);
    };

    utils.addContainerNextToElement2 = function(container, element) {
        element.parentNode.insertBefore(container, element.nextSibling);
    };

    utils.findBestMatch = function(url, patterns) {
        for (const { pattern, title } of patterns) {
            if (pattern.test(url)) {
                return title;
            }
        }
        return "link";
    };

    // !! Expose
    window.utils = utils;
    console.log('createButtonContainerFromJson function added to utils');

})(window);