// ==UserScript==
// @name         蓝奏云连接转换_mod
// @version      0.0.1
// @description  forked from 蓝奏云连接转换 (KongKe)
// @include       *
// @updateURL       https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/lanzouyun/lanzouyun.js
// @downloadURL     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/lanzouyun/lanzouyun.js
// @grant        none
// ==/UserScript==

// changelog:
// 0.0.1: 优化了匹配蓝奏云的正则

(function () {
    function replaceLanZou(str) {
        if (str != undefined && str.indexOf("lanzou") >= 0) {
            console.log(str);
            console.log("发现蓝奏云链接,已进行替换!");
            
            str = str.replace(/(https?:\/\/)?([a-zA-Z0-9]+\.)?lanzou[a-z]?\.com/g, "https://$2lanzoux.com");
            str = str.replace(/(https?:\/\/)?([a-zA-Z0-9]+\.)?woozooo\.com/g, "https://$2lanzoux.com");

            return str
        }
        return str;
    }

    document.addEventListener('copy', function (e) {
        if (e.path[0].id != 'copy_input') {
            var content = window.getSelection().toString();
            var netContent = replaceLanZou(content);
            if (content != netContent) {
                var input = document.createElement("input");
                input.setAttribute("id", "copy_input");
                input.setAttribute("value", netContent);
                document.body.appendChild(input);
                input.select();
                document.execCommand("copy");
                document.body.removeChild(input);
            }
        }
    });


    function replaceTextNode(node) {
        var children = node.childNodes;
        for (var i = 0; i < children.length; i++) {
            replaceTextNode(children[i])
        }
        if (node.nodeType === 3) {
            var data = replaceLanZou(node.data);
            if (node.data != data) {
                node.data = data;
            }
        }
    }


    setTimeout(function () {
        var arr = document.getElementsByTagName("a");
        for (var i = 0; i < arr.length; i++) {
            var a = arr[i];
            var href = a.getAttribute("href");
            var newHref = replaceLanZou(href);
            if (href != newHref) {
                a.setAttribute("href", newHref);
            }
        }
        replaceTextNode(document);
    }, 1500);


})();