superagent-d2l-session-auth
===========================

[![NPM version][npm-image]][npm-url]
[![Build status][ci-image]][ci-url]

A superagent plugin that adds D2L auth headers

Usage
-----

```js
var request = require('superagent');
var auth = require('superagent-d2l-session-auth')('MyAppName');

request
    .get('/d2l/api/lp/1.5/users/whoami')
    .use(auth)
    .end(function(res) {
        var user = res.body;
        console.log('Hello, ' + user.FirstName + ' ' + user.LastName);
    });
```

[npm-url]: https://npmjs.org/package/superagent-d2l-session-auth
[npm-image]: https://badge.fury.io/js/superagent-d2l-session-auth.png
[ci-image]: https://travis-ci.org/Brightspace/superagent-d2l-session-auth.svg?branch=master
[ci-url]: https://travis-ci.org/Brightspace/superagent-d2l-session-auth
