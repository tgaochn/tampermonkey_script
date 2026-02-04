// text2url_patterns.js
// version: 0.1.1
// Shared text-to-URL conversion patterns for tampermonkey scripts
// 0.1.1: add new url pattern for latest MTM models (preapply_online, postapply_online, LLM, LLM_relevance)
// 0.1.0: initial version - extracted from JiraTicketAddBtn.js and model_text2link.js

(function () {
    "use strict";

    // Define text2url patterns and their corresponding URL templates
    const text2urlPatterns = [
        // RJQ tickets
        {
            regex: /^RJQ-[0-9]{1,6}$/gi,
            urlTemplate: "https://indeed.atlassian.net/browse/$1",
        },

        // ! single/multiple target hp/serp models
        // pre-apply/post-apply UDS: preapply_serp_row_6e1f741/postapply_hp_us_4a8ab91
        // pre-apply/post-apply MTM: preapply_hp_row_6e1f741/postapply_hp_us_4a8ab91
        // MTM: applyperseen_rj_hp_jp_52684ee / ctr_rj_sjhp_jp_a3683b0 / applyperseen_mobweb_rotw_a3683b0 / applyperseen_and_ctr_rj_hp_jp_15339e0
        // bidding: ac-per-click_rj_hp_us_5a303d3 / apply_rj_hp_us_fbed164 / ac-per-click_sjmobweb_rotw_60306c6 / apply_sjmobweb_rotw_e60cca4
        // post-apply: qualifiedapply_mob_global_6156574 / qualified_mob_global_e9b72c9
        // glassdoor model: gd_sjmobweb_rotw_3c86644
        // default MTM: multi_rj_hp_us_15339e0
        // others: dislike_rj_hp_us_b734f31
        {
            regex: /^((gd_)?((sjmobweb)|(applyperseen)|(ctr)|(applyperseen_and_ctr)|(dislike)|(apply)|(ac-per-click)|(qualifiedapply)|(qualified)|(multi)|(preapply)|(postapply))_(((rj_sjhp)|(rj_hp)|(mobweb)|(mob)|(sjmobweb)|(hp)|(serp))_)?((us)|(rot?w)|(jp)|(global))_[a-zA-Z0-9]{7})$/g,
            urlTemplate: "https://butterfly.sandbox.indeed.net/model/$1/PUBLISHED/config",
        },

        // ! Latest MTM models
        // preapply_online_us
        {
            regex: /^(((preapply_online)|(postapply_online)|(LLM)|(LLM_relevance))_((us)|(rot?w)|(jp)|(global))_[a-zA-Z0-9]{7})$/g,
            urlTemplate: "https://butterfly.sandbox.indeed.net/model/$1/PUBLISHED/config",
        },        

        // ! I2A models: elephant-multi-en-all_en-4e18057
        {
            regex: /^(elephant-multi-en-all_en-[a-zA-Z0-9]{7})$/g,
            urlTemplate: "https://butterfly.sandbox.indeed.net/model/$1/PUBLISHED/config",
        },
    ];

    // Export to window for use in other scripts
    window.text2urlPatterns = text2urlPatterns;

    // Also support CommonJS-like exports if needed
    if (typeof module !== "undefined" && module.exports) {
        module.exports = text2urlPatterns;
    }
})();

