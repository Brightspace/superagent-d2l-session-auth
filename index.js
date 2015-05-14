'use strict';

var superagent = require('superagent');

global.D2LAccessTokenExpiresAt = 0;

function now() {
	return Date.now()/1000 | 0;
}

function addHeaders(req) {
	req.set('X-Csrf-Token', localStorage['XSRF.Token']);
	req.set('X-D2L-App-Id', 'deprecated');
}

function processRefreshResponse(err, res, cb) {
	if (err || !res.ok) {
		// In the future we should log an error
		return cb();
	}

	var cacheControl = res.headers['cache-control'];
	if (!cacheControl) {
		return cb();
	}

	var directives = cacheControl.split(',');
	var len = directives.length;
	for (var i = 0; i < len; i++) {
		if (directives[i].indexOf('max-age') == -1) {
			continue;
		}

		var maxAge = +directives[i].split('=')[1];
		global.D2LAccessTokenExpiresAt = now() + maxAge;
		break;
	}

	return cb();
}

function refreshCookie(cb) {
	var req = superagent
		.post('/d2l/lp/auth/oauth2/refreshcookie');

	addHeaders(req);

	req.end(function(err, res) {
		processRefreshResponse(err, res, cb);
	});
}

function preflight(req, oldEnd) {
	return function(cb) {
		function finish() {
			req.end = oldEnd;
			return req.end(cb);
		}
		if(now() < global.D2LAccessTokenExpiresAt) {
			return finish();
		}
		refreshCookie(finish);
		return this;
	};
}

module.exports = function(req) {
	// This plugin only works for relative URLs. Sending XSRF tokens to foreign
	// origins would be bad. This plugin is a no-op in those cases.
	if (req.url[0] != '/') {
		console.log(
			'Warning: using superagent-d2l-session-auth for non-relative URLs will ' +
			'fall back to vanilla superagent. Either use a relative URL (if possible)' +
			' or don\'t use this plugin for cross-origin requests.');
		return req;
	}

	addHeaders(req);

	var oldEnd = req.end;
	req.end = preflight(req, oldEnd);

	return req;
};
