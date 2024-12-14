// utils.js
(function(window) {
    'use strict';

    const utils = {};

    // Internal functions - not exposed
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

    function createButton(prompts, promptKey) {
        const button = document.createElement('button');
        setBtnStyle(button);
        button.innerHTML = prompts[promptKey].btnNm;
        // You can add onclick handler here if needed
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

    // Exposed functions
    utils.createButtonContainerFromJson = function(prompts) {
        const buttonContainer = createButtonContainer();
        for (const promptKey in prompts) {
            buttonContainer.append(createButton(prompts, promptKey));
        }
        return buttonContainer;
    };

    window.utils = utils;
})(window);