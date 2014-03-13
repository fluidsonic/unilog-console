'use strict';

var expect = require('expect.js');
var fakeStream = require('./helpers/fakeStream');
var Helper = require('../lib/helper');
var Path = require('path');
var Util = require('util');


var _formattedLevelByLevel = {
	trace: 'TRACE',
	debug: 'DEBUG',
	info:  'INFO ',
	warn:  'WARN ',
	error: 'ERROR',
	fatal: 'FATAL',
};


var _outputByLevel = {
	trace: 'stdout',
	debug: 'stdout',
	info:  'stdout',
	warn:  'stderr',
	error: 'stderr',
	fatal: 'stderr',
};


describe('Helper', function() {

	describe('#new', function() {

		it('defaults to "supportive"', function() {
			expect(new Helper().derivesGroupIdFromStack).to.be.equal('supportive');
		});

		it('parses UNILOG env var', function() {
			process.env.UNILOG = '*:off';
			try {
				expect(new Helper().filter.getLevelForGroupId('*')).to.be.equal('off');
			}
			finally {
				process.env.UNILOG = '';
			}
		});

		it('doesn\'t throw on invalid UNILOG env var but logs a message', function() {
			fakeStream.err(function() {
				process.env.UNILOG = '* foo # moo';
				try {
					return new Helper();
				}
				finally {
					process.env.UNILOG = '';
				}
			}, function(output) {
				expect(output).to.not.be.empty();
			});
		});

		it('applies options', function() {
			expect(new Helper({ mainPath: '/test' }).mainPath).to.be.equal('/test');
		});
	});

	describe('#config()', function() {

		it('ignores falsy value', function() {
			new Helper().config();
		});

		it('accepts derivesGroupIdFromStack: "always"', function() {
			var helper = new Helper();
			helper.config({ derivesGroupIdFromStack: 'always' });
			expect(helper.derivesGroupIdFromStack).to.be.equal('always');
		});

		it('accepts derivesGroupIdFromStack: "supportive"', function() {
			var helper = new Helper();
			helper.config({ derivesGroupIdFromStack: 'always' });
			helper.config({ derivesGroupIdFromStack: 'supportive' });
			expect(helper.derivesGroupIdFromStack).to.be.equal('supportive');
		});

		it('maps any other value of derivesGroupIdFromStack to false', function() {
			var helper = new Helper();
			helper.config({ derivesGroupIdFromStack: 'what?' });
			expect(helper.derivesGroupIdFromStack).to.be.equal(false);
		});

		it('parses string levels', function() {
			var helper = new Helper();
			helper.config({ levels: '*=off, test:debug' });
			expect(helper.filter.getLevels()).to.be.eql({
				'*':    'off',
				'test': 'debug',
			});
		});

		it('sets levels as key:value > groupId:level', function() {
			var helper = new Helper();
			helper.config({ levels: {
				'*':    'off',
				'test': 'debug',
			} });
			expect(helper.filter.getLevels()).to.be.eql({
				'*':    'off',
				'test': 'debug',
			});
		});

		it('levels add to previous levels', function() {
			var helper = new Helper();
			helper.config({ levels: '*=off main:info' });
			helper.config({ levels: 'test:debug' });
			expect(helper.filter.getLevels()).to.be.eql({
				'*':    'off',
				'main': 'info',
				'test': 'debug',
			});
		});

		it('levels replace previous levels if resetLevels is truthy', function() {
			var helper = new Helper();
			helper.config({ levels: '*=off main:info' });

			helper.config({ levels: 'test:debug', resetLevels: true });
			expect(helper.filter.getLevels()).to.be.eql({
				'*':    'info',
				'test': 'debug',
			});

			helper.config({ resetLevels: true });
			expect(helper.filter.getLevels()).to.be.eql({
				'*': 'info',
			});
		});

		it('uses mainPath', function() {
			var helper = new Helper();
			helper.config({ mainPath: '/test' });
			expect(helper.mainPath).to.be.equal('/test');
		});

		it('accepts a module as mainPath', function() {
			var helper = new Helper();
			helper.config({ mainPath: module });
			expect(helper.mainPath).to.be.equal(Path.dirname(module.filename));
		});

		it('ignores non-string and non-module filePath', function() {
			var helper = new Helper();
			helper.config({ mainPath: '/test' });
			helper.config({ mainPath: 2 });
			expect(helper.mainPath).to.be.equal('/test');
		});

		it('removes trailing (back)slashes from mainPath', function() {
			var helper = new Helper();
			helper.config({ mainPath: '/test/' });
			expect(helper.mainPath).to.be.equal('/test');
			helper.config({ mainPath: '/test\\' });
			expect(helper.mainPath).to.be.equal('/test');
		});
	});

	describe('#dateForEvent()', function() {

		it('returns existing date', function() {
			var date = new Date();
			expect(new Helper().dateForEvent({ date: date })).to.be.equal(date);
		});

		it('returns new date if non exists and updates the event', function() {
			var event = {};
			expect(new Helper().dateForEvent(event)).to.be.a(Date);
			expect(event.date).to.be.a(Date);
		});
	});

	describe('#eventIsEnabled()', function() {

		it('obeys level filter', function() {
			var helper = new Helper();
			helper.config({ levels: 'test:off' });
			expect(helper.eventIsEnabled({ groupId: 'test', level: 'debug' })).to.be.equal(false);
			helper.config({ levels: 'test:debug' });
			expect(helper.eventIsEnabled({ groupId: 'test', level: 'debug' })).to.be.equal(true);
		});

		it('caches result in event', function() {
			var event = { groupId: 'test', level: 'debug' };
			var helper = new Helper();
			helper.config({ levels: 'test:off' });
			expect(helper.eventIsEnabled(event)).to.be.equal(false);
			helper.config({ levels: 'test:debug' });
			expect(helper.eventIsEnabled(event)).to.be.equal(false);
		});

		it('logs unknown levels unless filter level is set to off', function() {
			var helper = new Helper();
			helper.config({ levels: 'test:off' });
			expect(helper.eventIsEnabled({ groupId: 'test', level: 'moo' })).to.be.equal(false);
			helper.config({ levels: 'test:fatal' });
			expect(helper.eventIsEnabled({ groupId: 'test', level: 'moo' })).to.be.equal(true);
		});
	});

	describe('#filePathForEvent()', function() {

		it('returns existing filePath', function() {
			var filePath = '/example';
			expect(new Helper().filePathForEvent({ filePath: filePath })).to.be.equal(filePath);
		});

		it('returns falsy unless filePath, module or stack+callee exist in the event', function callee() {
			expect(new Helper().filePathForEvent({ calee: callee })).to.not.be.ok();
		});

		it('extracts file path from stack+callee', function callee() {
			var helper = new Helper();
			expect(helper.filePathForEvent({ callee: callee, stack: helper.stack() })).to.be.a('string');
		});

		it('extracts file path from module', function() {
			var helper = new Helper();
			expect(helper.filePathForEvent({ module: module })).to.be.equal(module.filename);
		});

		it('extracts file path from callee + automatic stack capture if allowed and necessary', function callee() {
			expect(new Helper().filePathForEvent({ callee: callee }, true)).to.be.a('string');
		});
	});

	describe('#formatDate()', function() {

		it('returns correct format', function() {
			expect(new Helper().formatDate(new Date('2014-03-11T00:00:00.000Z'))).to.be.equal('2014-03-11 00:00:00.000');
		});
	});

	describe('#formatMessage()', function() {

		it('returns non-array as strings', function() {
			expect(new Helper().formatMessage()).to.be.equal('undefined');
		});

		it('concatenates array elements after inspecting non-strings', function() {
			expect(new Helper().formatMessage([ {ab:'123'}, 5, 'test', undefined ])).to.be.equal(
				Util.inspect({ab:'123'}) + Util.inspect(5) + 'test' + Util.inspect(undefined)
			);
		});
	});

	describe('#formatMessageElement()', function() {

		it('formats errors with stack if possible', function() {
			var helper = new Helper();

			var errorWithStack = new Error();

			var errorWithMessage = new Error('error message');
			delete errorWithMessage.stack;

			var otherError = new Error();
			delete otherError.stack;

			expect(helper.formatMessageElement(errorWithStack)).to.be.equal(errorWithStack.stack);
			expect(helper.formatMessageElement(errorWithMessage)).to.be.equal('error message');
			expect(helper.formatMessageElement(otherError)).to.be.equal(Util.inspect(otherError));
		});

		it('inspects non-strings', function() {
			expect(new Helper().formatMessageElement({ a: ['b'] })).to.be.equal(Util.inspect({ a: ['b'] }));
		});

		it('doesn\'t touch strings', function() {
			expect(new Helper().formatMessageElement('test')).to.be.equal('test');
		});
	});

	describe('#formattedDateForEvent()', function() {

		it('returns formatted date', function() {
			expect(new Helper().formattedDateForEvent({ date: new Date('2014-03-11T00:00:00.000Z') })).to.be.equal('2014-03-11 00:00:00.000');
		});

		it('returns a formatted date if none was given', function() {
			expect(new Helper().formattedDateForEvent({})).to.be.a('string');
		});

		it('caches formatted date', function() {
			var event = { date: new Date('2014-03-11T00:00:00.000Z') };
			var helper = new Helper();
			expect(helper.formattedDateForEvent(event)).to.be.equal('2014-03-11 00:00:00.000');
			event.date = new Date('2015-03-11T11:11:11.111Z');
			expect(helper.formattedDateForEvent(event)).to.be.equal('2014-03-11 00:00:00.000');
		});
	});

	describe('#formattedLevelForEvent()', function() {

		Object.keys(_formattedLevelByLevel).forEach(function(level) {
			var formattedLevel = _formattedLevelByLevel[level];
			it('returns "' + formattedLevel + '" for "' + level + '"', function() {
				expect(new Helper().formattedLevelForEvent({ level: level })).to.be.equal(formattedLevel);
			});
		});

		it('returns "?????" for unknown level', function() {
			expect(new Helper().formattedLevelForEvent({ level: 'foo' })).to.be.equal('?????');
		});

		it('caches formatted level', function() {
			var event = { level: 'debug' };
			var helper = new Helper();
			expect(helper.formattedLevelForEvent(event)).to.be.equal('DEBUG');
			event.level = 'info';
			expect(helper.formattedLevelForEvent(event)).to.be.equal('DEBUG');
		});
	});

	describe('#formattedMessageForEvent()', function() {

		it('returns formatted message', function() {
			expect(new Helper().formattedMessageForEvent({ message: [ 'a', { b: 'c'}, 2 ] })).to.be.equal('a' + Util.inspect({ b: 'c' }) + '2');
		});

		it('caches formatted message', function() {
			var event = { message: 'moo' };
			var helper = new Helper();
			expect(helper.formattedMessageForEvent(event)).to.be.equal('moo');
			event.message = 'foo';
			expect(helper.formattedMessageForEvent(event)).to.be.equal('moo');
		});
	});

	describe('#groupIdForEvent()', function() {

		it('returns existing groupId by default', function() {
			expect(new Helper().groupIdForEvent({ groupId: 'test' })).to.be.equal('test');
		});

		it('uses stack when derivesGroupIdFromStack == "always"', function() {
			var helper = new Helper();
			helper.config({ derivesGroupIdFromStack: 'always' });
			expect(helper.groupIdForEvent({ callee: helper.groupIdForEvent, groupId: 'ignoreMe' })).to.match(/^main\.test(\.|$)/);
		});

		it('ignores stack when derivesGroupIdFromStack == "always" but callee missing', function() {
			var helper = new Helper();
			helper.config({ derivesGroupIdFromStack: 'always' });
			expect(helper.groupIdForEvent({ groupId: 'test' })).to.be.equal('test');
		});

		it('falls back to filePath if module has no useful filename', function() {
			expect(new Helper().groupIdForEvent({ filePath: __filename, module: {} })).to.match(/^main\.test(\.|$)/);
		});

		it('returns "unknown" if everything else fails', function() {
			expect(new Helper().groupIdForEvent({})).to.be.equal('unknown');
		});

		it('caches group id', function() {
			var event = { module: module };
			var helper = new Helper();
			expect(helper.groupIdForEvent(event)).to.match(/^main\.test(\.|$)/);
			delete event.stack;
			event.module = require.main;
			expect(helper.groupIdForEvent(event)).to.match(/^main\.test(\.|$)/);
		});
	});

	describe('#groupIdForFilePath()', function() {

		it('returns falsy for non-string', function() {
			expect(new Helper().groupIdForFilePath(2)).to.not.be.ok();
		});

		it('returns falsy for empty string', function() {
			expect(new Helper().groupIdForFilePath('')).to.not.be.ok();
		});

		it('resolves main modules correctly', function() {
			var helper = new Helper();
			helper.config({ mainPath: '/test' });
			expect(helper.groupIdForFilePath('/test/a')).to.be.equal('main.a');
			expect(helper.groupIdForFilePath('/test/a/b')).to.be.equal('main.a.b');
			expect(helper.groupIdForFilePath('/test/a/b/c')).to.be.equal('main.a.b.c');
		});

		it('resolves node_modules correctly', function() {
			var helper = new Helper();
			helper.config({ mainPath: '/test' });
			expect(helper.groupIdForFilePath('/test/node_modules/a.js')).to.be.equal('a');
			expect(helper.groupIdForFilePath('/test/node_modules/a/b.coffee')).to.be.equal('a.b');
			expect(helper.groupIdForFilePath('/test/node_modules/a/b/c')).to.be.equal('a.b.c');
			expect(helper.groupIdForFilePath('/lib/node_modules/a.js')).to.be.equal('a');
			expect(helper.groupIdForFilePath('/lib/node_modules/a/b.coffee')).to.be.equal('a.b');
			expect(helper.groupIdForFilePath('/lib/node_modules/a/b/c')).to.be.equal('a.b.c');
		});

		it('resolves unknown modules above main path to "other.*"', function() {
			var helper = new Helper();
			helper.config({ mainPath: '/main/path' });
			expect(helper.groupIdForFilePath('/alternate/test/foo.js')).to.be.equal('other.alternate.test.foo');
		});

		if (/^win/.test(process.platform)) {
			it('resolves modules on other drives to "other.*"', function() {
				var helper = new Helper();
				helper.config({ mainPath: 'C:\\' });
				expect(helper.groupIdForFilePath('D:\\alternate\\test\\foo.js')).to.be.equal('other.alternate.test.foo');
			});
		}
		else {
			it('drive letters aren\'t really supported on non-Windows but we want 100% coverage :)', function() {
				var helper = new Helper();
				helper.config({ mainPath: '/test' });
				expect(helper.groupIdForFilePath('/test/D:/foo.js')).to.be.equal('other.foo');
			});
		}

		it('sanitizes group IDs', function() {
			var helper = new Helper();
			expect(helper.groupIdForFilePath('/node_modules/a/b.c/d.js')).to.be.equal('a.b_c.d');
		});
	});

	describe('#groupIdForModule()', function() {

		it('uses module.filename', function() {
			var helper = new Helper();
			helper.config({ mainPath: '/test' });
			expect(helper.groupIdForModule({ filename: '/test/foo.js' })).to.be.equal('main.foo');
		});

		it('caches result', function() {
			var mod = { filename: '/test/foo.js' };
			var helper = new Helper();
			helper.config({ mainPath: '/test' });
			expect(helper.groupIdForModule(mod)).to.be.equal('main.foo');
			mod.filename = '/test/other.js';
			expect(helper.groupIdForModule(mod)).to.be.equal('main.foo');
		});
	});

	describe('#isValidGroupId()', function() {

		it('accepts valid input', function() {
			var helper = new Helper();
			expect(helper.isValidGroupId('main')).to.be.equal(true);
			expect(helper.isValidGroupId('main.sub')).to.be.equal(true);
			expect(helper.isValidGroupId('main.su-b1.su_b2')).to.be.equal(true);
		});

		it('rejects invalid input', function() {
			var helper = new Helper();
			expect(helper.isValidGroupId(null)).to.be.equal(false);
			expect(helper.isValidGroupId('')).to.be.equal(false);
			expect(helper.isValidGroupId('a..b')).to.be.equal(false);
			expect(helper.isValidGroupId('main.sub.te#st')).to.be.equal(false);
		});
	});

	describe('#logInternal()', function() {

		it('logs to stderr', function() {
			fakeStream.err(function() {
				new Helper().logInternal(1234);
			}, function(output) {
				expect(output).to.be.equal('(unilog-console) 1234\n');
			});
		});
	});

	describe('#outputForEvent()', function() {

		Object.keys(_outputByLevel).forEach(function(level) {
			var output = _outputByLevel[level];
			it('returns process.' + output + ' for "' + level + '"', function() {
				expect(new Helper().outputForEvent({ level: level })).to.be.equal(process[output]);
			});
		});

		it('returns process.stderr for unknown level', function() {
			expect(new Helper().outputForEvent({ level: 'foo' })).to.be.equal(process.stderr);
		});

		it('caches output', function() {
			var event = { level: 'error' };
			var helper = new Helper();
			expect(helper.outputForEvent(event)).to.be.equal(process.stderr);
			event.level = 'info';
			expect(helper.outputForEvent(event)).to.be.equal(process.stderr);
		});
	});

	describe('#sanitizeGroupIdComponent()', function() {

		it('returns null as null', function() {
			expect(new Helper().sanitizeGroupIdComponent(null)).to.be.equal(null);
		});

		it('sanitizes everything else as string', function() {
			expect(new Helper().sanitizeGroupIdComponent('a.b#c,d-e_f')).to.be.equal('a_b_c_d-e_f');
			expect(new Helper().sanitizeGroupIdComponent('a###.#.#.#.#_f')).to.be.equal('a_f');
			expect(new Helper().sanitizeGroupIdComponent('###.#.#.#.#$$,,')).to.be.equal('_');
		});
	});
});
