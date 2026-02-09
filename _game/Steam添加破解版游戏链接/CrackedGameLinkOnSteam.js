// ==UserScript==
// @name Steam 添加破解版游戏链接
// @description Adds buttons to Steam pages that searches for them on SkidrowReloaded, gamer520, IGG-Games, or x1337x on a new tab.
// @version 0.5.9
// @license MIT
// @grant       GM_getValue
// @grant       GM_setValue
// @match https://store.steampowered.com/app/*
// @updateURL       https://github.com/tgaochn/tampermonkey_script/raw/refs/heads/master/_game/Steam%E6%B7%BB%E5%8A%A0%E7%A0%B4%E8%A7%A3%E7%89%88%E6%B8%B8%E6%88%8F%E9%93%BE%E6%8E%A5/CrackedGameLinkOnSteam.js
// @downloadURL     https://github.com/tgaochn/tampermonkey_script/raw/refs/heads/master/_game/Steam%E6%B7%BB%E5%8A%A0%E7%A0%B4%E8%A7%A3%E7%89%88%E6%B8%B8%E6%88%8F%E9%93%BE%E6%8E%A5/CrackedGameLinkOnSteam.js
// ==/UserScript==

// changelog:
// 0.5.9: Mapping dialogs add "填入中文名" and "填入英文名" quick-fill buttons
// 0.5.8: Bilibili button uses mapping if exists, else Chinese name (same as gamer520)
// 0.5.6: Fix workshop button to use actualsort=lastupdated&browsesort=lastupdated&p=1 for latest mods
// 0.5.5: Move button container to after #game_highlights > div.leftcol > div for better positioning at the top of game info area
// 0.5.4: Change insertion point to game_area_purchase_game_wrapper for consistent positioning; use fixed position as fallback; left-align buttons within rows
// 0.5.3: Organize buttons into three rows - row 1: game downloads, row 2: mod sites, row 3: video/trainer sites
// 0.5.2: Organize buttons into two rows - first row has 4 game download site buttons, second row has mod and video site buttons
// 0.5.1: Center-align buttons in the container for better visual appearance
// 0.5.0: Major refactor - create independent button container and insert before franchise_notice to avoid Steam's dynamic button sizing affecting our buttons
// 0.4.5: Fix button size and positioning by using inline styles instead of CSS classes to avoid affecting Steam's native buttons
// 0.4.4: Fix button size issue by adding custom CSS styles to maintain consistent button dimensions
// 0.4.3: Add middle-click (mouse wheel button) support for all buttons
// 0.4.2: Replace blocking alert() with non-blocking toast notification (auto-dismiss after 3 seconds)
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
    "use strict";

    const appid = (window.location.pathname.match(/\/app\/(\d+)/) ?? [null, null])[1];
    if (appid === null) {
        return;
    }

    // Helper function to apply consistent inline styles to custom buttons
    function applyButtonStyles(button) {
        button.style.display = "inline-block";
        button.style.padding = "1px 15px";
        button.style.fontSize = "15px";
        button.style.lineHeight = "30px";
        button.style.height = "32px";
        button.style.verticalAlign = "middle";
        button.style.textDecoration = "none";
        button.style.color = "#D2E885";
        button.style.borderRadius = "2px";
        button.style.cursor = "pointer";
        button.style.whiteSpace = "nowrap";
        button.style.border = "none";
        button.style.boxSizing = "border-box";

        // Add hover effect
        button.addEventListener("mouseenter", function () {
            this.style.color = "#fff";
        });
        button.addEventListener("mouseleave", function () {
            this.style.color = "#D2E885";
        });
    }

    // NexusMods mapping storage functions using GM_getValue/GM_setValue for cross-device sync
    function getNexusModsMapping() {
        const stored = GM_getValue("nexusmods_mapping", "{}");
        return JSON.parse(stored);
    }

    function saveNexusModsMapping(mapping) {
        GM_setValue("nexusmods_mapping", JSON.stringify(mapping));
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
        const stored = GM_getValue("bilibili_mapping", "{}");
        return JSON.parse(stored);
    }

    function saveBilibiliMapping(mapping) {
        GM_setValue("bilibili_mapping", JSON.stringify(mapping));
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

    // Function to show toast notification (non-blocking, auto-dismiss after 3 seconds)
    function showToast(message) {
        const toast = document.createElement("div");
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            z-index: 10001;
            font-family: Arial, sans-serif;
            font-size: 14px;
            max-width: 350px;
            animation: slideIn 0.3s ease-out;
        `;
        toast.textContent = message;

        // Add slide-in animation
        const style = document.createElement("style");
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(toast);

        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            toast.style.animation = "slideOut 0.3s ease-out";
            setTimeout(() => {
                if (toast.parentNode) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    // Generic mapping input dialog with fill buttons for Chinese/English names
    function showMappingInputDialog(config) {
        const { title, placeholder, onSubmit, onSuccessMessage, onUpdateButton } = config;

        const dialog = document.createElement("div");
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
            min-width: 400px;
        `;

        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = placeholder;
        input.style.cssText = `
            width: 100%;
            padding: 10px;
            font-size: 14px;
            margin: 10px 0;
            box-sizing: border-box;
        `;

        const fillBtnStyle = `
            background: #6c757d;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            margin-right: 8px;
            font-size: 13px;
        `;
        const fillBtnDisabledStyle = "opacity: 0.5; cursor: not-allowed;";

        const btnChinese = document.createElement("button");
        btnChinese.textContent = "填入中文名";
        btnChinese.style.cssText = fillBtnStyle + (gameNameChinese ? "" : " " + fillBtnDisabledStyle);
        btnChinese.disabled = !gameNameChinese;
        btnChinese.onclick = () => {
            if (gameNameChinese) input.value = gameNameChinese;
        };

        const btnEnglish = document.createElement("button");
        btnEnglish.textContent = "填入英文名";
        btnEnglish.style.cssText = fillBtnStyle + (gameNameEnglish ? "" : " " + fillBtnDisabledStyle);
        btnEnglish.disabled = !gameNameEnglish;
        btnEnglish.onclick = () => {
            if (gameNameEnglish) input.value = gameNameEnglish;
        };

        const confirmBtn = document.createElement("button");
        confirmBtn.textContent = "确认";
        confirmBtn.style.cssText = `
            background: #28a745;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin-right: 10px;
        `;

        const cancelBtn = document.createElement("button");
        cancelBtn.textContent = "取消";
        cancelBtn.style.cssText = `
            background: #6c757d;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
        `;

        const closeDialog = () => document.body.removeChild(dialog);

        confirmBtn.onclick = () => {
            const value = input.value.trim();
            if (value) {
                onSubmit(value);
                showToast(onSuccessMessage);
                onUpdateButton();
                closeDialog();
            }
        };

        cancelBtn.onclick = closeDialog;

        dialog.innerHTML = `<h3 style="margin-top: 0; color: #333;">${title}</h3>`;
        dialog.appendChild(input);
        const fillRow = document.createElement("div");
        fillRow.style.marginBottom = "10px";
        fillRow.appendChild(btnChinese);
        fillRow.appendChild(btnEnglish);
        dialog.appendChild(fillRow);
        const btnRow = document.createElement("div");
        btnRow.style.marginTop = "15px";
        btnRow.appendChild(confirmBtn);
        btnRow.appendChild(cancelBtn);
        dialog.appendChild(btnRow);

        document.body.appendChild(dialog);
        input.focus();
    }

    // Function to show mapping input dialog for NexusMods
    function showMappingDialog() {
        showMappingInputDialog({
            title: "请输入NexusMods上的游戏名称用于直接访问",
            placeholder: "例如: hollowknightsilksong",
            onSubmit: (value) => addNexusModsMapping(appid, value),
            onSuccessMessage: "映射已添加！现在可以点击nexusmods按钮直接访问该游戏的mod页面。",
            onUpdateButton: updateAddMappingButton
        });
    }

    // Function to show bilibili mapping input dialog
    function showBilibiliMappingDialog() {
        showMappingInputDialog({
            title: "请输入B站搜索用的中文游戏名称",
            placeholder: "例如: 空洞骑士丝之歌",
            onSubmit: (value) => addBilibiliMapping(appid, value),
            onSuccessMessage: "B站映射已添加！现在可以点击B站按钮使用中文名称搜索。",
            onUpdateButton: updateAddBilibiliMappingButton
        });
    }

    // Generic function to show mapping verification dialog with clickable URL
    function showMappingVerificationDialog(config) {
        const { title, nameLabel, nameValue, urlLabel, url, clearButtonId, closeButtonId, onClear } = config;

        // Create custom dialog
        const dialog = document.createElement("div");
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
        dialog.addEventListener("click", function (e) {
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
            title: "NexusMods 映射信息",
            nameLabel: "游戏名称",
            nameValue: nexusGameName,
            urlLabel: "完整URL",
            url: fullUrl,
            clearButtonId: "clearMapping",
            closeButtonId: "closeDialog",
            onClear: () => {
                removeNexusModsMapping(appid);
                updateAddMappingButton();
            },
        });
    }

    // Function to show bilibili mapping verification dialog
    function showBilibiliMappingVerificationDialog(bilibiliGameName) {
        const searchUrl = `https://search.bilibili.com/all?keyword=${encodeURIComponent(bilibiliGameName)}`;

        showMappingVerificationDialog({
            title: "B站搜索映射信息",
            nameLabel: "搜索名称",
            nameValue: bilibiliGameName,
            urlLabel: "搜索URL",
            url: searchUrl,
            clearButtonId: "clearBilibiliMapping",
            closeButtonId: "closeBilibiliDialog",
            onClear: () => {
                removeBilibiliMapping(appid);
                updateAddBilibiliMappingButton();
            },
        });
    }

    // Function to update add mapping button state dynamically
    function updateAddMappingButton() {
        if (!addMappingButton) return;

        const mapping = getNexusModsMapping();
        const nexusGameName = mapping[appid];

        // Remove old event listeners by cloning the button
        const newButton = addMappingButton.cloneNode(true);
        addMappingButton.parentNode.replaceChild(newButton, addMappingButton);
        addMappingButton = newButton;

        if (nexusGameName) {
            // Mapping exists - show as disabled/gray with clear option
            addMappingButton.innerHTML = "<span>✓ nexusmods</span>";
            addMappingButton.style.backgroundColor = "#666666";
            addMappingButton.style.cursor = "default";
            const showDialog = function () {
                showNexusModsMappingVerificationDialog(nexusGameName);
            };
            addMappingButton.onclick = showDialog;
            // Add middle-click support
            addMappingButton.addEventListener("mousedown", function (e) {
                if (e.button === 1) {
                    // Middle mouse button
                    e.preventDefault();
                    showDialog();
                }
            });
        } else {
            // No mapping - show as active
            addMappingButton.innerHTML = "<span>+ nexusmods</span>";
            addMappingButton.style.backgroundColor = "#902600";
            const showDialog = function () {
                showMappingDialog();
            };
            addMappingButton.onclick = showDialog;
            // Add middle-click support
            addMappingButton.addEventListener("mousedown", function (e) {
                if (e.button === 1) {
                    // Middle mouse button
                    e.preventDefault();
                    showDialog();
                }
            });
        }
    }

    // Function to update add bilibili mapping button state dynamically
    function updateAddBilibiliMappingButton() {
        if (!addBilibiliMappingButton) return;

        const mapping = getBilibiliMapping();
        const bilibiliGameName = mapping[appid];

        // Remove old event listeners by cloning the button
        const newButton = addBilibiliMappingButton.cloneNode(true);
        addBilibiliMappingButton.parentNode.replaceChild(newButton, addBilibiliMappingButton);
        addBilibiliMappingButton = newButton;

        if (bilibiliGameName) {
            // Mapping exists - show as disabled/gray with clear option
            addBilibiliMappingButton.innerHTML = "<span>✓ B站</span>";
            addBilibiliMappingButton.style.backgroundColor = "#666666";
            addBilibiliMappingButton.style.cursor = "default";
            const showDialog = function () {
                showBilibiliMappingVerificationDialog(bilibiliGameName);
            };
            addBilibiliMappingButton.onclick = showDialog;
            // Add middle-click support
            addBilibiliMappingButton.addEventListener("mousedown", function (e) {
                if (e.button === 1) {
                    // Middle mouse button
                    e.preventDefault();
                    showDialog();
                }
            });
        } else {
            // No mapping - show as active
            addBilibiliMappingButton.innerHTML = "<span>+ B站</span>";
            addBilibiliMappingButton.style.backgroundColor = "#6f4e37";
            const showDialog = function () {
                showBilibiliMappingDialog();
            };
            addBilibiliMappingButton.onclick = showDialog;
            // Add middle-click support
            addBilibiliMappingButton.addEventListener("mousedown", function (e) {
                if (e.button === 1) {
                    // Middle mouse button
                    e.preventDefault();
                    showDialog();
                }
            });
        }
    }

    // Create workshop button (doesn't need game name)
    var buttonWorkshop = document.createElement("a");
    buttonWorkshop.innerHTML = "<span>mods - workshop</span>";
    buttonWorkshop.style.backgroundColor = "#902600";
    applyButtonStyles(buttonWorkshop);
    buttonWorkshop.onclick = function () {
        const workshopUrl = `https://steamcommunity.com/workshop/browse/?appid=${appid}&actualsort=lastupdated&browsesort=lastupdated&p=1`;
        window.open(workshopUrl);
    };
    // Add middle-click support
    buttonWorkshop.addEventListener("mousedown", function (e) {
        if (e.button === 1) {
            // Middle mouse button
            e.preventDefault();
            const workshopUrl = `https://steamcommunity.com/workshop/browse/?appid=${appid}&actualsort=lastupdated&browsesort=lastupdated&p=1`;
            window.open(workshopUrl);
        }
    });

    // Array to store all buttons in desired order
    var allButtons = [];

    // Global reference to add mapping button for dynamic updates
    var addMappingButton = null;
    var addBilibiliMappingButton = null;

    // Game names from Steam API, used by mapping dialogs
    var gameNameEnglish = null;
    var gameNameChinese = null;

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
                gameNameEnglish = modifiedGameName.replace(/\+/g, " ");

                // Create all buttons
                var buttonSkidrow = createButton(
                    "SkidrowReloaded",
                    "#007037",
                    "https://www.skidrowreloaded.com/?s=" + encodeURIComponent(gameName)
                );

                var buttonIGG = createButton(
                    "IGG",
                    "#3B3B3B",
                    "https://igg-games.com/?s=" + encodeURIComponent(modifiedGameName).replace(/%2B/g, "+")
                );

                var buttonTorrent = createButton(
                    "x1337x",
                    "#3B3B3B",
                    "https://x1337x.ws/srch?search=" + encodeURIComponent(gameName)
                );

                // Create nexusmods button with mapping logic
                var buttonNexusmods = createNexusModsButton(modifiedGameName);

                // Bilibili button: use English as fallback when Chinese fetch fails, replaced in second fetch
                var bilibili = createBilibiliButton(modifiedGameName);

                var FLiNG = createButton(
                    "风灵月影",
                    "#6f4e37",
                    "https://flingtrainer.com/?s=" + encodeURIComponent(modifiedGameName).replace(/%2B/g, "+")
                );

                // Create add mapping button with dynamic state
                var buttonAddMapping = createAddMappingButton();
                addMappingButton = buttonAddMapping; // Store reference for dynamic updates

                // Create add bilibili mapping button with dynamic state
                var buttonAddBilibiliMapping = createAddBilibiliMappingButton();
                addBilibiliMappingButton = buttonAddBilibiliMapping; // Store reference for dynamic updates

                // Store buttons in the desired order (bilibili replaced with Chinese name in second fetch)
                allButtons = [
                    buttonSkidrow, // 2. SkidrowReloaded
                    buttonIGG, // 3. IGG
                    buttonTorrent, // 4. x1337x

                    buttonWorkshop, // 5. Workshop
                    buttonNexusmods, // 6. NexusMods
                    buttonAddMapping, // 6.5. Add NexusMods Mapping

                    bilibili, // 7. Bilibili (English fallback, replaced with Chinese in second fetch)
                    buttonAddBilibiliMapping, // 7.5. Add Bilibili Mapping
                    FLiNG, // 8. FLiNG
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
                gameNameChinese = modifiedGameName.replace(/\+/g, " ");

                // Create gamer520 button (uses Chinese name)
                var button520 = createButton(
                    "gamer520",
                    "#007037",
                    "https://www.gamer520.com/?s=" + encodeURIComponent(modifiedGameName).replace(/%2B/g, "+")
                );

                // Replace bilibili button with one using Chinese name (same as gamer520)
                allButtons[6] = createBilibiliButton(modifiedGameName);

                // Insert gamer520 at the desired position (before SkidrowReloaded)
                allButtons.splice(0, 0, button520);

                // Now add all buttons in order
                addButtonsInOrder();
            }
        })
        .catch((error) => {
            console.error("Error fetching game details:", error);
            // If there was an error, still add the buttons we have
            addButtonsInOrder();
        });

    // Helper function to create nexusmods button with mapping logic
    function createNexusModsButton(modifiedGameName) {
        var button = document.createElement("a");
        button.innerHTML = "<span>mods - nexusmods</span>";
        button.style.backgroundColor = "#902600";
        applyButtonStyles(button);

        const openNexusModsLink = function () {
            const mapping = getNexusModsMapping();
            const nexusGameName = mapping[appid];

            if (nexusGameName) {
                // Direct link to nexusmods game page
                window.open(`https://www.nexusmods.com/games/${nexusGameName}/mods?sort=updatedAt`);
            } else {
                // Fallback to Google search
                window.open(
                    "https://www.google.com/search?q=nexusmods+mods+download+" +
                        encodeURIComponent(modifiedGameName).replace(/%2B/g, "+")
                );
            }
        };

        button.onclick = openNexusModsLink;
        // Add middle-click support
        button.addEventListener("mousedown", function (e) {
            if (e.button === 1) {
                // Middle mouse button
                e.preventDefault();
                openNexusModsLink();
            }
        });
        return button;
    }

    // Helper function to create bilibili button with mapping logic
    // searchKeyword: Chinese name (same as gamer520), used when no mapping exists
    function createBilibiliButton(searchKeyword) {
        var button = document.createElement("a");
        button.innerHTML = "<span>B站</span>";
        button.style.backgroundColor = "#6f4e37";
        applyButtonStyles(button);

        const openBilibiliLink = function () {
            const mapping = getBilibiliMapping();
            const bilibiliGameName = mapping[appid];

            if (bilibiliGameName) {
                // Use mapped name from buttonAddBilibiliMapping
                window.open("https://search.bilibili.com/all?keyword=" + encodeURIComponent(bilibiliGameName));
            } else {
                // Fallback to Chinese name search (same as gamer520)
                window.open(
                    "https://search.bilibili.com/all?keyword=" +
                        encodeURIComponent(searchKeyword).replace(/%2B/g, "+")
                );
            }
        };

        button.onclick = openBilibiliLink;
        // Add middle-click support
        button.addEventListener("mousedown", function (e) {
            if (e.button === 1) {
                // Middle mouse button
                e.preventDefault();
                openBilibiliLink();
            }
        });
        return button;
    }

    // Helper function to create add mapping button with dynamic state
    function createAddMappingButton() {
        var button = document.createElement("a");
        applyButtonStyles(button);

        // Check if mapping already exists
        const mapping = getNexusModsMapping();
        const nexusGameName = mapping[appid];

        if (nexusGameName) {
            // Mapping exists - show as disabled/gray with clear option
            button.innerHTML = "<span>✓ nexusmods</span>";
            button.style.backgroundColor = "#666666";
            button.style.cursor = "default";
            const showDialog = function () {
                showNexusModsMappingVerificationDialog(nexusGameName);
            };
            button.onclick = showDialog;
            // Add middle-click support
            button.addEventListener("mousedown", function (e) {
                if (e.button === 1) {
                    // Middle mouse button
                    e.preventDefault();
                    showDialog();
                }
            });
        } else {
            // No mapping - show as active
            button.innerHTML = "<span>+ nexusmods</span>";
            button.style.backgroundColor = "#902600";
            const showDialog = function () {
                showMappingDialog();
            };
            button.onclick = showDialog;
            // Add middle-click support
            button.addEventListener("mousedown", function (e) {
                if (e.button === 1) {
                    // Middle mouse button
                    e.preventDefault();
                    showDialog();
                }
            });
        }

        return button;
    }

    // Helper function to create add bilibili mapping button with dynamic state
    function createAddBilibiliMappingButton() {
        var button = document.createElement("a");
        applyButtonStyles(button);

        // Check if mapping already exists
        const mapping = getBilibiliMapping();
        const bilibiliGameName = mapping[appid];

        if (bilibiliGameName) {
            // Mapping exists - show as disabled/gray with clear option
            button.innerHTML = "<span>✓ B站中文名</span>";
            button.style.backgroundColor = "#666666";
            button.style.cursor = "default";
            const showDialog = function () {
                showBilibiliMappingVerificationDialog(bilibiliGameName);
            };
            button.onclick = showDialog;
            // Add middle-click support
            button.addEventListener("mousedown", function (e) {
                if (e.button === 1) {
                    // Middle mouse button
                    e.preventDefault();
                    showDialog();
                }
            });
        } else {
            // No mapping - show as active
            button.innerHTML = "<span>+ B站中文名</span>";
            button.style.backgroundColor = "#6f4e37";
            const showDialog = function () {
                showBilibiliMappingDialog();
            };
            button.onclick = showDialog;
            // Add middle-click support
            button.addEventListener("mousedown", function (e) {
                if (e.button === 1) {
                    // Middle mouse button
                    e.preventDefault();
                    showDialog();
                }
            });
        }

        return button;
    }

    // Helper function to create buttons
    function createButton(text, color, url) {
        var button = document.createElement("a");
        button.innerHTML = "<span>" + text + "</span>";
        button.style.backgroundColor = color;
        applyButtonStyles(button);
        button.onclick = function () {
            window.open(url);
        };
        // Add middle-click support
        button.addEventListener("mousedown", function (e) {
            if (e.button === 1) {
                // Middle mouse button
                e.preventDefault();
                window.open(url);
            }
        });
        return button;
    }

    // Helper function to add all buttons in order
    function addButtonsInOrder() {
        // Create a container for all custom buttons
        const buttonContainer = document.createElement("div");
        buttonContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin: 16px 0;
            padding: 16px;
            background: linear-gradient(to bottom, rgba(42,71,94,0.6) 5%, rgba(42,71,94,0.2) 95%);
            border-radius: 4px;
            box-shadow: 0 0 5px rgba(154, 124, 124, 0.5);
        `;

        // Create first row (game download sites: gamer520, SkidrowReloaded, IGG, x1337x)
        const row1 = document.createElement("div");
        row1.style.cssText = `
            display: flex;
            justify-content: flex-start;
            gap: 4px;
            flex-wrap: wrap;
        `;

        // Create second row (mod related: workshop, nexusmods, + nexusmods)
        const row2 = document.createElement("div");
        row2.style.cssText = `
            display: flex;
            justify-content: flex-start;
            gap: 4px;
            flex-wrap: wrap;
        `;

        // Create third row (remaining: B站, + B站中文名, 风灵月影)
        const row3 = document.createElement("div");
        row3.style.cssText = `
            display: flex;
            justify-content: flex-start;
            gap: 4px;
            flex-wrap: wrap;
        `;

        // Add buttons to respective rows
        for (var i = 0; i < allButtons.length; i++) {
            allButtons[i].style.marginLeft = "0"; // Reset margin since we're using gap
            if (i < 4) {
                // First 4 buttons: game download sites
                row1.appendChild(allButtons[i]);
            } else if (i < 7) {
                // Next 3 buttons: mod related
                row2.appendChild(allButtons[i]);
            } else {
                // Remaining buttons: video and trainer sites
                row3.appendChild(allButtons[i]);
            }
        }

        // Add rows to container
        buttonContainer.appendChild(row1);
        buttonContainer.appendChild(row2);
        buttonContainer.appendChild(row3);

        // Try to insert after #game_highlights > div.leftcol > div
        let insertTarget = document.querySelector("#game_highlights > div.leftcol > div");

        if (insertTarget && insertTarget.parentNode) {
            // Insert after the target element
            if (insertTarget.nextSibling) {
                insertTarget.parentNode.insertBefore(buttonContainer, insertTarget.nextSibling);
            } else {
                insertTarget.parentNode.appendChild(buttonContainer);
            }
        } else {
            // Fallback: use fixed position at top of viewport
            console.warn("#game_highlights > div.leftcol > div not found, using fixed position");
            buttonContainer.style.position = "fixed";
            buttonContainer.style.top = "80px"; // Below Steam header
            buttonContainer.style.left = "50%";
            buttonContainer.style.transform = "translateX(-50%)";
            buttonContainer.style.zIndex = "9999";
            buttonContainer.style.maxWidth = "90%";
            buttonContainer.style.width = "auto";
            document.body.appendChild(buttonContainer);
        }
    }
})();
