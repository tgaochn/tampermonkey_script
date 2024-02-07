// ==UserScript==
// @name         aws_region2
// @namespace    aws_region2
// @version      0.0.1
// @description  任意网站跳转 - aws region1 跳转到 region2
// @author       gtfish
// @include      *://*.console.aws.amazon.com/*
// @include      *
// @updateURL       https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/AnyWebsite_jump/aws_region2.js
// @downloadURL     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/AnyWebsite_jump/aws_region2.js

// ==/UserScript==

(function() {
    'use strict';

    // Check if the current URL is the specific AWS console URL
    if (window.location.href === "https://us-east-1.console.aws.amazon.com/console/home?region=us-east-1#" || window.location.href === "https://us-east-1.console.aws.amazon.com/console/home?region=us-east-1") {
        // Redirect to the US East 2 console
        window.location.href = "https://us-east-2.console.aws.amazon.com/console/home?region=us-east-2#";
    }
})();