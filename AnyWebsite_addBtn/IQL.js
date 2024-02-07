// ==UserScript==
// @name         IQLAddBtn
// @namespace    IQLAddBtn
// @version      0.0.1
// @description  任意网站右边加入相关链接 - IQL 页面增加 link
// @author       gtfish
// @include      *://idash.sandbox.indeed.net/*
// @require      https://cdn.bootcss.com/jquery/3.4.1/jquery.min.js
// @updateURL       https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/AnyWebsite_addBtn/IQL.js
// @downloadURL     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/AnyWebsite_addBtn/IQL.js

// ==/UserScript==
// 2024-02-06: IQL 增加 google sheet to md table 的网站链接

(function () {
    'use strict';
    //var
    let list = [];

    //set css
    function setCss($dom) {
        let css = {
            'color': '#333',
            'display': 'block',
            'width': '100%',
            'text-overflow': 'ellipsis',
            'overflow': 'hidden',
            'white-space': 'nowrap',
        };
        css['font-size'] = '16px';
        $dom.css(css).hover(function () {
            $(this).css('color', '#01AAED');
        }).mouseout(function () {
            $(this).css('color', '#333');
        });
    }

    //create dom
    function createBtn() {
        const css = {
            'position': 'fixed',
            'top': 'calc(23% - 15px)', // 右边中间
            // 'top': 'calc(8% - 15px)', // 右上角
            'right': '0', 
            'border-radius': '10px',
            'border': '1px solid #ccc',
            'height': '25px',
            // 'width': '60px',
            'width': '25px',
            'z-index': '999',
            'box-shadow': '1px 2px 3px #ccc',
            'background': '#009688',
            'color': '#fff',
            'font-size': '14px',
            'outline': 'none',
            'box-sizing': 'border-box',
        };
        // const $btn = $('<button>解</button>').css(css).hover(function () {
        const $btn = $('<button>link</button>').css(css).hover(function () {
            $(this).css('background', '#5FB878');
        }).mouseout(function () {
            $(this).css('background', '#009688');
        });
        return $btn;
    }

    function createDom() {
        const $listDom = $('<div></div>');
        const listCss = {
            'min-width': '30px',
            'box-sizing': 'border-box',
            'padding': '2px',
            'background': '#F0F0F0',
            'box-shadow': '1px 2px 3px #ccc',
            // 'height': '30%', // 多行
            'height': '3%', // 单行
            'position': 'fixed',
            'right': '0',
            'top': '23%',
            'overflow-y': 'auto',
            'color': '#333',
            'border-radius': '5px',
            'line-height': '1.6',
            'z-index': '99',
            'max-width': '160px',

        };
        $listDom.css(listCss).hide();
        for (let i of list) {
            let $a = $(`<a href='${i.url}' target="_blank" title='${i.value}'>${i.value}</a>`);
            setCss($a);
            $listDom.append($a);
        }
        $('body').append($listDom);
        $listDom.slideDown('fast');
        // $listDom.slideUp('fast'); // 自动折叠
        const $btn = createBtn();
        $btn.on('click', () => {
            $listDom.slideToggle();
        });
        $('body').append($btn);
    }

    //get solution
    (function () {
        var $ = $ || window.$;
        // Google Sheet 2 markdown table
        var targetUrl = "https://tabletomarkdown.com/convert-spreadsheet-to-markdown/";
        list.push({ url: targetUrl, value: 'Gsheet2MdTable' })
        
        createDom();
    })();
})();
