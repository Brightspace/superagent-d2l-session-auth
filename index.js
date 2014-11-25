'use strict';

define(function() {
	return function(appId) {
		return function(request) {
			request.set('X-Csrf-Token', localStorage['XSRF.Token']);
			request.set('X-D2L-App-Id', appId);
			return request;
		}
	}
});
