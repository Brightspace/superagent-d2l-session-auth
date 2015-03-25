var nock = require('nock'),
	should = require('should'),
	request = require('superagent');

nock.disableNetConnect();

var XSRF_TOKEN = 'some-token';
global.localStorage = { 'XSRF.Token': XSRF_TOKEN };

var valence = require('../');

function now() {
	return Date.now()/1000 | 0;
}

function theFuture() {
	return 1000 + now();
}

describe('superagent-valence', function() {
	it('adds app id (legacy)', function() {
		global.D2LAccessTokenExpiresAt = theFuture();

		var endpoint = nock('http://localhost')
			.matchHeader('X-D2L-App-Id', 'deprecated')
			.get('/api')
			.reply(200);

		request
			.get('/api')
			.use(valence)
			.end(function() {});

		endpoint.done();
	});

	it('adds csrf token for relative URLs', function() {
		global.D2LAccessTokenExpiresAt = theFuture();

		var endpoint = nock('http://localhost')
			.matchHeader('X-Csrf-Token', XSRF_TOKEN)
			.get('/api')
			.reply(200);

		request
			.get('/api')
			.use(valence)
			.end(function() {});

		endpoint.done();
	});

	it('does not add xsrf token for non-relative URLs', function() {
		var req = request.get('http://localhost/api').use(valence);

		should.not.exist(req.header['X-Csrf-Token']);
		req.end.should.equal(Object.getPrototypeOf(req).end); // no funny business
	});

	it('sends refreshcookie preflight on boot', function(done) {
		global.D2LAccessTokenExpiresAt = 0;

		var endpoint = nock('http://localhost')
			.post('/d2l/lp/auth/oauth2/refreshcookie')
			.matchHeader('X-Csrf-Token', XSRF_TOKEN)
			.reply(204)
			.get('/api')
			.matchHeader('X-Csrf-Token', XSRF_TOKEN)
			.reply(200);

		request
			.get('/api')
			.use(valence)
			.end(function() {
				endpoint.done();

				global.D2LAccessTokenExpiresAt
					.should.equal(0); // no cache-control --> can't set an expiry

				done();
			});

	});

	it('handles basic cache-control header', function(done) {
		global.D2LAccessTokenExpiresAt = 0;

		var maxLength = 10;

		var endpoint = nock('http://localhost')
			.post('/d2l/lp/auth/oauth2/refreshcookie')
			.reply(204, '', {
				'Cache-Control': 'max-age=' + maxLength
			})
			.get('/api')
			.reply(200);

		request
			.get('/api')
			.use(valence)
			.end(function() {
				endpoint.done();

				global.D2LAccessTokenExpiresAt
					.should.be.within(now() - maxLength, now() + maxLength);

				done();
			});
	});

	it('handles complicated cache-control header', function(done) {
		global.D2LAccessTokenExpiresAt = 0;

		var maxLength = 100;

		var endpoint = nock('http://localhost')
			.post('/d2l/lp/auth/oauth2/refreshcookie')
			.reply(204, '', {
				'Cache-Control': 'private , max-age   = ' + maxLength
			})
			.get('/api')
			.reply(200);

		request
			.get('/api')
			.use(valence)
			.end(function() {
				endpoint.done();

				global.D2LAccessTokenExpiresAt
					.should.be.within(now() - maxLength, now() + maxLength);

				done();
			});
	});

	it('doesn\'t block request on preflight failure', function(done) {
		this.timeout(20);
		global.D2LAccessTokenExpiresAt = 0;

		var endpoint = nock('http://localhost')
			.post('/d2l/lp/auth/oauth2/refreshcookie')
			.reply(404)
			.get('/api')
			.reply(200);

		request
			.get('/api')
			.use(valence)
			.end(function() {
				endpoint.done();

				global.D2LAccessTokenExpiresAt
					.should.equal(0);

				done();
			});

		setTimeout(function() { done(); }, 10);
	});
});
