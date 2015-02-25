'use strict';

module.exports = function(req) {
	req.set('X-Csrf-Token', localStorage['XSRF.Token']);
	req.set('X-D2L-App-Id', 'deprecated');
	return req;
};
