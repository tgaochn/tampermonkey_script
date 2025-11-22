// ==UserScript==
// @name         关键词提取器
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  提取该网页的指定关键词
// @match        http*://*.gamer520.com/*
// @match        http*://*.xxxxx520.cam/*
// @grant        none
// @license      GPL-3.0 License
// @updateURL       https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/fetchKeywordOnGamer520/fetchKeywordOnGamer520.js
// @downloadURL     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/fetchKeywordOnGamer520/fetchKeywordOnGamer520.js
// ==/UserScript==
// 0.1.0: Refactored to support multiple URL patterns and keyword patterns

(function () {
    'use strict';

    /* !! -------------------------------------------------------------------------- */
    /*                               !! Configuration                                */
    /* !! -------------------------------------------------------------------------- */
    
    // Configuration for different websites and their keyword patterns
    const SITE_CONFIGS = [
        {
            urlPattern: /^https?:\/\/.*\.gamer520\.com\/.*/,
            keywordPatterns: [
                {
                    regex: /解压密码\s*[:：]\s*([^\s\n]+)/g,
                    captureGroup: 1, // which group in the regex to extract
                },
                // Add more keyword patterns for this site here if needed
                // {
                //     regex: /密码\s*[:：]\s*([^\s\n]+)/g,
                //     captureGroup: 1,
                // },
            ],
            buttonText: '提取解压密码',
        },
        {
            urlPattern: /^https?:\/\/.*\.xxxxx520\.cam\/.*/,
            keywordPatterns: [
                {
                    regex: /解压密码\s*[:：]\s*([^\s\n]+)/g,
                    captureGroup: 1,
                },
            ],
            buttonText: '提取解压密码',
        },
        // Add more site configurations here
    ];

    // Button position configuration
    const BUTTON_CONFIG = {
        position: 'fixed',
        top: '20px',
        left: '1000px',
        zIndex: '9999',
    };

    /* !! -------------------------------------------------------------------------- */
    /*                               !! Main Logic                                   */
    /* !! -------------------------------------------------------------------------- */

    // Get current site configuration based on URL
    function getCurrentSiteConfig() {
        const currentUrl = window.location.href;
        return SITE_CONFIGS.find(config => config.urlPattern.test(currentUrl));
    }

    // Extract matching content from page based on keyword patterns
    function extractMatchingContent(keywordPatterns) {
        if (!keywordPatterns || keywordPatterns.length === 0) {
            return [];
        }

        const matchingContents = [];

        // Extract matching content from text nodes
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            const node = walker.currentNode;
            const text = node.textContent.trim();
            
            // Try each keyword pattern
            keywordPatterns.forEach(({ regex, captureGroup }) => {
                // Reset regex lastIndex for global patterns
                regex.lastIndex = 0;
                
                let match;
                while ((match = regex.exec(text)) !== null) {
                    const capturedText = match[captureGroup];
                    if (capturedText) {
                        matchingContents.push(capturedText.trim());
                    }
                }
            });
        }

        // Also check in full body text
        const allText = document.body.innerText || document.body.textContent || '';
        keywordPatterns.forEach(({ regex, captureGroup }) => {
            // Reset regex lastIndex for global patterns
            regex.lastIndex = 0;
            
            let match;
            while ((match = regex.exec(allText)) !== null) {
                const capturedText = match[captureGroup];
                if (capturedText) {
                    matchingContents.push(capturedText.trim());
                }
            }
        });

        // Remove duplicates and return
        return [...new Set(matchingContents)];
    }

    // Show tip message that disappears after 3 seconds
    function showTip(message, isSuccess = true) {
        // Remove existing tip if any
        const existingTip = document.getElementById('extractContentTip');
        if (existingTip) {
            existingTip.remove();
        }

        // Create tip element
        const tip = document.createElement('div');
        tip.id = 'extractContentTip';
        tip.textContent = message;
        tip.style.position = 'fixed';
        tip.style.top = '50%';
        tip.style.left = '50%';
        tip.style.transform = 'translate(-50%, -50%)';
        tip.style.zIndex = '10000';
        tip.style.padding = '20px 30px';
        tip.style.borderRadius = '8px';
        tip.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        tip.style.fontFamily = 'Arial, sans-serif';
        tip.style.fontSize = '16px';
        tip.style.fontWeight = 'bold';
        tip.style.textAlign = 'center';
        tip.style.minWidth = '200px';
        tip.style.maxWidth = '500px';
        tip.style.wordWrap = 'break-word';
        tip.style.whiteSpace = 'pre-line';
        tip.style.transition = 'opacity 0.3s ease';

        // Set background and text color based on success/failure
        if (isSuccess) {
            tip.style.backgroundColor = '#4caf50';
            tip.style.color = '#fff';
        } else {
            tip.style.backgroundColor = '#f44336';
            tip.style.color = '#fff';
        }

        // Add tip to page
        document.body.appendChild(tip);

        // Remove tip after 3 seconds with fade out effect
        setTimeout(() => {
            tip.style.opacity = '0';
            setTimeout(() => {
                if (tip.parentNode) {
                    tip.remove();
                }
            }, 300);
        }, 3000);
    }

    // Initialize the script
    function init() {
        // Get configuration for current site
        const siteConfig = getCurrentSiteConfig();
        
        if (!siteConfig) {
            console.log('No configuration found for current URL:', window.location.href);
            return;
        }

        // Create extract button
        var button = document.createElement('button');
        button.innerHTML = siteConfig.buttonText;
        button.style.position = BUTTON_CONFIG.position;
        button.style.top = BUTTON_CONFIG.top;
        button.style.left = BUTTON_CONFIG.left;
        button.style.zIndex = BUTTON_CONFIG.zIndex;
        button.style.padding = '10px 16px';
        button.style.borderRadius = '25px';
        button.style.border = 'none';
        button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        button.style.backgroundColor = '#007bff';
        button.style.color = '#fff';
        button.style.fontFamily = 'Arial, sans-serif';
        button.style.fontSize = '14px';
        button.style.fontWeight = 'bold';
        button.style.cursor = 'pointer';
        button.style.transition = 'all 0.3s ease';

        // Button hover effect
        button.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#0056b3';
            this.style.transform = 'translateY(-2px)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '#007bff';
            this.style.transform = 'translateY(0)';
        });

        // Extract button click event
        button.addEventListener('click', function () {
            var matchingContents = extractMatchingContent(siteConfig.keywordPatterns);
            
            if (matchingContents.length === 0) {
                showTip('没找到', false);
            } else {
                // Show all found content, separated by comma
                const contentText = matchingContents.join(', ');
                
                // Copy content to clipboard
                navigator.clipboard.writeText(contentText).then(function() {
                    showTip(`已找到以下匹配内容; 内容已复制到剪切板:\n${contentText}`, true);
                }).catch(function(err) {
                    // Fallback if clipboard API fails
                    console.error('Failed to copy to clipboard:', err);
                    showTip(`已找到以下匹配内容; 复制到剪切板失败:\n${contentText}`, false);
                });
            }
        });

        // Add button to page
        document.body.appendChild(button);
    }

    // Run initialization
    init();
})();

