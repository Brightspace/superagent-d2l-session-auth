'use strict';

var getJwt = require('frau-jwt'),
	superagent = require('superagent'),
	url = require('url'),
	xsrf = require('frau-superagent-xsrf-token');

function noop () {}

function isRelative/*ly safe*/ (url) {
	return url.hostname === null;
}

function endsWith (haystack, needle) {
	var expectedPosition = haystack.length - needle.length;
	var lastIndex = haystack.indexOf(needle, expectedPosition);
	var result = lastIndex !== -1 && lastIndex === expectedPosition;
	return result;
}

function isBrightspaceApi (url) {
	return url.protocol === 'https:'
		&& (url.hostname === 'api.brightspace.com'
			|| endsWith(url.hostname, '.api.brightspace.com')
		);
}

function isTrustedHost (url, trustedHost) {
	return typeof trustedHost === 'string'
		&& url.host === trustedHost;
}

function isTrusted (urlstr, trustedHost) {
	if (typeof urlstr !== 'string'
		|| urlstr.length === 0
	) {
		return false;
	}

	var parsed = url.parse(urlstr);

	return isRelative(parsed)
		|| isBrightspaceApi(parsed)
		|| isTrustedHost(parsed, trustedHost);
}

module.exports = function (opts) {
	opts = opts || {};

	return function (req) {
		req = req.use(xsrf);
		req.set('X-D2L-App-Id', 'deprecated');

		var end = req.end;
		req.end = function (cb) {
			function finish () {
				req.end = end;
				req.end(cb);
			}

			if (!isTrusted(req.url, opts.trustedHost)) {
				finish();
				return this;
			}

			getJwt()
				.then(function (token) {
					req.set('Authorization', 'Bearer ' + token);
				})
				.catch(noop)
				.then(function () {
					// Run this async in another turn
					// So we don't catch errors with our Promise
					setTimeout(finish);
				});

			return this;
		};

		return req;
	};
};
