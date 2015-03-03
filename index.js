'use strict';

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

	req.set('X-Csrf-Token', localStorage['XSRF.Token']);
	req.set('X-D2L-App-Id', 'deprecated');
	return req;
};
