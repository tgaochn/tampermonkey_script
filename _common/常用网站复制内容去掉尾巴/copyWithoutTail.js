// ==UserScript==
// @name        ������վ��������ȥ��β��
// @description copy without extra content
// @include     *://leetcode*.com/*
// @include     *://www.1point3acres*.com/*
// @include     *://www.zhihu.com/*
// @include     *://zhihu.com/*
// @version     0.2
// @author      gtfish
// ==/UserScript==
// ��Ч��վ:
//      Leetcode
//      һĶ���ֵ�
//      ֪��


(function() {
    'use strict';

    // Your code here...
    [...document.querySelectorAll('*')].forEach(item=>{
    item.oncopy = function(e) {
        e.stopPropagation();
    }
});


})();
