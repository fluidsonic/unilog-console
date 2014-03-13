'use strict';

var Console = require('../lib');
var expect = require('expect.js');
var fakeStream = require('./helpers/fakeStream');


var _formattedLevelByLevel = {
	trace: 'TRACE',
	debug: 'DEBUG',
	info:  ' INFO',
	warn:  ' WARN',
	error: 'ERROR',
	fatal: 'FATAL',
};

var _levels = [
	'trace',
	'debug',
	'info',
	'warn',
	'error',
	'fatal',
];

var _levelsCoveredByFilterLevel = {
	fatal: [ 'fatal' ],
	error: [ 'fatal', 'error'] ,
	warn:  [ 'fatal', 'error', 'warn' ],
	info:  [ 'fatal', 'error', 'warn', 'info' ],
	debug: [ 'fatal', 'error', 'warn', 'info', 'debug' ],
	trace: [ 'fatal', 'error', 'warn', 'info', 'debug', 'trace' ],
	off:   [],
};

var _streamByLevel = {
	trace: fakeStream.out,
	debug: fakeStream.out,
	info:  fakeStream.out,
	warn:  fakeStream.err,
	error: fakeStream.err,
	fatal: fakeStream.err,
};


describe('Console', function suite() {

	describe('#eventEnabled()', function() {

		describe('obeys level filter', function() {

			Object.keys(_levelsCoveredByFilterLevel).forEach(function(filterLevel) {
				_levels.forEach(function(level) {
					var outputExpected = _levelsCoveredByFilterLevel[filterLevel].indexOf(level) >= 0;
					
					it('filter level "' + filterLevel + '" ' + (outputExpected ? 'includes' : 'excludes') + ' level "' + level + '"', function() {
						var lib = new Console();
						lib.config({ levels: { '*': filterLevel } });
						expect(lib.eventEnabled({ level: level })).to.be.equal(outputExpected);
					});
				});
			});
		});

		describe('event.callee', function() {

			it('was specified', function() {
				// specified callee should resolve in some mocha-related groupId, i.e. not 'main.test.*'
				
				var lib = new Console();
				lib.config({ levels: '*:trace main.test:off' });
				expect(lib.eventEnabled({ callee: suite, level: 'trace' })).to.be.equal(true);
			});

			it('was not specified', function() {
				// omitted callee should resolve in groupId 'main.test.*'
				
				var lib = new Console();
				lib.config({ levels: '*:trace main.test:off' });
				expect(lib.eventEnabled({ level: 'trace' })).to.be.equal(false);
			});
		});
	});

	describe('#putEvent()', function() {

		describe('obeys level filter', function() {

			Object.keys(_levelsCoveredByFilterLevel).forEach(function(filterLevel) {
				_levels.forEach(function(level) {
					var outputExpected = _levelsCoveredByFilterLevel[filterLevel].indexOf(level) >= 0;

					it('filter level "' + filterLevel + '" ' + (outputExpected ? 'includes' : 'excludes') + ' level "' + level + '"', function() {
						_streamByLevel[level](function() {
							var lib = new Console();
							lib.config({ levels: { '*': filterLevel } });
							lib.putEvent({
								level:   level,
								message: 'test log message',
							});
						},
						function(output) {
							if (outputExpected) {
								expect(output).to.not.be.empty();
							}
							else {
								expect(output).to.be.empty();
							}
						});
					});
				});
			});
		});

		describe('event.callee', function() {

			it('was specified', function() {
				_streamByLevel.trace(function() {
					var lib = new Console();
					lib.config({ levels: '*:trace main.test:off' });
					lib.putEvent({
						callee:  suite,  // should resolve in some mocha-related groupId, i.e. not 'main.test.*'
						level:   'trace',
						message: 'test log message',
					});
				},
				function(output) {
					expect(output).to.not.be.empty();
				});
			});

			it('was not specified', function() {
				_streamByLevel.trace(function() {
					var lib = new Console();
					lib.config({ levels: '*:trace main.test:off' });
					lib.putEvent({
						// no callee should resolve in groupId 'main.test.*'
						level:   'trace',
						message: 'test log message',
					});
				},
				function(output) {
					expect(output).to.be.empty();
				});
			});
		});

		describe('formats all levels correctly', function() {

			_levels.forEach(function(level) {
				it('output for level "' + level + '"', function() {
					_streamByLevel[level](function() {
						var lib = new Console();
						lib.config({ levels: { '*': 'trace' } });
						lib.putEvent({
							date:    new Date('2014-03-11T00:00:00.000Z'),
							level:   level,
							message: 'test log message',
						});
					},
					function(output) {
						expect(output).to.be.equal('2014-03-11 00:00:00.000 | ' + _formattedLevelByLevel[level] + ' | test log message\n');
					});
				});
			});
		});
	});
});
