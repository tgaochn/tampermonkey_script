// ==UserScript==
// @name            0_1_补全蓝奏云链接
// @namespace       http://tampermonkey.net/
// @description     补全贴吧的蓝奏云链接并打开, 借用了 桃源隐叟 的代码
// @version         0.1.0
// @author          gtfish
// @include         *
// @grant           GM_openInTab
// @grant           GM_registerMenuCommand
// @run-at          document-end
// @noframes
// @homepageURL
// @supportURL
// @updateURL           https://raw.githubusercontent.com/tgaochn/tampermonkey_script/refs/heads/master/_common/%E5%8F%B3%E9%94%AE%E5%BF%AB%E6%8D%B7%E6%89%93%E5%BC%80%E7%99%BE%E5%BA%A6%E7%9B%98%E7%AD%89/openInLanzouyun.js
// @downloadURL         https://raw.githubusercontent.com/tgaochn/tampermonkey_script/refs/heads/master/_common/%E5%8F%B3%E9%94%AE%E5%BF%AB%E6%8D%B7%E6%89%93%E5%BC%80%E7%99%BE%E5%BA%A6%E7%9B%98%E7%AD%89/openInLanzouyun.js
// ==/UserScript==

(function () {
    "use strict";

    // These helpers produce better VM code in JS engines due to their
    // explicitness and function inlining.
    function isUndef(v) {
        return v === undefined || v === null;
    }

    function isDef(v) {
        return v !== undefined && v !== null;
    }

    function isTrue(v) {
        return v === true;
    }

    function isFalse(v) {
        return v === false;
    }

    /**
     * Check if value is primitive.
     */
    function isPrimitive(value) {
        return (
            typeof value === "string" ||
            typeof value === "number" ||
            // $flow-disable-line
            typeof value === "symbol" ||
            typeof value === "boolean"
        );
    }

    /**
     * Quick object check - this is primarily used to tell
     * Objects from primitive values when we know the value
     * is a JSON-compliant type.
     */
    function isObject(obj) {
        return obj !== null && typeof obj === "object";
    }

    /**
     * Get the raw type string of a value, e.g., [object Object].
     */

    function toRawType(value) {
        return _toString.call(value).slice(8, -1);
    }

    /**
     * Strict object type check. Only returns true
     * for plain JavaScript objects.
     */
    function isPlainObject(obj) {
        return _toString.call(obj) === "[object Object]";
    }

    function isRegExp(v) {
        return _toString.call(v) === "[object RegExp]";
    }

    /**
     * Check if val is a valid array index.
     */
    function isValidArrayIndex(val) {
        var n = parseFloat(String(val));
        return n >= 0 && Math.floor(n) === n && isFinite(val);
    }

    function isPromise(val) {
        return isDef(val) && typeof val.then === "function" && typeof val.catch === "function";
    }

    /**
     * Convert a value to a string that is actually rendered.
     */
    function toString(val) {
        return val == null ? "" : Array.isArray(val) || (isPlainObject(val) && val.toString === _toString) ? JSON.stringify(val, null, 2) : String(val);
    }

    /**
     * Convert an input value to a number for persistence.
     * If the conversion fails, return original string.
     */
    function toNumber(val) {
        var n = parseFloat(val);
        return isNaN(n) ? val : n;
    }

    /**
     * Make a map and return a function for checking if a key
     * is in that map.
     */
    function makeMap(str, expectsLowerCase) {
        var map = Object.create(null);
        var list = str.split(",");
        for (var i = 0; i < list.length; i++) {
            map[list[i]] = true;
        }
        return expectsLowerCase
            ? function (val) {
                  return map[val.toLowerCase()];
              }
            : function (val) {
                  return map[val];
              };
    }

    /**
     * Check if a tag is a built-in tag.
     */

    /**
     * Check if an attribute is a reserved attribute.
     */
    var isReservedAttribute = makeMap("key,ref,slot,slot-scope,is");

    /**
     * Remove an item from an array.
     */
    function remove(arr, item) {
        if (arr.length) {
            var index = arr.indexOf(item);
            if (index > -1) {
                return arr.splice(index, 1);
            }
        }
    }

    /**
     * Check whether an object has the property.
     */
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    function hasOwn(obj, key) {
        return hasOwnProperty.call(obj, key);
    }

    /**
     * Create a cached version of a pure function.
     */
    function cached(fn) {
        var cache = Object.create(null);
        return function cachedFn(str) {
            var hit = cache[str];
            return hit || (cache[str] = fn(str));
        };
    }

    /**
     * Camelize a hyphen-delimited string.
     */

    var camelize = cached(function (str) {
        return str.replace(camelizeRE, function (_, c) {
            return c ? c.toUpperCase() : "";
        });
    });

    /**
     * Capitalize a string.
     */
    var capitalize = cached(function (str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    });

    /**
     * Hyphenate a camelCase string.
     */
    var hyphenateRE = /\B([A-Z])/g;
    var hyphenate = cached(function (str) {
        return str.replace(hyphenateRE, "-$1").toLowerCase();
    });
    // 记住最近一次"非空选区": 点菜单时页面可能已经失焦或把选区清掉了
    var lastSel = "";
    function rememberSelection() {
        var s = window.getSelection() ? String(window.getSelection()) : "";
        if (s.trim()) lastSel = s;
    }
    document.addEventListener("selectionchange", rememberSelection, true);
    document.addEventListener("mouseup", rememberSelection, true);
    rememberSelection();    // 启动时先记一次, 以防注入前用户就已经选好了文字

    function openSelected() {
        // 没有选区的 frame 直接退出; 配合 @noframes, 一次点击只会打开一个窗口
        var selection = (window.getSelection() ? window.getSelection().toString() : "").trim() || lastSel.trim();
        if (!selection) {
            console.log("[蓝奏云] 没有可用选区");
            return;
        }
        console.log(selection);
        var gotoSite = `https://www.lanzoux.com/${selection}`;
        GM_openInTab(gotoSite);
    }

    // 菜单由脚本自己注册: 一次注册长期有效, 可以反复点,
    // 不像 @run-at context-menu 那样"点一次就没了, 要刷新页面才回来"
    GM_registerMenuCommand("补全蓝奏云链接(用当前选区)", openSelected);
})();
