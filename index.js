'use strict';

var getJwt = require('frau-jwt'),
	superagent = require('superagent'),
	xsrf = require('frau-superagent-xsrf-token');

function noop () {}

function isRelative/*ly safe*/ (url) {
	return typeof url === 'string'
		&& url.length > 0
		&& url[0] === '/';
}

module.exports = function (req) {
	req = req.use(xsrf);
	req.set('X-D2L-App-Id', 'deprecated');

	var end = req.end;
	req.end = function (cb) {
		function finish () {
			req.end = end;
			req.end(cb);
		}

		if (!isRelative(req.url)) {
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
