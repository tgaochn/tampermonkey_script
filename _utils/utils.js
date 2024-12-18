// utils.js
(function (window) {
    'use strict';

    console.log('Utils script starting to load');
    const utils = {};
    console.log('utils object created');

    /* !! -------------------------------------------------------------------------- */
    /*                     !! Internal functions - not exposed                       */
    /* !! -------------------------------------------------------------------------- */
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
        this.setBtnStyle(button);
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
    utils.setBtnStyle = function (btn) {
        btn.style.backgroundColor = '#009688';
        btn.style.color = 'white';
        btn.style.padding = '5px 5px';
        btn.style.fontSize = '14px';
        btn.style.border = '1px solid #ccc';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';
        btn.style.outline = 'none';
        btn.style.boxSizing = 'border-box';

        return btn;
    }

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

    // decide whether to run the script based on inclusion and exclusion patterns
    utils.shouldRunScript = function(inclusionPatterns, exclusionPatterns, url) {
        if (inclusionPatterns.length > 0 && !inclusionPatterns.some(pattern => pattern.test(url))) {
            return false;
        }
        if (exclusionPatterns.length > 0 && exclusionPatterns.some(pattern => pattern.test(url))) {
            return false;
        }
        return true;
    };    

    // ! create buttons
    utils.createButtonFromCallback = function(btnText, callbackFunc) {
        var button = document.createElement('button');
        button = this.setBtnStyle(button);
        button.innerHTML = btnText;
        button.onclick = callbackFunc;
        return button;
    };    

    utils.createTextNode = function(btnText) {
        return document.createTextNode(btnText);
    };

    utils.createButtonCopyText = function(btnText, copyText) {
        return this.createButtonFromCallback(btnText, () => {
            navigator.clipboard.writeText(copyText);
        });
    };

    utils.createButtonCopyHypertext = function(btnText, pageTitle, curURL) {
        return this.createButtonFromCallback(btnText, () => {
            this.copyHypertext(pageTitle, curURL);
        });
    };

    utils.createButtonOpenUrl = function(btnText, targetUrl) {
        return this.createButtonFromCallback(btnText, () => {
            window.open(targetUrl);
        });
    };

    // ! create button containers
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

    // ! button behaviors
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

    // ! add buttons and containers to the page
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

    // ! helper functions
    utils.findBestMatch = function(url, patterns) {
        for (const { pattern, title } of patterns) {
            if (pattern.test(url)) {
                return title;
            }
        }
        return "link";
    };

    utils.convertTextToLinks = function(node, patterns) {
        if (node.nodeType === Node.TEXT_NODE) {
            let shouldReplace = false;
            let html = node.textContent;
    
            patterns.forEach(({ regex, urlTemplate }) => {
                if (regex.test(html)) {
                    shouldReplace = true;
                    html = html.replace(regex, (match, p1) => {
                        const url = urlTemplate.replace('$1', p1);
                        return `<a href="${url}">${match}</a>`;
                    });
                }
            });
    
            if (shouldReplace) {
                const span = document.createElement('span');
                span.innerHTML = html;
                node.parentNode.replaceChild(span, node);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE && !['SCRIPT', 'STYLE', 'TEXTAREA', 'A'].includes(node.tagName)) {
            Array.from(node.childNodes).forEach(child => utils.convertTextToLinks(child, patterns));
        }
    };    

    utils.debounce = function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };    

    /* !! -------------------------------------------------------------------------- */
    /*                            !! Expose all the functions and log                */
    /* !! -------------------------------------------------------------------------- */

    window.utils = utils;
    console.log('createButtonContainerFromJson function added to utils');

})(window);