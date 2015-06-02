var nock = require('nock'),
	should = require('should'),
	request = require('superagent');

nock.disableNetConnect();

var XSRF_TOKEN = 'some-token';
global.localStorage = { 'XSRF.Token': XSRF_TOKEN };

var authLib = require('../');
var auth = authLib(request);

function now() {
	return Date.now()/1000 | 0;
}

function theFuture() {
	return 1000 + now();
}

describe('superagent-auth', function() {
	beforeEach(function() {
		authLib._enableOAuth2();
		authLib._setAccessTokenExpiry(0);
	});

	it('adds app id (legacy)', function() {
		authLib._setAccessTokenExpiry(theFuture());

		var endpoint = nock('http://localhost')
			.matchHeader('X-D2L-App-Id', 'deprecated')
			.get('/api')
			.reply(200);

		request
			.get('/api')
			.use(auth)
			.end(function() {});

		endpoint.done();
	});

	it('adds csrf token for relative URLs', function() {
		authLib._setAccessTokenExpiry(theFuture());

		var endpoint = nock('http://localhost')
			.matchHeader('X-Csrf-Token', XSRF_TOKEN)
			.get('/api')
			.reply(200);

		request
			.get('/api')
			.use(auth)
			.end(function() {});

		endpoint.done();
	});

	it('does not add xsrf token for non-relative URLs', function() {
		var req = request.get('http://localhost/api').use(auth);

		should.not.exist(req.header['X-Csrf-Token']);
		req.end.should.equal(Object.getPrototypeOf(req).end); // no funny business
	});

	it('sends refreshcookie preflight on boot', function(done) {
		var endpoint = nock('http://localhost')
			.post('/d2l/lp/auth/oauth2/refreshcookie')
			.matchHeader('X-Csrf-Token', XSRF_TOKEN)
			.reply(204)
			.get('/api')
			.matchHeader('X-Csrf-Token', XSRF_TOKEN)
			.reply(200);

		request
			.get('/api')
			.use(auth)
			.end(function() {
				endpoint.done();

				authLib._accessTokenExpiry()
					.should.equal(0); // no cache-control --> can't set an expiry

				done();
			});

	});

	it('stops trying refreshcookie once it gets a 404', function(done) {
		var endpoint = nock('http://localhost')
			.post('/d2l/lp/auth/oauth2/refreshcookie')
			.reply(404)
			.get('/api')
			.reply(200);

		request
			.get('/api')
			.use(auth)
			.end(function() {
				endpoint.done();

				authLib._isOAuth2Enabled()
					.should.be.exactly(false);

				done();
			});
	});

	it('doesnt call refreshcookie if oauth2 is disabled', function(done) {
		authLib._disableOAuth2();

		var endpoint = nock('http://localhost')
			.get('/api')
			.reply(200);

		request
			.get('/api')
			.use(auth)
			.end(function() {
				endpoint.done();

				authLib._isOAuth2Enabled()
					.should.be.exactly(false);

				done();
			});
	});

	it('handles basic cache-control header', function(done) {
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
			.use(auth)
			.end(function() {
				endpoint.done();

				authLib._accessTokenExpiry()
					.should.be.within(now() - maxLength, now() + maxLength);

				done();
			});
	});

	it('handles complicated cache-control header', function(done) {
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
			.use(auth)
			.end(function() {
				endpoint.done();

				authLib._accessTokenExpiry()
					.should.be.within(now() - maxLength, now() + maxLength);

				done();
			});
	});

	it('doesn\'t block request on preflight failure', function(done) {
		var endpoint = nock('http://localhost')
			.post('/d2l/lp/auth/oauth2/refreshcookie')
			.reply(500)
			.get('/api')
			.reply(200);

		request
			.get('/api')
			.use(auth)
			.end(function() {
				endpoint.done();

				authLib._accessTokenExpiry()
					.should.equal(0);

				done();
			});
	});

	it('should return something from "end" when not expired', function() {
		global.D2LAccessTokenExpiresAt = theFuture();
		var req = request
			.get('/api')
			.use(auth)
			.end(function() {});

		should.exist(req);
	});

	it('should return something from "end" when expired', function() {
		var req = request
			.get('/api')
			.use(auth)
			.end(function() {});

		should.exist(req);
	});

});
