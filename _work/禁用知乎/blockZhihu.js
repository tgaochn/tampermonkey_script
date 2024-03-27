// ==UserScript==
// @name         BlockZhihu
// @name:zh-CN   禁用知乎
// @namespace    http://tampermonkey.net/
// @version      0.1.1
// @description  Stop Wasting Time On Zhihu!
// @author       gtfish
// @match        https://*.zhihu.com
// @grant        none
// ==/UserScript==
// 0.1.1: 只禁用知乎首页, 保留其他知乎页面

(function() {
    'use strict';
    document.open();
    document.write('工作时间别刷知乎!');
    document.close();
})();