// ==UserScript==
// @name         iDash_default_prec_diff
// @namespace    iDash_default_prec_diff
// @version      0.0.1
// @description  自动开启iDash的precDiff
// @author       gtfish
// @include      *://idash.sandbox.indeed.net/queryshare/?query=*
// @updateURL       https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/iDash_default_prec_diff/iDash_default_prec_diff.js
// @downloadURL     https://raw.githubusercontent.com/tgaochn/tampermonkey_script/master/_work/iDash_default_prec_diff/iDash_default_prec_diff.js

// ==/UserScript==

// https://idash.sandbox.indeed.net/queryshare/?query=FROM%20rjpFeed(rjpgrp%20%3D~%20%27.*%3Aidxbutterflyapplymodeltst629%27)%202024-02-27%202024-03-13%20AS%20ctrl%2C%0A%20%20%20%20%20rjpFeed(rjpgrp%20%3D~%20%27.*%3Aidxbutterflyapplymodeltst630%27)%20AS%20test1%2C%0A%20%20%20%20%20rjpFeed(rjpgrp%20%3D~%20%27.*%3Aidxbutterflyapplymodeltst631%27)%20AS%20test2%0AWHERE%20%20surfaceId%20in%20(%27hp%27%2C%20%27hpd%27)%20country%3D%27us%27%0AGROUP%20BY%20DATASET()%0ASELECT%0ACOUNT()%2C%0Aoji%2Bsji%2C%20%0Aoji%2Fsji%2C%0Abelowthresholdremovednum%2C%20%0Aoj_threshold_filter_num_filtered%2C%0Asj_threshold_filter_jobs_filtered%0A&engine=IQL2&name=query1&author=virtee&limit=5%2C000&hasElaborations=true&hasPercentDiff=true&listOfParameters=%7B%7D&ddUid=14105fb2-c651-4794-8b4f-5b8186678b86&fromInsightUid=idashblank_653646d8-5a4e-40d5-afdf-4f1a4da0bd9a

(function () {
    'use strict';

    const urlObj = new URL(window.location.href);
    urlObj.searchParams.set("hasPercentDiff", "true");
    // url = urlObj.toString();
    window.location.href = urlObj.toString();

    // // Check if the current URL is the specific AWS console URL
    // if (window.location.href === "https://us-east-1.console.aws.amazon.com/console/home?region=us-east-1#" || window.location.href === "https://us-east-1.console.aws.amazon.com/console/home?region=us-east-1") {

    //     // window.location.href = "https://us-east-2.console.aws.amazon.com/console/home?region=us-east-2#"; // redirect to region2 console
    //     window.location.href = "https://us-east-2.console.aws.amazon.com/console/home?region=us-east-2#"; // redirect to region2 athena
    // }
})();