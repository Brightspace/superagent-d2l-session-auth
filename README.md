superagent-valence
==================

A superagent plugin that adds D2L auth headers

Usage
-----

```js
var request = require('superagent');
var valence = require('superagent-valence')('MyAppName');

valence(request);

request
.get('/d2l/api/lp/1.5/users/whoami')
.end(function(res) {
  var user = JSON.parse(res.body);
  console.log('Hello, ' + user.FirstName + ' ' + user.LastName);
});
```
