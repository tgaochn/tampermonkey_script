module.exports = {
    shouldRunScript: function (inclusionPatterns, exclusionPatterns, url) {
        // Check if the URL matches any inclusion pattern
        if (inclusionPatterns.length > 0 && !inclusionPatterns.some(pattern => pattern.test(url))) {
            return false;
        }

        // Check if the URL matches any exclusion pattern
        if (exclusionPatterns.length > 0 && exclusionPatterns.some(pattern => pattern.test(url))) {
            return false;
        }

        // Default behavior for other pages
        return true;
    },

    createButtonContainer: function (document) {
        const container = document.createElement('div');
        container.style.display = 'inline-block';
        container.style.marginTop = '10px';
        container.style.marginLeft = '10px';
        return container;
    },



};