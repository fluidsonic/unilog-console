unilog-console
==============

[![Build Status](https://travis-ci.org/fluidsonic/unilog-console.png?branch=master)](https://travis-ci.org/fluidsonic/unilog-console)
[![Dependency Status](https://gemnasium.com/fluidsonic/unilog-console.png)](https://gemnasium.com/fluidsonic/unilog-console)
[![Code Climate](https://codeclimate.com/github/fluidsonic/unilog-console.png)](https://codeclimate.com/github/fluidsonic/unilog-console)
[![dependencies](https://sourcegraph.com/api/repos/github.com/fluidsonic/unilog-console/badges/dependencies.png)](https://sourcegraph.com/github.com/fluidsonic/unilog-console)

A node.js [unilog](https://github.com/fluidsonic/unilog) back-end which logs nicely formatted to the console.

```
2014-03-13 10:51:45.103 |  INFO | Starting application…
2014-03-13 10:51:45.105 | DEBUG | Connecting to the database at "mongodb://localhost/test"…
2014-03-13 10:51:45.157 | ERROR | Failed connecting to the database. Will try again soon.
```


Quickstart
----------

unilog-console is automatically used as back-end for *unilog* by default. You don't have to install or set up anything.

```javascript
// You can simply configure unilog's default console back-end.
require('unilog').config({
  console: { /* console configuration */ }
});

// or manually create a new back-end instance if you need one
var Console = require('unilog-console');
var backend = new Console({ /* optional configuration */ });
```

Filtering the output is simple:

    $ export UNILOG='*:info main:trace mongodb:debug'
    $ node .


Methods
-------

#### `new Console(options)`

Creates a new instance and configures it using [`.config(options)`](#configoptions).

Implicitly uses the `UNILOG` environment variable for configuring levels before calling `.config(options)`.  
This is similar to `.config({ levels: process.env.UNILOG })`.

Main path is automatically derived from the `require.main` module's filename. If the module is contained within a `node_modules` folder (e.g. when running tests) then its containing folder will be used.


#### `.config({options})`

Available options:

- `derivesGroupIdFromStack`
  - `'always'` - always captures the stack of a log event to derive the group ID from it
  - `'supportive'` (default on construction) - only capture the stack of a log event if the group ID couldn't be determined otherwise
  - `false` - never capture the stack trace

- `mainPath` - main path of the project which is used as a base path when deriving a source file's group ID
  - `string` - directly specify a main path (trailing slashes will be removed)
  - `module` - the directory path of the module's `filename` will be used

- `levels` - log output levels
  - `string` - e.g. `'*:info main:trace mongodb:debug'`
  - `object` - e.g. `{ '*': 'info', 'main': 'trace', 'mongodb': 'debug' }`

- `resetLevels`
  - `false` (default) - `levels` will be merged with previously defined levels
  - `true` - previously set levels will be reset before optionally new `levels` are applied


#### `.putEvent(event)`

See [unilog's back-end documentation of `.putEvent(event)`](https://github.com/fluidsonic/unilog#puteventevent).


#### `.eventEnabled(event)`

See [unilog's back-end documentation of `.eventEnabled(event)`](https://github.com/fluidsonic/unilog#eventenabledevent).



Installation
------------

    $ npm install unilog-console



Testing
-------

    $ npm install
    $ npm test



To-Do
-----

- Support more library module locations, e.g. `.node_modules`, `.node_libraries` and `*/lib/node` when deriving group IDs.
- Add config options to also output an event's `groupId`, `fileName` and `lineNumber` which is useful for debugging.



License
-------

MIT
