// ==UserScript==
// @name        常用网站复制内容去掉尾巴
// @description copy without extra content
// @include     *://leetcode*.com/*
// @include     *://www.1point3acres*.com/*
// @include     *://www.zhihu.com/*
// @include     *://zhihu.com/*
// @version     0.2
// @author      gtfish
// ==/UserScript==
// 生效网站:
//      Leetcode
//      一亩三分地
//      知乎


(function() {
    'use strict';

    // Your code here...
    [...document.querySelectorAll('*')].forEach(item=>{
    item.oncopy = function(e) {
        e.stopPropagation();
    }
});


})();
