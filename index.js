'use strict';

global.D2LAccessTokenExpiresAt = 0;
global.D2LOAuth2Disabled = false;

function now() {
	return Date.now()/1000 | 0;
}

function addHeaders(req) {
	req.set('X-Csrf-Token', localStorage['XSRF.Token']);
	req.set('X-D2L-App-Id', 'deprecated');
	return req;
}

function processRefreshResponse(err, res) {
	// Prior to OAuth 2 support the refreshcookie route returns 404.
	if(res.status == 404) {
		global.D2LOAuth2Disabled = true;
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
		global.D2LAccessTokenExpiresAt = now() + maxAge;
		break;
	}

}

module.exports = function(superagent) {
	return function(req) {

		// This plugin only works for relative URLs. Sending XSRF tokens to foreign
		// origins would be bad. This plugin is a no-op in those cases.
		if(req.url[0] != '/') {
			console.log(
				'Warning: using superagent-d2l-session-auth for non-relative URLs will ' +
				'fall back to vanilla superagent. Either use a relative URL (if possible)' +
				' or don\'t use this plugin for cross-origin requests.');
			return req;
		}

		req.use(addHeaders);

		if(global.D2LOAuth2Disabled) {
			return req;
		}

		var oldEnd = req.end;
		req.end = function(cb) {
			function finish() {
				req.end = oldEnd;
				return req.end(cb);
			}
			if(now() < global.D2LAccessTokenExpiresAt) {
				return finish();
			}
			superagent
				.post('/d2l/lp/auth/oauth2/refreshcookie')
				.use(addHeaders)
				.end(function(err, res) {
					processRefreshResponse(err, res);
					finish();
				});
			return this;
		};

		return req;

	};
};
