// 根据url pattern判断是否执行脚本, 只有非空pattern list才会匹配
window.shouldRunScript = function shouldRunScript(inclusionPatterns, exclusionPatterns) {
    const url = window.location.href;

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


window.copyHypertext = function copyHypertext(text, url, leftPart = '', rightPart = '') {
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

