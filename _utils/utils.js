function shouldRunScript(inclusionPatterns, exclusionPatterns) {
    const url = window.location.href;

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
}