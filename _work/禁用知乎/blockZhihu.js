// ==UserScript==
// @name         BlockZhihu
// @name:zh-CN   禁用知乎
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Stop Wasting Time On Zhihu!
// @author       gtfish
// @match        https://*.zhihu.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    document.open();
    document.write('工作时间别刷知乎!');
    document.close();
})();