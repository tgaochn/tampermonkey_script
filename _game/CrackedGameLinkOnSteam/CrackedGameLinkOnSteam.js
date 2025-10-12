// ==UserScript==
// @name CrackedGameLinkOnSteam
// @description Adds buttons to Steam pages that searches for them on SkidrowReloaded, gamer520, IGG-Games, or x1337x on a new tab.
// @version 0.4.1
// @license MIT
// @grant       GM_getValue
// @grant       GM_setValue
// @match https://store.steampowered.com/app/*
// @updateURL       https://raw.githubusercontent.com/tgaochn/tampermonkey_script/refs/heads/master/_game/CrackedGameLinkOnSteam/CrackedGameLinkOnSteam.js
// @downloadURL     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/refs/heads/master/_game/CrackedGameLinkOnSteam/CrackedGameLinkOnSteam.js
// ==/UserScript==

// changelog:
// 0.4.1: Add bilibili mapping functionality with external storage
// 0.4.0: Add nexusmods mapping functionality with external storage
// 0.3.5: 固定按钮顺序
// 0.3.4: update searching keyword for 风灵月影 
// 0.3.3: update searching keyword for bilibili 
// 0.3.2: update searching keyword in google for nexusmods 

// forked from "Steam Search For SkidrowReloaded, IGG-Games, and x1337x."
// added gamer520
// improved the way to fetch game name
// add workshop/nexusmods link

(function () {
    'use strict';

    const appid = (window.location.pathname.match(/\/app\/(\d+)/) ?? [null, null])[1];
    if (appid === null) { return; }

    // Find the ignore button
    var ignoreButton = document.querySelector("#ignoreBtn");
    if (!ignoreButton) { return; }

    // NexusMods mapping storage functions using GM_getValue/GM_setValue for cross-device sync
    function getNexusModsMapping() {
        const stored = GM_getValue('nexusmods_mapping', '{}');
        return JSON.parse(stored);
    }

    function saveNexusModsMapping(mapping) {
        GM_setValue('nexusmods_mapping', JSON.stringify(mapping));
    }

    function addNexusModsMapping(steamId, nexusGameName) {
        const mapping = getNexusModsMapping();
        mapping[steamId] = nexusGameName;
        saveNexusModsMapping(mapping);
    }

    function removeNexusModsMapping(steamId) {
        const mapping = getNexusModsMapping();
        delete mapping[steamId];
        saveNexusModsMapping(mapping);
    }

    // Bilibili mapping storage functions using GM_getValue/GM_setValue for cross-device sync
    function getBilibiliMapping() {
        const stored = GM_getValue('bilibili_mapping', '{}');
        return JSON.parse(stored);
    }

    function saveBilibiliMapping(mapping) {
        GM_setValue('bilibili_mapping', JSON.stringify(mapping));
    }

    function addBilibiliMapping(steamId, bilibiliGameName) {
        const mapping = getBilibiliMapping();
        mapping[steamId] = bilibiliGameName;
        saveBilibiliMapping(mapping);
    }

    function removeBilibiliMapping(steamId) {
        const mapping = getBilibiliMapping();
        delete mapping[steamId];
        saveBilibiliMapping(mapping);
    }

    // Function to show mapping input dialog
    function showMappingDialog() {
        const nexusGameName = prompt('请输入NexusMods上的游戏名称用于直接访问 \n例如: hollowknightsilksong');
        if (nexusGameName && nexusGameName.trim()) {
            addNexusModsMapping(appid, nexusGameName.trim());
            alert('映射已添加！现在可以点击nexusmods按钮直接访问该游戏的mod页面。');
            // Update button state immediately
            updateAddMappingButton();
        }
    }

    // Function to show bilibili mapping input dialog
    function showBilibiliMappingDialog() {
        const bilibiliGameName = prompt('请输入B站搜索用的中文游戏名称 \n例如: 空洞骑士丝之歌');
        if (bilibiliGameName && bilibiliGameName.trim()) {
            addBilibiliMapping(appid, bilibiliGameName.trim());
            alert('B站映射已添加！现在可以点击B站按钮使用中文名称搜索。');
            // Update button state immediately
            updateAddBilibiliMappingButton();
        }
    }

    // Generic function to show mapping verification dialog with clickable URL
    function showMappingVerificationDialog(config) {
        const { title, nameLabel, nameValue, urlLabel, url, clearButtonId, closeButtonId, onClear } = config;
        
        // Create custom dialog
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid #333;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: Arial, sans-serif;
            max-width: 500px;
            text-align: center;
        `;
        
        dialog.innerHTML = `
            <h3 style="margin-top: 0; color: #333;">${title}</h3>
            <p style="color: #000;"><strong>${nameLabel}:</strong> ${nameValue}</p>
            <p style="color: #000;"><strong>${urlLabel}:</strong></p>
            <a href="${url}" target="_blank" style="
                color: #0066cc;
                text-decoration: underline;
                word-break: break-all;
                display: inline-block;
                max-width: 100%;
                margin: 10px 0;
            ">${url}</a>
            <p style="font-size: 12px; color: #666; margin: 15px 0;">
                点击上方链接验证映射是否正确
            </p>
            <div style="margin-top: 20px;">
                <button id="${clearButtonId}" style="
                    background: #dc3545;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-right: 10px;
                ">清除映射</button>
                <button id="${closeButtonId}" style="
                    background: #6c757d;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                ">关闭</button>
            </div>
        `;
        
        // Add event listeners using event delegation
        dialog.addEventListener('click', function(e) {
            if (e.target.id === clearButtonId) {
                onClear();
                document.body.removeChild(dialog);
            } else if (e.target.id === closeButtonId) {
                document.body.removeChild(dialog);
            }
        });
        
        // Add to page
        document.body.appendChild(dialog);
    }

    // Function to show nexusmods mapping verification dialog
    function showNexusModsMappingVerificationDialog(nexusGameName) {
        const fullUrl = `https://www.nexusmods.com/games/${nexusGameName}/mods?sort=updatedAt`;
        
        showMappingVerificationDialog({
            title: 'NexusMods 映射信息',
            nameLabel: '游戏名称',
            nameValue: nexusGameName,
            urlLabel: '完整URL',
            url: fullUrl,
            clearButtonId: 'clearMapping',
            closeButtonId: 'closeDialog',
            onClear: () => {
                removeNexusModsMapping(appid);
                updateAddMappingButton();
            }
        });
    }

    // Function to show bilibili mapping verification dialog
    function showBilibiliMappingVerificationDialog(bilibiliGameName) {
        const searchUrl = `https://search.bilibili.com/all?keyword=${encodeURIComponent(bilibiliGameName)}`;
        
        showMappingVerificationDialog({
            title: 'B站搜索映射信息',
            nameLabel: '搜索名称',
            nameValue: bilibiliGameName,
            urlLabel: '搜索URL',
            url: searchUrl,
            clearButtonId: 'clearBilibiliMapping',
            closeButtonId: 'closeBilibiliDialog',
            onClear: () => {
                removeBilibiliMapping(appid);
                updateAddBilibiliMappingButton();
            }
        });
    }

    // Function to update add mapping button state dynamically
    function updateAddMappingButton() {
        if (!addMappingButton) return;
        
        const mapping = getNexusModsMapping();
        const nexusGameName = mapping[appid];
        
        if (nexusGameName) {
            // Mapping exists - show as disabled/gray with clear option
            addMappingButton.innerHTML = '<span>✓ nexusmods</span>';
            addMappingButton.style.backgroundColor = "#666666";
            addMappingButton.style.cursor = "default";
            addMappingButton.onclick = function () {
                showNexusModsMappingVerificationDialog(nexusGameName);
            };
        } else {
            // No mapping - show as active
            addMappingButton.innerHTML = '<span>+ nexusmods</span>';
            addMappingButton.style.backgroundColor = "#902600";
            addMappingButton.onclick = function () {
                showMappingDialog();
            };
        }
    }

    // Function to update add bilibili mapping button state dynamically
    function updateAddBilibiliMappingButton() {
        if (!addBilibiliMappingButton) return;
        
        const mapping = getBilibiliMapping();
        const bilibiliGameName = mapping[appid];
        
        if (bilibiliGameName) {
            // Mapping exists - show as disabled/gray with clear option
            addBilibiliMappingButton.innerHTML = '<span>✓ B站</span>';
            addBilibiliMappingButton.style.backgroundColor = "#666666";
            addBilibiliMappingButton.style.cursor = "default";
            addBilibiliMappingButton.onclick = function () {
                showBilibiliMappingVerificationDialog(bilibiliGameName);
            };
        } else {
            // No mapping - show as active
            addBilibiliMappingButton.innerHTML = '<span>+ B站</span>';
            addBilibiliMappingButton.style.backgroundColor = "#6f4e37";
            addBilibiliMappingButton.onclick = function () {
                showBilibiliMappingDialog();
            };
        }
    }

    // Create workshop button (doesn't need game name)
    var buttonWorkshop = document.createElement("a");
    buttonWorkshop.className = "btnv6_blue_hoverfade btn_medium";
    buttonWorkshop.style.marginLeft = "2px";
    buttonWorkshop.innerHTML = '<span>mods - workshop</span>';
    buttonWorkshop.style.backgroundColor = "#902600";
    buttonWorkshop.onclick = function () {
        window.open("https://steamcommunity.com/workshop/browse/?appid=" + appid);
    };
    
    // Array to store all buttons in desired order
    var allButtons = [];
    
    // Global reference to add mapping button for dynamic updates
    var addMappingButton = null;
    var addBilibiliMappingButton = null;
    
    // This will fetch the English name and create most buttons
    fetch(`https://store.steampowered.com/api/appdetails?appids=${appid}&l=english`)
        .then(async (response) => {
            if (response.ok) {
                // load game name in English from steampowered
                const json = await response.json();
                const data = json[appid];
                var gameName;
                if (data.success !== true) {
                    // Get the game name from the URL after /app/number/
                    gameName = window.location.pathname.split("/")[3];
                } else {
                    gameName = data.data.name;
                }

                // Modified game name
                var modifiedGameName = gameName.replace(/_/g, "+");

                // Create all buttons
                var buttonSkidrow = createButton("SkidrowReloaded", "#007037", 
                    "https://www.skidrowreloaded.com/?s=" + encodeURIComponent(gameName));
                
                var buttonIGG = createButton("IGG", "#3B3B3B", 
                    "https://igg-games.com/?s=" + encodeURIComponent(modifiedGameName).replace(/%2B/g, "+"));
                
                var buttonTorrent = createButton("x1337x", "#3B3B3B", 
                    "https://x1337x.ws/srch?search=" + encodeURIComponent(gameName));
                
                // Create nexusmods button with mapping logic
                var buttonNexusmods = createNexusModsButton(modifiedGameName);
                
                var bilibili = createBilibiliButton(modifiedGameName);
                
                var FLiNG = createButton("风灵月影", "#6f4e37", 
                    "https://flingtrainer.com/?s=" + encodeURIComponent(modifiedGameName).replace(/%2B/g, "+"));

                // Create add mapping button with dynamic state
                var buttonAddMapping = createAddMappingButton();
                addMappingButton = buttonAddMapping; // Store reference for dynamic updates

                // Create add bilibili mapping button with dynamic state
                var buttonAddBilibiliMapping = createAddBilibiliMappingButton();
                addBilibiliMappingButton = buttonAddBilibiliMapping; // Store reference for dynamic updates
                
                // Store buttons in the desired order
                allButtons = [
                    buttonSkidrow,       // 2. SkidrowReloaded
                    buttonIGG,           // 3. IGG
                    buttonTorrent,       // 4. x1337x

                    buttonWorkshop,      // 5. Workshop
                    buttonNexusmods,     // 6. NexusMods 
                    buttonAddMapping,    // 6.5. Add NexusMods Mapping
                    
                    bilibili,            // 7. Bilibili
                    buttonAddBilibiliMapping, // 7.5. Add Bilibili Mapping
                    FLiNG                // 8. FLiNG
                ];
                
                // We'll wait for the second fetch before adding buttons
                return fetch(`https://store.steampowered.com/api/appdetails?appids=${appid}&l=chinese`);
            }
        })
        .then(async (response) => {
            if (response && response.ok) {
                // load game name in Chinese from steampowered
                const json = await response.json();
                const data = json[appid];
                var gameName;
                if (data.success !== true) {
                    gameName = window.location.pathname.split("/")[3];
                } else {
                    gameName = data.data.name;
                }

                var modifiedGameName = gameName.replace(/_/g, "+");

                // Create gamer520 button
                var button520 = createButton("gamer520", "#007037", 
                    "https://www.gamer520.com/?s=" + encodeURIComponent(modifiedGameName).replace(/%2B/g, "+"));
                
                // Insert gamer520 at the desired position (before SkidrowReloaded)
                allButtons.splice(0, 0, button520);
                
                // Now add all buttons in order
                addButtonsInOrder();
            }
        })
        .catch(error => {
            console.error("Error fetching game details:", error);
            // If there was an error, still add the buttons we have
            addButtonsInOrder();
        });

    // Helper function to create nexusmods button with mapping logic
    function createNexusModsButton(modifiedGameName) {
        var button = document.createElement("a");
        button.className = "btnv6_blue_hoverfade btn_medium";
        button.style.marginLeft = "2px";
        button.innerHTML = '<span>mods - nexusmods</span>';
        button.style.backgroundColor = "#902600";
        button.onclick = function () {
            const mapping = getNexusModsMapping();
            const nexusGameName = mapping[appid];
            
            if (nexusGameName) {
                // Direct link to nexusmods game page
                window.open(`https://www.nexusmods.com/games/${nexusGameName}/mods?sort=updatedAt`);
            } else {
                // Fallback to Google search
                window.open("https://www.google.com/search?q=nexusmods+mods+download+" + encodeURIComponent(modifiedGameName).replace(/%2B/g, "+"));
            }
        };
        return button;
    }

    // Helper function to create bilibili button with mapping logic
    function createBilibiliButton(modifiedGameName) {
        var button = document.createElement("a");
        button.className = "btnv6_blue_hoverfade btn_medium";
        button.style.marginLeft = "2px";
        button.innerHTML = '<span>B站</span>';
        button.style.backgroundColor = "#6f4e37";
        button.onclick = function () {
            const mapping = getBilibiliMapping();
            const bilibiliGameName = mapping[appid];
            
            if (bilibiliGameName) {
                // Use mapped Chinese name for search
                window.open("https://search.bilibili.com/all?keyword=" + encodeURIComponent(bilibiliGameName));
            } else {
                // Fallback to English name search
                window.open("https://search.bilibili.com/all?keyword=" + encodeURIComponent(modifiedGameName).replace(/%2B/g, "+"));
            }
        };
        return button;
    }

    // Helper function to create add mapping button with dynamic state
    function createAddMappingButton() {
        var button = document.createElement("a");
        button.className = "btnv6_blue_hoverfade btn_medium";
        button.style.marginLeft = "2px";
        
        // Check if mapping already exists
        const mapping = getNexusModsMapping();
        const nexusGameName = mapping[appid];
        
        if (nexusGameName) {
            // Mapping exists - show as disabled/gray with clear option
            button.innerHTML = '<span>✓ nexusmods</span>';
            button.style.backgroundColor = "#666666";
            button.style.cursor = "default";
            button.onclick = function () {
                showNexusModsMappingVerificationDialog(nexusGameName);
            };
        } else {
            // No mapping - show as active
            button.innerHTML = '<span>+ nexusmods</span>';
            button.style.backgroundColor = "#902600";
            button.onclick = function () {
                showMappingDialog();
            };
        }
        
        return button;
    }

    // Helper function to create add bilibili mapping button with dynamic state
    function createAddBilibiliMappingButton() {
        var button = document.createElement("a");
        button.className = "btnv6_blue_hoverfade btn_medium";
        button.style.marginLeft = "2px";
        
        // Check if mapping already exists
        const mapping = getBilibiliMapping();
        const bilibiliGameName = mapping[appid];
        
        if (bilibiliGameName) {
            // Mapping exists - show as disabled/gray with clear option
            button.innerHTML = '<span>✓ B站中文名</span>';
            button.style.backgroundColor = "#666666";
            button.style.cursor = "default";
            button.onclick = function () {
                showBilibiliMappingVerificationDialog(bilibiliGameName);
            };
        } else {
            // No mapping - show as active
            button.innerHTML = '<span>+ B站中文名</span>';
            button.style.backgroundColor = "#6f4e37";
            button.onclick = function () {
                showBilibiliMappingDialog();
            };
        }
        
        return button;
    }

    // Helper function to create buttons
    function createButton(text, color, url) {
        var button = document.createElement("a");
        button.className = "btnv6_blue_hoverfade btn_medium";
        button.style.marginLeft = "2px";
        button.innerHTML = '<span>' + text + '</span>';
        button.style.backgroundColor = color;
        button.onclick = function () {
            window.open(url);
        };
        return button;
    }
    
    // Helper function to add all buttons in order
    function addButtonsInOrder() {
        // Add all buttons in the specified order
        for (var i = allButtons.length - 1; i >= 0; i--) {
            ignoreButton.parentNode.insertBefore(allButtons[i], ignoreButton.nextSibling);
        }
    }
})();