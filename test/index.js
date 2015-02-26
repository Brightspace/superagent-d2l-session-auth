var nock = require('nock'),
	should = require('should'),
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

		request.get('/url')
			.use(valence)
			.end(function() {});

		endpoint.done();
	});

	it('adds csrf token for relative URLs', function() {
		var endpoint = nock('http://localhost')
			.matchHeader('X-D2L-App-Id', /.*/)
			.matchHeader('X-Csrf-Token', CSRF_TOKEN)
			.get('/url')
			.reply(200);

		request.get('/url')
			.use(valence)
			.end(function() {});

		endpoint.done();
	});

	it('does not add csrf token for non-relative URLs', function() {
		var req = request.get('http://localhost/url').use(valence);

		should.not.exist(req.header['X-Csrf-Token']);
	});
});
