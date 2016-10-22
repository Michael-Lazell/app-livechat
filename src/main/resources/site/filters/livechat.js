var portal = require('/lib/xp/portal'),
    cacheLib = require('/lib/xp/cache'),
    httpClient = require('/lib/xp/http-client');

var cache = cacheLib.newCache({
    size: 1
});

exports.responseFilter = function (req, res) {

    if(req.mode == 'edit') {
        return res;
    }

    if(req.params.nocache) {
        cache.clear();
    }

    var siteConfig = portal.getSiteConfig() || {};
    var email = siteConfig.email || null;

    if(!email) {
        return res;
    }

    var license = cache.get(email, function() {

        log.info('New LiveChat email cached or the cache was cleared.');

        var response = httpClient.request({
            url: 'https://api.livechatinc.com/licence/operator/' + email,
            method: 'GET',
            connectionTimeout: 5000,
            readTimeout: 5000,
            contentType: 'application/json'
        });

        var data;

        try {
            data = JSON.parse(response.body);
        } catch (e) {
            log.error('LiveChat service error.');
        }

        if (!data || data.error) {
            data = {};
        }
        // Cannot return null
        return data.number || '';
    });

    if(!license) {
        return res;
    }

    var code = "<!-- Start of LiveChat (www.livechatinc.com) code -->" +
               "<script type='text/javascript'>" +
               "window.__lc = window.__lc || {};" +
               "window.__lc.license = " + license + ";" +
               "(function() {" +
                 "var lc = document.createElement('script'); lc.type = 'text/javascript'; lc.async = true;" +
                 "lc.src = ('https:' == document.location.protocol ? 'https://' : 'http://') + 'cdn.livechatinc.com/tracking.js';" +
                 "var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(lc, s);" +
               "})();" +
               "</script>" +
               "<!-- End of LiveChat code -->";

    var bodyEnd = res.pageContributions.bodyEnd;

    if(!bodyEnd) {
        res.pageContributions.bodyEnd = [];
    } else if(typeof bodyEnd == 'string') {
        res.pageContributions.bodyEnd = [ bodyEnd ];
    }
    res.pageContributions.bodyEnd.push(code);

    return res;
};