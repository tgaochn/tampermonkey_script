// ==UserScript==
// @name CrackedGameLinkOnSteam
// @description Adds buttons to Steam pages that searches for them on SkidrowReloaded, gamer520, IGG-Games, or x1337x on a new tab.
// @version 0.3.0
// @license MIT
// @match https://store.steampowered.com/app/*
// @updateURL       https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/CrackedGameLinkOnSteam/CrackedGameLinkOnSteam.js
// @downloadURL     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/CrackedGameLinkOnSteam/CrackedGameLinkOnSteam.js
// ==/UserScript==

// forked from "Steam Search For SkidrowReloaded, IGG-Games, and x1337x."
// added gamer520
// improved the way to fetch game name
// add workshop/nexusmods link

(function () {
    'use strict';

    const appid = (window.location.pathname.match(/\/app\/(\d+)/) ?? [null, null])[1];
    if (appid === null) { return; }

    // Create a new button element for workshop
    var buttonWorkshop = document.createElement("a");
    buttonWorkshop.className = "btnv6_blue_hoverfade btn_medium";
    buttonWorkshop.style.marginLeft = "2px";
    buttonWorkshop.innerHTML = '<span>mods - workshop</span>';
    buttonWorkshop.style.backgroundColor = "#902600";
    buttonWorkshop.onclick = function () {
        window.open("https://steamcommunity.com/workshop/browse/?appid=" + (appid));
    };

    //Find the ignore button and insert the new buttons near it
    var ignoreButton = document.querySelector("#ignoreBtn");
    if (ignoreButton) {
        ignoreButton.parentNode.insertBefore(buttonWorkshop, ignoreButton.nextSibling);
    }

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

                // Modified game name for IGG-Games
                var modifiedGameName = gameName.replace(/_/g, "+");

                // Create a new button element for SkidrowReloaded
                var buttonSkidrow = document.createElement("a");
                buttonSkidrow.className = "btnv6_blue_hoverfade btn_medium";
                buttonSkidrow.style.marginLeft = "2px";
                buttonSkidrow.innerHTML = '<span>SkidrowReloaded</span>';
                buttonSkidrow.style.backgroundColor = "#007037";

                buttonSkidrow.onclick = function () {
                    window.open("https://www.skidrowreloaded.com/?s=" + encodeURIComponent(gameName));
                };

                // Create a new button element for IGG-Games
                var buttonIGG = document.createElement("a");
                buttonIGG.className = "btnv6_blue_hoverfade btn_medium";
                buttonIGG.style.marginLeft = "2px";
                buttonIGG.innerHTML = '<span>IGG</span>';
                buttonIGG.style.backgroundColor = "#3B3B3B";

                buttonIGG.onclick = function () {
                    window.open("https://igg-games.com/?s=" + encodeURIComponent(modifiedGameName).replace(/%2B/g, "+"));
                };

                // Create a new button element for x1337x
                var buttonTorrent = document.createElement("a");
                buttonTorrent.className = "btnv6_blue_hoverfade btn_medium";
                buttonTorrent.style.marginLeft = "2px";
                buttonTorrent.innerHTML = '<span>x1337x</span>';
                buttonTorrent.style.backgroundColor = "#3B3B3B";

                buttonTorrent.onclick = function () {
                    window.open("https://x1337x.ws/srch?search=" + encodeURIComponent(gameName));
                };

                // Create a new button element for nexusmods
                var buttonNexusmods = document.createElement("a");
                buttonNexusmods.className = "btnv6_blue_hoverfade btn_medium";
                buttonNexusmods.style.marginLeft = "2px";
                buttonNexusmods.innerHTML = '<span>mods - nexusmods</span>';
                buttonNexusmods.style.backgroundColor = "#902600";
                buttonNexusmods.onclick = function () {
                    window.open("https://www.google.com/search?q=nexusmods+" + encodeURIComponent(modifiedGameName).replace(/%2B/g, "+"));
                };

                //Find the ignore button and insert the new buttons near it
                // var ignoreButton = document.querySelector("#ignoreBtn");
                if (ignoreButton) {
                    ignoreButton.parentNode.insertBefore(buttonSkidrow, ignoreButton.nextSibling);
                    ignoreButton.parentNode.insertBefore(buttonIGG, buttonSkidrow.nextSibling);
                    ignoreButton.parentNode.insertBefore(buttonTorrent, buttonIGG.nextSibling);
                    ignoreButton.parentNode.insertBefore(buttonNexusmods, buttonTorrent.nextSibling);
                }
            }
        })

        fetch(`https://store.steampowered.com/api/appdetails?appids=${appid}&l=chinese`)
        .then(async (response) => {
            if (response.ok) {
                // load game name in Chinese from steampowered
                const json = await response.json();
                const data = json[appid];
                var gameName;
                if (data.success !== true) {
                    // Get the game name from the URL after /app/number/
                    gameName = window.location.pathname.split("/")[3];
                } else {
                    gameName = data.data.name;
                }

                // Modified game name for IGG-Games
                var modifiedGameName = gameName.replace(/_/g, "+");

                // Create a new button element for gamer520
                var button520 = document.createElement("a");
                button520.className = "btnv6_blue_hoverfade btn_medium";
                button520.style.marginLeft = "2px";
                button520.innerHTML = '<span>gamer520</span>';
                button520.style.backgroundColor = "#007037";

                button520.onclick = function () {
                    window.open("https://www.gamer520.com/?s=" + encodeURIComponent(modifiedGameName).replace(/%2B/g, "+"));
                };

                //Find the ignore button and insert the new buttons near it
                // var ignoreButton = document.querySelector("#ignoreBtn");
                if (ignoreButton) {
                    ignoreButton.parentNode.insertBefore(button520, ignoreButton.nextSibling);
                }
            }
        })        
})();
