// ==UserScript==
// @name         AWS S3 Path Redirector
// @namespace    aws_s3_path_redirector
// @version      0.2.0
// @description  Convert S3 path to AWS S3 Console URL and redirect
// @author       gtfish
// @match        https://us-east-2.console.aws.amazon.com/*
// @match        https://*.console.aws.amazon.com/*
// @grant        none
// @require      https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_utils/utils.js
// @updateURL    https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/aws_s3_path_redirector/aws_s3_path_redirector.js
// @downloadURL  https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/aws_s3_path_redirector/aws_s3_path_redirector.js

// ==/UserScript==
// 0.2.0: add button position config, add Copy URL button in dialog
// 0.1.0: initial version, convert S3 path to AWS S3 Console URL and redirect

(function () {
    "use strict";

    // Configuration constants
    const CONFIG = {
        UTILS_TIMEOUT: 10000,
        AWS_REGION: "us-east-2", // Default AWS region
        AWS_S3_CONSOLE_BASE_URL: "https://us-east-2.console.aws.amazon.com/s3/buckets",
        BUTTON_POSITION: {
            top: "20px",
            right: "20px",
        },
    };

    // Parse S3 path and extract bucket and prefix
    function parseS3Path(s3Path) {
        // Remove leading/trailing whitespace
        const trimmedPath = s3Path.trim();

        // Check if it's a valid S3 path
        if (!trimmedPath.startsWith("s3://")) {
            return null;
        }

        // Remove s3:// prefix
        const pathWithoutPrefix = trimmedPath.substring(5);

        // Split into bucket and path parts
        const firstSlashIndex = pathWithoutPrefix.indexOf("/");
        if (firstSlashIndex === -1) {
            // Only bucket name, no path
            return {
                bucket: pathWithoutPrefix,
                prefix: "",
            };
        }

        const bucket = pathWithoutPrefix.substring(0, firstSlashIndex);
        let prefix = pathWithoutPrefix.substring(firstSlashIndex + 1);

        // If it's a file (has a filename, not ending with /), get the parent directory
        // Check if it ends with a filename (not ending with /)
        if (prefix && !prefix.endsWith("/")) {
            // Extract directory path (remove filename)
            const lastSlashIndex = prefix.lastIndexOf("/");
            if (lastSlashIndex !== -1) {
                // Remove filename, get the directory containing the file
                prefix = prefix.substring(0, lastSlashIndex + 1);
                // Remove the last directory level (parent directory)
                // e.g., "a/b/c/" -> "a/b/"
                const secondLastSlashIndex = prefix.substring(0, prefix.length - 1).lastIndexOf("/");
                if (secondLastSlashIndex !== -1) {
                    prefix = prefix.substring(0, secondLastSlashIndex + 1);
                } else {
                    // Only one directory level, set to empty (root)
                    prefix = "";
                }
            } else {
                // No directory, just a file in the root
                prefix = "";
            }
        }

        // Ensure prefix ends with / if it's not empty
        if (prefix && !prefix.endsWith("/")) {
            prefix += "/";
        }

        return {
            bucket,
            prefix,
        };
    }

    // Build AWS S3 Console URL
    function buildS3ConsoleUrl(bucket, prefix, region = CONFIG.AWS_REGION) {
        const baseUrl = `https://${region}.console.aws.amazon.com/s3/buckets/${bucket}`;
        const params = new URLSearchParams({
            region: region,
        });

        if (prefix) {
            params.append("prefix", prefix);
        }

        return `${baseUrl}?${params.toString()}`;
    }

    // Create input dialog for S3 path
    function createS3PathDialog() {
        return new Promise((resolve) => {
            // Create modal container
            const modal = document.createElement("div");
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            `;

            // Create dialog box
            const dialog = document.createElement("div");
            dialog.style.cssText = `
                background: white;
                padding: 20px;
                border-radius: 8px;
                width: 600px;
                max-width: 90%;
            `;

            // Add title
            const titleElement = document.createElement("h3");
            titleElement.textContent = "AWS S3 Path Redirector";
            titleElement.style.marginBottom = "15px";

            // Add description
            const descElement = document.createElement("p");
            descElement.textContent = "Enter S3 path (e.g., s3://bucket-name/path/to/file)";
            descElement.style.marginBottom = "15px";
            descElement.style.color = "#666";
            descElement.style.fontSize = "14px";

            // Add input field
            const input = document.createElement("input");
            input.type = "text";
            input.placeholder = "s3://bucket-name/path/to/file";
            input.style.cssText = `
                width: 100%;
                padding: 8px;
                margin-bottom: 15px;
                border: 1px solid #ccc;
                border-radius: 4px;
                font-family: monospace;
                font-size: 14px;
                box-sizing: border-box;
            `;

            // Add error message area
            const errorMsg = document.createElement("div");
            errorMsg.style.cssText = `
                color: red;
                font-size: 12px;
                margin-bottom: 15px;
                min-height: 20px;
                display: none;
            `;

            // Add buttons
            const buttonContainer = document.createElement("div");
            buttonContainer.style.cssText = `
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            `;

            // Helper function to validate and parse S3 path
            function validateAndParseS3Path() {
                const s3Path = input.value.trim();
                if (!s3Path) {
                    errorMsg.textContent = "Please enter an S3 path";
                    errorMsg.style.display = "block";
                    return null;
                }

                const parsed = parseS3Path(s3Path);
                if (!parsed) {
                    errorMsg.textContent = "Invalid S3 path format. Expected format: s3://bucket-name/path";
                    errorMsg.style.display = "block";
                    return null;
                }

                errorMsg.style.display = "none";
                return buildS3ConsoleUrl(parsed.bucket, parsed.prefix);
            }

            // Redirect button
            const redirectButton = document.createElement("button");
            redirectButton.textContent = "Redirect";
            redirectButton.style.cssText = `
                padding: 8px 16px;
                background: #009688;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            `;

            redirectButton.onclick = () => {
                const url = validateAndParseS3Path();
                if (url) {
                    modal.remove();
                    window.location.href = url;
                    resolve(url);
                }
            };

            // Copy URL button
            const copyUrlButton = document.createElement("button");
            copyUrlButton.textContent = "Copy URL";
            copyUrlButton.style.cssText = `
                padding: 8px 16px;
                background: #2196F3;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            `;

            copyUrlButton.onclick = async () => {
                const url = validateAndParseS3Path();
                if (url) {
                    try {
                        await navigator.clipboard.writeText(url);
                        // Show success feedback
                        const originalText = copyUrlButton.textContent;
                        copyUrlButton.textContent = "Copied!";
                        copyUrlButton.style.background = "#4CAF50";
                        setTimeout(() => {
                            copyUrlButton.textContent = originalText;
                            copyUrlButton.style.background = "#2196F3";
                        }, 2000);
                    } catch (err) {
                        console.error("Failed to copy URL:", err);
                        errorMsg.textContent = "Failed to copy URL to clipboard";
                        errorMsg.style.display = "block";
                    }
                }
            };

            const cancelButton = document.createElement("button");
            cancelButton.textContent = "Cancel";
            cancelButton.style.cssText = `
                padding: 8px 16px;
                background: #e0e0e0;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            `;

            function handleCancel() {
                modal.remove();
                resolve(null);
            }

            // Handle Enter key - default to redirect
            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    redirectButton.click();
                }
            });

            cancelButton.onclick = handleCancel;

            // Close on background click
            modal.onclick = (e) => {
                if (e.target === modal) {
                    handleCancel();
                }
            };

            // Assemble and show dialog
            buttonContainer.appendChild(cancelButton);
            buttonContainer.appendChild(copyUrlButton);
            buttonContainer.appendChild(redirectButton);
            dialog.appendChild(titleElement);
            dialog.appendChild(descElement);
            dialog.appendChild(input);
            dialog.appendChild(errorMsg);
            dialog.appendChild(buttonContainer);
            modal.appendChild(dialog);
            document.body.appendChild(modal);

            // Focus input field
            input.focus();
        });
    }

    // Wait for utils to load (if needed)
    function waitForUtils(timeout = CONFIG.UTILS_TIMEOUT) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            function checkUtils() {
                if (window.utils) {
                    resolve(window.utils);
                } else if (Date.now() - startTime >= timeout) {
                    // Utils not required for this script, just resolve
                    resolve(null);
                } else {
                    setTimeout(checkUtils, 100);
                }
            }

            checkUtils();
        });
    }

    // Create floating button to trigger dialog
    function createFloatingButton() {
        const button = document.createElement("button");
        button.textContent = "Parse S3 Path";
        button.id = "aws-s3-path-redirector-btn";
        button.style.cssText = `
            position: fixed;
            top: ${CONFIG.BUTTON_POSITION.top};
            right: ${CONFIG.BUTTON_POSITION.right};
            z-index: 9999;
            padding: 10px 16px;
            background: #009688;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        `;

        button.addEventListener("mouseenter", () => {
            button.style.background = "#00796b";
        });

        button.addEventListener("mouseleave", () => {
            button.style.background = "#009688";
        });

        button.onclick = () => {
            createS3PathDialog();
        };

        return button;
    }

    // Initialize script
    async function initScript() {
        try {
            await waitForUtils();
            // Add floating button to page
            const button = createFloatingButton();
            document.body.appendChild(button);
        } catch (error) {
            console.error("Failed to initialize:", error);
        }
    }

    // Run script when DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initScript);
    } else {
        initScript();
    }
})();

