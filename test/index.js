var nock = require('nock'),
	request = require('superagent');

var CSRF_TOKEN = 'some-token';
global.localStorage = { 'XSRF.Token': CSRF_TOKEN };

var valence = require('../');

describe('superagent-valence', function() {
	it('adds app id (legacy)', function() {
		var endpoint = nock('http://localhost')
			.matchHeader('X-D2L-App-Id', 'deprecated')
			.matchHeader('X-Csrf-Token', /.*/)
			.get('/url')
			.reply(200);

		request.get('http://localhost/url')
			.use(valence)
			.end(function() {});

		endpoint.done();
	});

	it('adds csrf token', function() {
		var endpoint = nock('http://localhost')
			.matchHeader('X-D2L-App-Id', /.*/)
			.matchHeader('X-Csrf-Token', CSRF_TOKEN)
			.get('/url')
			.reply(200);

		request.get('http://localhost/url')
			.use(valence)
			.end(function() {});

		endpoint.done();
	});
});
