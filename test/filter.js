'use strict';

var expect = require('expect.js');
var Filter = require('../lib/filter');
var Helper = require('../lib/helper');


describe('Filter', function() {

	describe('#getLevelForGroupId()', function() {

		it('returns filter level "info" in default configuration', function() {
			var filterLevel = new Filter(new Helper()).getLevelForGroupId('*');
			expect(filterLevel).to.be.equal('info');
		});

		it('returns filter level which was previously set', function() {
			var filter = new Filter(new Helper());
			filter.setLevelForGroupId('test', 'debug');
			expect(filter.getLevelForGroupId('test')).to.be.equal('debug');
		});

		it('returns undefined for unconfigured levels', function() {
			var filter = new Filter(new Helper());
			expect(filter.getLevelForGroupId('test')).to.be.equal(undefined);
		});
	});

	describe('#getLevels()', function() {

		it('returns configured levels', function() {
			var filter = new Filter(new Helper());
			filter.setLevelForGroupId('test', 'debug');
			filter.setLevelForGroupId('test', 'off');
			filter.setLevelForGroupId('*',    'trace');
			filter.setLevelForGroupId('main', 'info');
			expect(filter.getLevels()).to.be.eql({
				'*':    'trace',
				'main': 'info',
				'test': 'off',
			});
		});
	});

	describe('#parse()', function() {

		it('accepts valid input', function() {
			var filter = new Filter(new Helper());
			filter.parse('*:debug main:debug, test:info;foo=off;');
			expect(filter.getLevels()).to.be.eql({
				'*':    'debug',
				'main': 'debug',
				'test': 'info',
				'foo':  'off',
			});
		});

		it('rejects non-strings', function() {
			var filter = new Filter(new Helper());
			expect(filter.parse.bind(filter)).withArgs(2).to.throwError();
		});

		it('rejects invalid syntax', function() {
			var filter = new Filter(new Helper());
			expect(filter.parse.bind(filter)).withArgs('* debug').to.throwError();
		});

		it('rejects invalid group IDs', function() {
			var filter = new Filter(new Helper());
			expect(filter.parse.bind(filter)).withArgs('test..test:debug').to.throwError();
		});

		it('rejects invalid levels', function() {
			var filter = new Filter(new Helper());
			expect(filter.parse.bind(filter)).withArgs('test:fail').to.throwError();
		});
	});

	describe('#resolveLevelForGroupId()', function() {

		it('resolves full match', function() {
			var filter = new Filter(new Helper());
			filter.setLevelForGroupId('main.exact.match', 'debug');
			expect(filter.resolveLevelForGroupId('main.exact.match')).to.be.equal('debug');
		});

		it('resolves hierarchical match', function() {
			var filter = new Filter(new Helper());
			filter.setLevelForGroupId('main.partial', 'debug');
			expect(filter.resolveLevelForGroupId('main.partial.match')).to.be.equal('debug');
		});

		it('falls back to root', function() {
			var filter = new Filter(new Helper());
			filter.setLevelForGroupId('*', 'debug');
			expect(filter.resolveLevelForGroupId('not.found')).to.be.equal('debug');
		});

		it('treats falsy input as "unknown" group ID', function() {
			var filter = new Filter(new Helper());
			filter.setLevelForGroupId('unknown', 'debug');
			expect(filter.resolveLevelForGroupId(undefined)).to.be.equal('debug');
		});
	});

	describe('#reset()', function() {

		it('resets everything', function() {
			var filter = new Filter(new Helper(), 'debug');
			filter.setLevelForGroupId('*', 'info');
			filter.setLevelForGroupId('main', 'debug');
			filter.reset();
			expect(filter.getLevels()).to.be.eql({ '*': 'debug' });
		});
	});

	describe('#setLevelForGroupId()', function() {

		it('set root level to "debug"', function() {
			var filter = new Filter(new Helper());
			filter.setLevelForGroupId('*', 'debug');
			expect(filter.getLevelForGroupId('*')).to.be.equal('debug');
		});

		it('set root level to "off"', function() {
			var filter = new Filter(new Helper());
			filter.setLevelForGroupId('*', 'off');
			expect(filter.getLevelForGroupId('*')).to.be.equal('off');
		});

		it('set root level to undefined should fail', function() {
			var filter = new Filter(new Helper());
			expect(filter.setLevelForGroupId.bind(filter)).withArgs('*', undefined).to.throwError();
		});

		it('set root level to an unknown value should fail', function() {
			var filter = new Filter(new Helper());
			expect(filter.setLevelForGroupId.bind(filter)).withArgs('*', 'foo').to.throwError();
		});

		it('set level for group ID to "debug"', function() {
			var filter = new Filter(new Helper());
			filter.setLevelForGroupId('test', 'debug');
			expect(filter.getLevelForGroupId('test')).to.be.equal('debug');
		});

		it('set level for group ID to "off"', function() {
			var filter = new Filter(new Helper());
			filter.setLevelForGroupId('test', 'off');
			expect(filter.getLevelForGroupId('test')).to.be.equal('off');
		});

		it('set level for group ID to undefined', function() {
			var filter = new Filter(new Helper());
			filter.setLevelForGroupId('test', 'off');
			filter.setLevelForGroupId('test', undefined);
			expect(filter.getLevelForGroupId('test')).to.be.equal(undefined);
		});

		it('set level for group ID to an unknown value should fail', function() {
			var filter = new Filter(new Helper());
			expect(filter.setLevelForGroupId.bind(filter)).withArgs('test', 'foo').to.throwError();
		});

		it('set level for an invalid group ID should fail', function() {
			var filter = new Filter(new Helper());
			expect(filter.setLevelForGroupId.bind(filter)).withArgs('test#invalid', 'debug').to.throwError();
		});
	});
});
