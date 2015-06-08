var nock = require('nock'),
	should = require('should'),
	request = require('superagent');

nock.disableNetConnect();

var XSRF_TOKEN = 'some-token';
var XSRF_TOKEN_DOMAIN = 'some-other-token';
global.localStorage = {
	'XSRF.Token': XSRF_TOKEN,
	'XSRF.Token@http://domain:1234': XSRF_TOKEN_DOMAIN
};

var auth = require('../');

function now() {
	return Date.now()/1000 | 0;
}

function theFuture() {
	return 1000 + now();
}

describe('superagent-auth', function() {

	describe('use', function() {

		beforeEach(function() {
			auth._enableOAuth2();
			auth._setAccessTokenExpiry(0);
		});

		it('adds app id (legacy)', function() {
			auth._setAccessTokenExpiry(theFuture());

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
			auth._setAccessTokenExpiry(theFuture());

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

		it('adds csrf token for non-relative known URLs', function(done) {
			auth._setAccessTokenExpiry(theFuture());
			var endpoint = nock('http://domain:1234')
				.matchHeader('X-Csrf-Token', XSRF_TOKEN_DOMAIN)
				.get('/api')
				.reply(200);
			request
				.get('http://domain:1234/api')
				.use(auth)
				.end(function(err,res) {
					should.not.exist(err);
					should.exist(res);
					endpoint.done();
					done();
				});
		});

		it('does not add xsrf token for non-relative unknown URLs', function() {
			var req = request.get('http://localhost/api').use(auth);

			should.not.exist(req.header['X-Csrf-Token']);
			req.end.should.equal(Object.getPrototypeOf(req).end); // no funny business
		});

		it('sends refreshcookie preflight on boot for relative URLs', function(done) {
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
					auth._accessTokenExpiry()
						.should.equal(0); // no cache-control --> can't set an expiry
					done();
				});
		});

		it('sends refreshcookie preflight on boot for known URLs', function(done) {
			var endpoint = nock('http://domain:1234')
				.post('/d2l/lp/auth/oauth2/refreshcookie')
				.matchHeader('X-Csrf-Token', XSRF_TOKEN_DOMAIN)
				.reply(204)
				.get('/api')
				.matchHeader('X-Csrf-Token', XSRF_TOKEN_DOMAIN)
				.reply(200);
			request
				.get('http://domain:1234/api')
				.use(auth)
				.end(function(err,res) {
					should.not.exist(err);
					should.exist(res);
					endpoint.done();
					auth._accessTokenExpiry()
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

					auth._isOAuth2Enabled()
						.should.be.exactly(false);

					done();
				});
		});

		it('doesnt call refreshcookie if oauth2 is disabled', function(done) {
			auth._disableOAuth2();

			var endpoint = nock('http://localhost')
				.get('/api')
				.reply(200);

			request
				.get('/api')
				.use(auth)
				.end(function() {
					endpoint.done();

					auth._isOAuth2Enabled()
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

					auth._accessTokenExpiry()
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

					auth._accessTokenExpiry()
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

					auth._accessTokenExpiry()
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

	describe('tryGetOrigin', function() {

		[
			{url:'', result:null},
			{url:'/api', result:null},
			{url:'/api/http://', result:null},
			{url:'ftp://foo.com', result:null},
			{url:'http:///', result:null},
			{url:'http://domain.com/api', result:'http://domain.com'},
			{url:'http://domain.com/', result:'http://domain.com'},
			{url:'http://domain.com:1234/api', result:'http://domain.com:1234'},
			{url:'http://domain.com', result:'http://domain.com'},
			{url:'https://www.domain.com/api', result:'https://www.domain.com'},
			{url:'HtTpS://domain.com/api', result:'HtTpS://domain.com'}
		].forEach(function(val) {
			it('should parse \"' + val.url + '\" to \"' + val.result + '"', function() {
				var origin = auth._tryGetOrigin(val.url);
				should.equal(origin, val.result);
			});
		});

	});

});
