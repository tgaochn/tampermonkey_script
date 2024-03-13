// ==UserScript==
// @name         LeetCode OneInput
// @namespace    https://leetcode-cn.com/
// @version      1.1
// @description  一键复制所有样例输入
// @author       Mcginn
// @match        *://leetcode-cn.com/problems/*
// @exclude      *://leetcode-cn.com/problems/*solution*
// @exclude      *://leetcode-cn.com/problems/*submissions*
// @exclude      *://leetcode-cn.com/problems/*comments*
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @resource     notycss https://cdn.jsdelivr.net/npm/noty@3.1.4/lib/noty.min.css
// @require      https://cdn.jsdelivr.net/npm/noty@3.1.4/lib/noty.min.js
// @require      https://cdn.jsdelivr.net/npm/jquery@v3.4.1/dist/jquery.min.js
// @run-at       document-end
// ==/UserScript==

// 1. 加入英文版的关键字(input/output)
// 2. 修正不能识别小数点/负数的bug
// 3. 同时复制输入输出
// 4. 增加识别bool类型输出
// 5. 进入题解时关闭复制功能

(function () {
    'use strict';

    GM_addStyle(GM_getResourceText('notycss'));

    function isDidit(character) {
        return ('0' <= character && character <= '9') || character == '.' || character == '-';
    }

    // process one single input
    function parseInput(problemDescription) {
        // console.log(problemDescription);
        var idx = 0, inputs = new Array();
        while (idx < problemDescription.length) {
            if ('[' == problemDescription[idx]) {
                // format data in []
                var cnt = 0, indexStart = idx;
                while (idx < problemDescription.length) {
                    switch (problemDescription[idx++]) {
                        case '[':
                            ++cnt;
                            break;
                        case ']':
                            --cnt;
                            break;
                        default:
                            break;
                    }
                    if (0 == cnt)
                        break;
                }
                inputs.push(problemDescription.substring(indexStart, idx));

            } else if ('{' == problemDescription[idx]) {
                // format data in {}
                var cnt = 0, indexStart = idx;
                while (idx < problemDescription.length) {
                    switch (problemDescription[idx++]) {
                        case '{':
                            ++cnt;
                            break;
                        case '}':
                            --cnt;
                            break;
                        default:
                            break;
                    }
                    if (0 == cnt)
                        break;
                }
                inputs.push(problemDescription.substring(indexStart, idx));

            } else if ('\"' == problemDescription[idx]) {
                // format data in ""
                var indexStart = idx++;
                while (idx < problemDescription.length && problemDescription[idx] != '\"') {
                    ++idx;
                }
                inputs.push(problemDescription.substring(indexStart, ++idx));
                // } else if ('0' <= problemDescription[idx] && problemDescription[idx] <= '9') {

            } else if (isDidit(problemDescription[idx])) {
                // format numbers

                // number after the variables, e.g. text1 = "abc"
                if ((idx + 1 < problemDescription.length && problemDescription[idx + 1] == '=') ||
                    (idx + 2 < problemDescription.length && problemDescription[idx + 1] == ' ' && problemDescription[idx + 2] == '=')) {
                    ++idx;

                } else {
                    // num = 123
                    var indexStart = idx;
                    while (idx < problemDescription.length && isDidit(problemDescription[idx])) {
                        ++idx;
                    }
                    var indexEnd = idx;
                    var strInput = problemDescription.substring(indexStart, indexEnd);
                    inputs.push(strInput);
                }
                
            } else {
                ++idx;
            }
        }
        return inputs
    }

    // process the whole text for all examples including input/output/Explanation
    function parseExampleInput(problemDescription) {
        var arrayInput = new Array();
        var regexpInput = /nput[：:]((.|\n)+?)(Explanation|Example|Constraints)/g
        // var regexpInput = /nput[：:]((.|\n)+?)utput/g
        // var regexpInput = /输入[：:]((.|\n)+?)输出/g
        var ret;
        while (ret = regexpInput.exec(problemDescription)) {
            var inputs = ret[1];

            const strList = inputs.split('utput'); // in case there are two "Output"
            if (strList.length > 2) {
                inputs = strList[0] + strList[1]
            }

            console.log('inputs = ' + inputs);
            var parsedInput = parseInput(inputs)
            if (inputs.includes("Output: true")) {
                parsedInput.push("True")
            } else if (inputs.includes("Output: false")) {
                parsedInput.push("False")
            }
            arrayInput = arrayInput.concat(parsedInput);
        }
        var strInput = arrayInput.join('\n');
        return strInput;
    }

    function copyAllTestCases() {
        new Noty({
            type: 'info',
            layout: 'topRight',
            text: 'Trying to find and copy all testcases',
            timeout: 1000
        }).show();

        var selector = 'div.description__2b0C';
        if ($(selector) && $(selector).text().length > 0) {
            var exampleInputStr = parseExampleInput($(selector).text());
            GM_setClipboard(exampleInputStr);
            new Noty({
                type: "success",
                layout: "topRight",
                text: "Have copy all testcases: \n" + exampleInputStr,
                timeout: 1000
            }).show();
            return true;
        } else {
            return false;
        }
    }

    var checkExist = setInterval(
        function () {
            if (copyAllTestCases()) {
                clearInterval(checkExist);
            }
        }, 3000);

    GM_registerMenuCommand("一键复制", copyAllTestCases);
})();