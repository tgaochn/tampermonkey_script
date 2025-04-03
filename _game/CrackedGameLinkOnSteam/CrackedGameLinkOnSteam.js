// ==UserScript==
// @name CrackedGameLinkOnSteam
// @description Adds buttons to Steam pages that searches for them on SkidrowReloaded, gamer520, IGG-Games, or x1337x on a new tab.
// @version 0.3.5
// @license MIT
// @match https://store.steampowered.com/app/*
// @updateURL       https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/CrackedGameLinkOnSteam/CrackedGameLinkOnSteam.js
// @downloadURL     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/CrackedGameLinkOnSteam/CrackedGameLinkOnSteam.js
// ==/UserScript==

// changelog:
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
                
                var buttonNexusmods = createButton("mods - nexusmods", "#902600", 
                    "https://www.google.com/search?q=nexusmods+mods+download+" + encodeURIComponent(modifiedGameName).replace(/%2B/g, "+"));
                
                var bilibili = createButton("B站", "#6f4e37", 
                    "https://search.bilibili.com/all?keyword=" + encodeURIComponent(modifiedGameName).replace(/%2B/g, "+"));
                
                var FLiNG = createButton("风灵月影", "#6f4e37", 
                    "https://flingtrainer.com/?s=" + encodeURIComponent(modifiedGameName).replace(/%2B/g, "+"));
                
                // Store buttons in the desired order
                allButtons = [
                    buttonSkidrow,       // 2. SkidrowReloaded
                    buttonIGG,           // 3. IGG
                    buttonTorrent,       // 4. x1337x

                    buttonWorkshop,      // 5. Workshop
                    buttonNexusmods,     // 6. NexusMods 
                    
                    bilibili,            // 7. Bilibili
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