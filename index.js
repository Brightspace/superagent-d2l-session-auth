'use strict';

var superagent = require('superagent');

var accessTokenExpiresAt = 0,
	oauth2Enabled = true,
	originRe = /^(http:\/\/|https:\/\/)[^\/]+/i;

function now() {
	return Date.now()/1000 | 0;
}

// node.js's URL.parse can do this, but adds ~20Kb
function tryGetOrigin(url) {
	var match = originRe.exec(url);
	return (match !== null) ? match[0] : null;
}

function getCsrfTokenKey(url) {
	var tokenKey = 'XSRF.Token';
	var origin = tryGetOrigin(url);
	if(origin === null) {
		return tokenKey;
	}
	tokenKey += '@' + origin.toLowerCase();
	return tokenKey;
}

function getRefreshCookieUrl(url) {
	var origin = tryGetOrigin(url) || '';
	return origin + '/d2l/lp/auth/oauth2/refreshcookie';
}

function addHeaders(req) {
	var tokenKey = getCsrfTokenKey(req.url);
	req.set('X-Csrf-Token', localStorage[tokenKey]);
	req.set('X-D2L-App-Id', 'deprecated');
	return req;
}

function processRefreshResponse(err, res) {
	// Prior to OAuth 2 support the refreshcookie route returns 404.
	if(res.status == 404) {
		disableOAuth2();
		return;
	}

	// In the future we should log an error
	if(err || !res.ok) {
		return;
	}

	var cacheControl = res.headers['cache-control'];
	if(!cacheControl) {
		return;
	}

	var directives = cacheControl.split(',');
	var len = directives.length;
	for(var i=0; i<len; i++) {
		if (directives[i].indexOf('max-age') == -1) {
			continue;
		}

		var maxAge = +directives[i].split('=')[1];
		setAccessTokenExpiry(now() + maxAge);
		break;
	}

}

module.exports = function(req) {

	// This plugin only works for origins which have a CSRF token. It will be
	// a no-op otherwise.
	var csrfTokenKey = getCsrfTokenKey(req.url);
	if(!localStorage[csrfTokenKey]) {
		return req;
	}

	req.use(addHeaders);

	if(!isOAuth2Enabled()) {
		return req;
	}

	var oldEnd = req.end;
	req.end = function(cb) {
		function finish() {
			req.end = oldEnd;
			return req.end(cb);
		}
		if(now() < accessTokenExpiry()) {
			return finish();
		}
		superagent
			.post(getRefreshCookieUrl(req.url))
			.use(addHeaders)
			.end(function(err, res) {
				processRefreshResponse(err, res);
				finish();
			});
		return this;
	};

	return req;

};

module.exports._accessTokenExpiry = accessTokenExpiry;
module.exports._setAccessTokenExpiry = setAccessTokenExpiry;
module.exports._enableOAuth2 = enableOAuth2;
module.exports._disableOAuth2 = disableOAuth2;
module.exports._isOAuth2Enabled = isOAuth2Enabled;
module.exports._tryGetOrigin = tryGetOrigin;
module.exports._getCsrfTokenKey = getCsrfTokenKey;

function enableOAuth2() {
	oauth2Enabled = true;
}

function disableOAuth2() {
	oauth2Enabled = false;
}

function isOAuth2Enabled() {
	return oauth2Enabled;
}

function accessTokenExpiry() {
	return accessTokenExpiresAt;
}

function setAccessTokenExpiry(val) {
	accessTokenExpiresAt = val;
}
