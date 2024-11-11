// utils.js
module.exports = class Utils {
    constructor() {
    }

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

    createButtonContainer(document) {
        const container = document.createElement('div');
        container.style.display = 'inline-block';
        container.style.marginTop = '10px';
        container.style.marginLeft = '10px';
        return container;
    }

    createButton(text, callbackFunc) {
        var button = document.createElement('button');
        button = setBtnStyle(button);
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
};

// module.exports = {
//     // ! 额外的pattern判断是否执行脚本
//     shouldRunScript: function (inclusionPatterns, exclusionPatterns, url) {
//         // Check if the URL matches any inclusion pattern
//         if (inclusionPatterns.length > 0 && !inclusionPatterns.some(pattern => pattern.test(url))) {
//             return false;
//         }

//         // Check if the URL matches any exclusion pattern
//         if (exclusionPatterns.length > 0 && exclusionPatterns.some(pattern => pattern.test(url))) {
//             return false;
//         }

//         // Default behavior for other pages
//         return true;
//     },

//     // ! 装btn的容器
//     createButtonContainer: function (document) {
//         const container = document.createElement('div');
//         container.style.display = 'inline-block';
//         container.style.marginTop = '10px';
//         container.style.marginLeft = '10px';
//         return container;
//     },

//     // ! btn: 通用
//     createButton: function (text, callbackFunc) {
//         var button = document.createElement('button');
//         button = setBtnStyle(button);
//         button.innerHTML = text;
//         button.onclick = callbackFunc;
//         return button;
//     },

//     // ! btn: 普通text
//     createTextNode: function (text) {
//         return document.createTextNode(text);
//     },

//     // ! btn: 复制text
//     createButtonCopyText: function (text, copyText) {
//         return createButton(text, () => {
//             navigator.clipboard.writeText(copyText);
//         });
//     },

// };