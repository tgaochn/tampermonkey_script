// ==UserScript==
// @name         磁力链接提取器
// @namespace    http://tampermonkey.net/
// @version      0.4.3
// @description  提取该网页的所有磁力链接
// @match        http*://www.w3schools.com/*
// @match        http*://nutbread.github.io/t2m/*
// @match        http*://www.javbus.com/*
// @match        http*://www.hacg.icu/*
// @grant        none
// @license      GPL-3.0 License
// @updateURL       https://github.com/tgaochn/tampermonkey_script/raw/refs/heads/master/_common/%E6%8F%90%E5%8F%96%E7%A3%81%E5%8A%9B%E9%93%BE/GetMagnetLinks.js
// @downloadURL     https://github.com/tgaochn/tampermonkey_script/raw/refs/heads/master/_common/%E6%8F%90%E5%8F%96%E7%A3%81%E5%8A%9B%E9%93%BE/GetMagnetLinks.js
// ==/UserScript==
// 0.4.0: 添加了对ed2k链接的支持

// forked from:
// https://greasyfork.org/scripts/461157-%E7%A3%81%E5%8A%9B%E9%93%BE%E6%8E%A5%E6%8F%90%E5%8F%96%E5%99%A8/code/%E7%A3%81%E5%8A%9B%E9%93%BE%E6%8E%A5%E6%8F%90%E5%8F%96%E5%99%A8.user.js

// test the script in:
// https://www.w3schools.com/html/tryit.asp?filename=tryhtml_links_w3schools
// magnet:?xt=urn:btih:43d9faa3365df9b286d4c14c23b2e83a5e763f07&XXX
// magnet:?xt=urn:btih:NN7VYFLE2EDDM5YUYWVFAZNGSL3DPQ7H&dn=%5Bb

(function () {
    'use strict';

    // Extract magnet links and display them in a popup window
    function extractMagnetLinks() {
        const magnetLinks = new Set(); // Use Set to avoid duplicates
        
        // More comprehensive regex patterns
        const magnetRegex = /magnet:\?[^\s<>"']+/gi;
        const ed2kRegex = /ed2k:\/\/[^\s<>"']+/gi;
        const hashRegex = /\b[a-fA-F0-9]{32,40}\b/g; // Support 32-40 character hashes
        
        // Extract links from href attributes
        const extractFromLinks = () => {
            const linkElements = document.querySelectorAll('a[href]');
            linkElements.forEach(linkElement => {
                const href = linkElement.href;
                if (href.startsWith('magnet:') || href.startsWith('ed2k:')) {
                    magnetLinks.add(href);
                }
            });
        };

        // Extract from all text content using regex
        const extractFromText = (rootElement = document) => {
            // Get all text content including scripts, styles, etc.
            const allText = rootElement.documentElement ? 
                rootElement.documentElement.outerHTML : 
                rootElement.outerHTML || rootElement.textContent;
            
            // Extract magnet links
            const magnetMatches = allText.match(magnetRegex) || [];
            magnetMatches.forEach(match => magnetLinks.add(match));
            
            // Extract ed2k links
            const ed2kMatches = allText.match(ed2kRegex) || [];
            ed2kMatches.forEach(match => magnetLinks.add(match));
        };

        // Extract from text nodes using TreeWalker
        const extractFromTextNodes = (rootElement = document.body) => {
            if (!rootElement) return;
            
            const walker = document.createTreeWalker(
                rootElement, 
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            while (walker.nextNode()) {
                const node = walker.currentNode;
                const text = node.textContent.trim();
                
                // Check for standalone hashes (32-40 characters)
                const hashMatches = text.match(hashRegex) || [];
                hashMatches.forEach(hash => {
                    // Verify it's likely a torrent hash (alphanumeric)
                    if (/^[a-fA-F0-9]+$/.test(hash)) {
                        const magnetLink = `magnet:?xt=urn:btih:${hash}`;
                        magnetLinks.add(magnetLink);
                    }
                });
                
                // Check for magnet/ed2k links in text
                const magnetMatches = text.match(magnetRegex) || [];
                magnetMatches.forEach(match => magnetLinks.add(match));
                
                const ed2kMatches = text.match(ed2kRegex) || [];
                ed2kMatches.forEach(match => magnetLinks.add(match));
            }
        };

        // Extract from input values and data attributes
        const extractFromInputsAndData = () => {
            const inputs = document.querySelectorAll('input[value*="magnet:"], input[value*="ed2k:"]');
            inputs.forEach(input => {
                if (input.value.startsWith('magnet:') || input.value.startsWith('ed2k:')) {
                    magnetLinks.add(input.value);
                }
            });
            
            // Check data attributes
            const elementsWithData = document.querySelectorAll('[data-magnet], [data-hash], [data-torrent]');
            elementsWithData.forEach(element => {
                Object.values(element.dataset).forEach(value => {
                    if (typeof value === 'string') {
                        if (value.startsWith('magnet:') || value.startsWith('ed2k:')) {
                            magnetLinks.add(value);
                        } else if (/^[a-fA-F0-9]{32,40}$/.test(value)) {
                            magnetLinks.add(`magnet:?xt=urn:btih:${value}`);
                        }
                    }
                });
            });
        };

        // Extract from iframes
        const extractFromIframes = () => {
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                try {
                    if (iframe.contentDocument) {
                        extractFromText(iframe.contentDocument);
                        extractFromTextNodes(iframe.contentDocument.body);
                    }
                } catch (e) {
                    // Cross-origin iframe, skip
                    console.log('Cannot access iframe content due to cross-origin policy');
                }
            });
        };

        // Execute all extraction methods
        extractFromLinks();
        extractFromText();
        extractFromTextNodes(document.body);
        extractFromTextNodes(document.head); // Also check head
        extractFromInputsAndData();
        extractFromIframes();

        // Filter and clean results
        const filteredLinks = Array.from(magnetLinks).filter(link => {
            return link.length >= 10 && 
                   !link.endsWith(':btih:') && 
                   (link.startsWith('magnet:') || link.startsWith('ed2k:'));
        });

        return filteredLinks;
    }

    // Wait for dynamic content to load
    function waitForContent(callback, maxWait = 5000) {
        let waited = 0;
        const interval = 500;
        
        const checkContent = () => {
            const links = extractMagnetLinks();
            if (links.length > 0 || waited >= maxWait) {
                callback(links);
                return;
            }
            
            waited += interval;
            setTimeout(checkContent, interval);
        };
        
        // Initial check
        setTimeout(checkContent, 100);
    }

    function displayMagnetLinks(magnetLinks) {
        var popup = window.open('', 'magnetLinksPopup', 'width=800,height=600,scrollbars=yes,resizable=yes');
        var popupDoc = popup.document
        popupDoc.write('<html><head><title>磁力链接列表</title>');
        popupDoc.write('<style>body {font-family: Arial, sans-serif; font-size: 14px; margin: 0; padding: 20px;}');
        popupDoc.write('h1 {font-size: 24px; margin: 0 0 20px; padding: 0;}');
        popupDoc.write('ul {margin: 0; padding: 0;}');
        popupDoc.write('li {list-style-type: none; margin: 0 0 10px; padding: 0;}');
        popupDoc.write('a {text-decoration: none; color: #333; font-weight: bold;}');
        popupDoc.write('a:hover {color: #007bff;}</style>');
        popupDoc.write('</head><body>');
        // popupDoc.write('<h1>磁力链接列表</h1>');
        popupDoc.write('<ul>');

        magnetLinks.forEach(function (link) {
            popupDoc.write('<li><a href="' + link + '">' + link + '</a></li>');
        });
        popupDoc.write('<br/>');
        popupDoc.write('</ul>');
        popupDoc.write('</body></html>');

        // 选择全部文本, 写入剪切板
        var range = popupDoc.createRange();
        range.selectNodeContents(popupDoc.body);
        var selection = popup.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        navigator.clipboard.writeText(popupDoc.body.innerText);

        popupDoc.close();
    }

    // Create extract button
    var button = document.createElement('button');
    button.innerHTML = '提取磁力链接';
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.zIndex = '9999';
    button.style.padding = '12px 16px';
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

    // Extract magnet links button click event
    button.addEventListener('click', function () {
        button.innerHTML = '提取中...';
        button.disabled = true;
        
        waitForContent(function(magnetLinks) {
            button.innerHTML = '提取磁力链接';
            button.disabled = false;
            
            if (magnetLinks.length === 0) {
                alert('未找到磁力链接');
                return;
            }
            
            displayMagnetLinks(magnetLinks);
        });
    });

    // Add button to page
    document.body.appendChild(button);
})();