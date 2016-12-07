# superagent-d2l-session-auth

[![NPM version][npm-image]][npm-url]
[![Build status][ci-image]][ci-url]
[![Coverage Status][coverage-image]][coverage-url]

A superagent plugin that adds D2L auth headers

## Usage

```js
var request = require('superagent'),
    auth = require('superagent-d2l-session-auth')();

request
    .get('/d2l/api/lp/1.5/users/whoami')
    .use(auth)
    .end(function(err, res) {
        if(err) {
           console.log('I always check for errors! ' + err.status + ' ' + err.response);
           return;
        }
        var user = res.body;
        console.log('Hello, ' + user.FirstName + ' ' + user.LastName);
    });
```

For strictly iframed applications, consider requiring `superagent-d2l-session-auth/framed` instead.



### API

---

#### `auth([Object options])` -> `Function`

The export is a factory function which creates the superagent plugin. The
result of this call is what should be passed into `.use`.

##### Option: scope `String` _(\*:\*\:*)_

You may optionally specify scope(s) desired on the requested token. This option
is passed directly into the backing [frau-jwt][frau-jwt] library.

##### Option: trustedHost `String`

You may optionally specify an additional host which is trusted and which
authorization tokens should be sent to. This should be generally unnecessary,
and should only be an instance of Brightspace.

```js
var auth = require('superagent-d2l-session-auth')({
	trustedHost: 'school.brightspace.com'
});

request
	.get('https://school.brightspace.com/api')
	.use(auth)
	.end(/* ... */);
```

## Contributing

1. **Fork** the repository. Committing directly against this repository is
   highly discouraged.

   2. Make your modifications in a branch, updating and writing new unit tests
      as necessary in the `spec` directory.

      3. Ensure that all tests pass with `npm test`

      4. `rebase` your changes against master. *Do not merge*.

      5. Submit a pull request to this repository. Wait for tests to run and someone
         to chime in.

### Code Style

This repository is configured with [EditorConfig][EditorConfig] and [ESLint][ESLint] rules.

[npm-url]: https://npmjs.org/package/superagent-d2l-session-auth
[npm-image]: https://badge.fury.io/js/superagent-d2l-session-auth.png
[ci-image]: https://travis-ci.org/Brightspace/superagent-d2l-session-auth.svg?branch=master
[ci-url]: https://travis-ci.org/Brightspace/superagent-d2l-session-auth
[coverage-image]: https://img.shields.io/coveralls/Brightspace/superagent-d2l-session-auth.svg
[coverage-url]: https://coveralls.io/r/Brightspace/superagent-d2l-session-auth?branch=master
[EditorConfig]: http://editorconfig.org/
[ESLint]: https://github.com/eslint/eslint
[frau-jwt]: https://github.com/Brightspace/frau-jwt
