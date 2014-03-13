'use strict';

var Filter = module.exports = exports = function Filter(helper, initialRootLevel) {
	this.helper = helper;
	this.initialRootLevel = initialRootLevel || 'info';
	this.levels = { '*': this.initialRootLevel };
};


Filter.prototype.getLevelForGroupId = function getLevelForGroupId(groupId) {
	return this.levels[groupId];
};


Filter.prototype.getLevels = function getLevels() {
	return this.levels;
};


Filter.prototype.parse = function parse(value) {
	if (!value) {
		return;
	}

	if (typeof value !== 'string') {
		throw new Error('cannot parse "' + value + '"');
	}

	var self = this;
	value.split(/[,;\s]+/).forEach(function(entry) {
		if (!entry.length) {
			return;
		}

		var elements = entry.split(/[:=]/);
		try {
			if (elements.length !== 2) {
				throw new Error('wrong syntax; expected "a.b.c=level or a.b.c:level"');
			}

			self.setLevelForGroupId(elements[0], elements[1]);
		}
		catch (e) {
			throw new Error('invalid entry "' + entry + '" (' + e.message + ').');
		}
	});
};


Filter.prototype.reset = function reset() {
	this.levels = { '*': this.initialRootLevel };
};


Filter.prototype.resolveLevelForGroupId = function resolveLevelForGroupId(groupId) {
	groupId = groupId || 'unknown';

	var list = this.levels;
	if (groupId in list) {
		return list[groupId];
	}

	var parentGroupId = groupId;
	for (var dotIndex = parentGroupId.lastIndexOf('.'); dotIndex >= 0; dotIndex = parentGroupId.lastIndexOf('.')) {
		parentGroupId = parentGroupId.substring(0, dotIndex);
		if (parentGroupId in list) {
			return list[parentGroupId];
		}
	}

	return list['*'];
};


Filter.prototype.setLevelForGroupId = function setLevelForGroupId(groupId, level) {
	var helper = this.helper;
	if (groupId !== '*' && !helper.isValidGroupId(groupId)) {
		throw new Error('invalid group id "' + groupId + '"');
	}

	if (level !== undefined) {
		if (level !== 'off' && !helper.isValidLevel(level)) {
			throw new Error('invalid level "' + level + '"');
		}

		this.levels[groupId] = level;
	}
	else {
		if (groupId === '*') {
			throw new Error('group id "*" must have a value');
		}

		delete this.levels[groupId];
	}
};
