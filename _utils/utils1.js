// btnUtils.js
(function (window) {
    'use strict';

    const btnUtils = {};

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
        const buttonContainer = createButtonContainer();
        for (const promptKey in prompts) {
            buttonContainer.append(btnUtils.createButton(prompts, promptKey));
        }
        return buttonContainer;
    };

    window.btnUtils = btnUtils;
})(window);