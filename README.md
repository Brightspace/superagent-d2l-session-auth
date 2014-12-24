superagent-d2l-session-auth
===========================

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
