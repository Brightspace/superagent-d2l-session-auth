'use strict';

var assert = require('assert'),
	nock = require('nock'),
	Promise = require('lie'),
	rewire = require('rewire'),
	should = require('should'),
	sinon = require('sinon'),
	request = require('superagent');

nock.disableNetConnect();

var auth = rewire('../'),
	framed = rewire('../framed');

describe('superagent-auth', function() {
	var getJwt;
	beforeEach(function() {
		getJwt = sinon.stub();
		getJwt.returns(Promise.resolve('foo'));
		auth.__set__('getJwt', getJwt);
	});

	[
		['', false],
		['https://foo.api.brightspace.com', true],
		['https://api.brightspace.com', true],
		['https://foo.api.dev.brightspace.com', true],
		['https://api.dev.brightspace.com', true],
		['http://niceness.com', true, 'niceness.com'],
		['http://niceness.com', true, 'NICENESS.cOm'],
		['https://niceness.com', true, 'niceness.com'],
		['http://niceness.com:1234', true, 'niceness.com:1234'],
		['http://foo.api.brightspace.com', false],
		['http://api.brightspace.com', false],
		['http://foo.api.dev.brightspace.com', false],
		['http://api.dev.brightspace.com', false],
		['https://notapi.brightspace.com', false],
		['https://api.brightspace.com.evil.com', false],
		['https://bad.api.brightspace.com.evil.com', false],
		['http://sub.niceness.com', false, 'niceness.com'],
		['https://sub.niceness.com', false, 'niceness.com'],
		['http://niceness.com:5678', false, 'niceness.com:1234'],
		['https://localhost', false]
	].forEach(function(test) {
		var host = test[0],
			shouldAdd = test[1],
			trusted = test[2];

		it('should ' + (shouldAdd ? '' : 'NOT ') + 'add auth header for "' + host + '"' + (trusted ? ' (when "' + trusted + '" is trusted)' : ''), function(done) {
			var expectedToken = 'token';
			getJwt.returns(Promise.resolve(expectedToken));

			var req;
			if (shouldAdd) {
				req = nock(host || 'http://localhost')
					.matchHeader('Authorization', 'Bearer ' + expectedToken)
					.get('/api')
					.reply(200);
			} else {
				req = nock(host || 'http://localhost')
					.get('/api')
					.reply(200);
			}

			var plugin;
			if (trusted !== undefined) {
				plugin = auth({
					trustedHost: trusted
				});
			} else {
				plugin = auth();
			}

			request
				.get(host + '/api')
				.use(plugin)
				.end(function(_, res) {
					req.done();

					if (shouldAdd) {
						sinon.assert.called(getJwt);
						assert(res.req._headers.authorization === 'Bearer ' + expectedToken);
					} else {
						sinon.assert.notCalled(getJwt);
						assert(res.req._headers.authorization === undefined);
					}

					done();
				});
		});
	});

	it('should pass scope option to jwt', function(done) {
		var req = nock('https://foo.api.brightspace.com')
			.get('/bar')
			.reply(200);

		request
			.get('https://foo.api.brightspace.com/bar')
			.use(auth({
				scope: 'a:b:c x:y:z'
			}))
			.end(function() {
				req.done();

				sinon.assert.calledWith(getJwt, 'a:b:c x:y:z');

				done();
			});
	});

	it('doesn\'t block request on preflight failure', function(done) {
		getJwt.returns(Promise.reject(new Error()));

		var req = nock('https://api.brightspace.com')
			.get('/bar')
			.reply(200);

		request
			.get('https://api.brightspace.com/bar')
			.use(auth())
			.end(function(_, res) {
				req.done();

				sinon.assert.called(getJwt);
				assert(res.req._headers.authorization === undefined);

				done();
			});
	});

	it('should return something from "end" when auth is going to be added', function() {
		var req = request
			.get('https://foo.api.brightspace.com/bar')
			.use(auth())
			.end(function() {});

		should.exist(req);
	});

	it('should return something from "end" when auth is not going to be added', function() {
		var req = request
			.get('http://localhost/api')
			.use(auth())
			.end(function() {});

		should.exist(req);
	});

	describe('framed', function() {
		var sessionAuth;
		beforeEach(function() {
			framed.__set__('getJwt', getJwt);
			sessionAuth = sinon.spy(framed.__get__('auth'));
			framed.__set__('auth', sessionAuth);
		});

		it('should call sessionAuth with getJwt', function() {
			request
				.get('http://localhost/api')
				.use(framed())
				.end(function() {});

			sinon.assert.calledWith(sessionAuth, getJwt, undefined);
		});
	});

});
