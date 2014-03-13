'use strict';

var Filter = require('./filter');
var Path = require('path');
var Util = require('util');


var Helper = module.exports = exports = function Helper(options) {
	this.derivesGroupIdFromStack = 'supportive';

	this.filter = new Filter(this);
	try {
		this.filter.parse(process.env.UNILOG);
	}
	catch (e) {
		this.logInternal('Error in environment variable "UNILOG": ', e.message);
	}

	this.mainPath = Path.dirname(require.main.filename).replace(/[/\\]node_modules([/\\].*)?$/, '');

	this.config(options);
};


Helper.prototype.config = function config(value) {
	if (!value) {
		return;
	}

	if ('derivesGroupIdFromStack' in value) {
		switch (value.derivesGroupIdFromStack) {
			case 'always':
			case 'supportive':
				this.derivesGroupIdFromStack = value.derivesGroupIdFromStack;
				break;

			default:
				this.derivesGroupIdFromStack = false;
		}
	}

	if (value.resetLevels) {
		this.filter.reset();
	}

	var levels = value.levels;
	if (typeof levels === 'string') {
		this.filter.parse(value.levels);
	}
	else if (typeof levels === 'object') {
		var filter = this.filter;
		Object.keys(levels).forEach(function(groupId) {
			filter.setLevelForGroupId(groupId, levels[groupId]);
		});
	}

	var mainPath = value.mainPath;
	if (mainPath) {
		if (mainPath.filename) {
			mainPath = Path.dirname(mainPath.filename);
		}
		if (typeof mainPath === 'string') {
			this.mainPath = mainPath.replace(/[/\\]+$/, '');
		}
	}
};


Helper.prototype.dateForEvent = function dateForEvent(event) {
	return event.date || (event.date = new Date());
};


Helper.prototype.eventIsEnabled = function eventIsEnabled(event) {
	var enabled = event._enabled;
	if (enabled === true || enabled === false) {
		return enabled;
	}

	var groupId = this.groupIdForEvent(event);
	var levelPriority = _priorityByLevel[event.level];
	var levelForGroupId = this.filter.resolveLevelForGroupId(groupId);

	if (levelForGroupId === 'off') {
		enabled = false;
	}
	else if (levelPriority) {
		var levelPriorityForGroupId = _priorityByLevel[levelForGroupId];
		enabled = (levelPriority >= levelPriorityForGroupId);
	}
	else {
		// always log unknown levels (unless filter is set to 'off') - that's not our problem
		enabled = true;
	}

	return (event._enabled = enabled);
};


Helper.prototype.filePathForEvent = function filePathForEvent(event, captureStackIfNecessary) {
	if (event.filePath) {
		return event.filePath;
	}

	var stack = event.stack;
	if (!stack && !event.module && captureStackIfNecessary) {
		stack = this.stackForEvent(event);
	}

	if (stack && stack.length) {
		var lastFrame = stack[0];
		event.filePath = lastFrame.getFileName();
	}
	else if (event.module) {
		event.filePath = event.module.filename;
	}

	return event.filePath;
};


Helper.prototype.formatDate = function formatDate(date) {
	return date
		.toISOString()
		.replace('T', ' ')
		.replace('Z', '');
};


Helper.prototype.formatMessage = function formatMessage(content) {
	if (Array.isArray(content)) {
		return content.map(this.formatMessageElement).join('');
	}

	return String(content);
};


Helper.prototype.formatMessageElement = function formatMessageElement(element) {
	if (typeof element === 'string') {
		return element;
	}
	if (element instanceof Error) {
		return String(element.stack || element.message || Util.inspect(element));
	}

	return Util.inspect(element);
};


Helper.prototype.formattedDateForEvent = function formattedDateForEvent(event) {
	return event._formattedDate || (event._formattedDate = this.formatDate(this.dateForEvent(event)));
};


Helper.prototype.formattedLevelForEvent = function formattedLevelForEvent(event) {
	return event._formattedLevel || (event._formattedLevel = (_formattedLevelByLevel[event.level] || '?????'));
};


Helper.prototype.formattedMessageForEvent = function formattedMessageForEvent(event) {
	return event._formattedMessage || (event._formattedMessage = this.formatMessage(event.message));
};


Helper.prototype.groupIdForEvent = function groupIdForEvent(event) {
	var derivesFromStack = this.derivesGroupIdFromStack;
	if (derivesFromStack === 'always' && !event._triedDerivingGroupIdFromStack) {
		event._triedDerivingGroupIdFromStack = true;

		var groupId = this.groupIdForFilePath(this.filePathForEvent(event, true));
		if (groupId) {
			return (event.groupId = groupId);
		}
	}

	if (event.groupId) {
		return event.groupId;
	}

	if (event.module) {
		event.groupId = this.groupIdForModule(event.module);
		if (event.groupId) {
			return event.groupId;
		}
	}

	var filePath = this.filePathForEvent(event, derivesFromStack === 'supportive');
	return (event.groupId = (this.groupIdForFilePath(filePath) || 'unknown'));
};


Helper.prototype.groupIdForFilePath = function groupIdForFilePath(filePath) {
	if (typeof filePath !== 'string' || filePath.length === 0) {
		return null;
	}

	var filePathWithoutExtension = filePath.replace(/\.[^/.]*$/, '');
	var relativePathWithoutExtension = Path.relative(this.mainPath, filePathWithoutExtension);
	var groupIdComponents = relativePathWithoutExtension.split(/[/\\]/);

	var nodeModulesIndex = groupIdComponents.lastIndexOf('node_modules');
	if (nodeModulesIndex >= 0) {
		groupIdComponents = groupIdComponents.slice(nodeModulesIndex + 1);
	}
	else {
		var upIndex = groupIdComponents.lastIndexOf('..');
		if (upIndex >= 0) {
			groupIdComponents = groupIdComponents.slice(upIndex + 1);
			groupIdComponents.unshift('other');
		}
		else if (groupIdComponents[0].match(/^[a-zA-Z]:$/)) {
			groupIdComponents[0] = 'other';
		}
		else {
			groupIdComponents.unshift('main');
		}
	}

	return groupIdComponents.map(this.sanitizeGroupIdComponent).join('.');
};


Helper.prototype.groupIdForModule = function groupIdForModule(mod) {
	if (mod._unilog_console_groupId) {
		return mod._unilog_console_groupId;
	}

	return (mod._unilog_console_groupId = this.groupIdForFilePath(mod.filename));
};


Helper.prototype.isValidGroupId = function isValidGroupId(groupId) {
	return !!(typeof groupId === 'string' && groupId.match(/^([a-z0-9_-]+\.)*[a-z0-9_-]+$/i));
};


Helper.prototype.isValidLevel = function isValidLevel(level) {
	return !!_priorityByLevel[level];
};


Helper.prototype.logInternal = function logInternal() {
	var output = process.stderr;
	output.write('(unilog-console) ');
	output.write(this.formatMessage(Array.prototype.slice.call(arguments)));
	output.write('\n');
};


Helper.prototype.outputForEvent = function outputForEvent(event) {
	return event._output || (event._output = (_outputByLevel[event.level] || process.stderr));
};


Helper.prototype.sanitizeGroupIdComponent = function sanitizeGroupIdComponent(groupIdComponent) {
	if (!groupIdComponent) {
		return null;
	}

	return String(groupIdComponent).replace(/[^a-z0-9_-]/gi, '_').replace(/^_+|_+$|(_)_+/g, '$1') || '_';
};


// see https://code.google.com/p/v8/wiki/JavaScriptStackTraceApi
Helper.prototype.stack = function stack(beginningFrameFunction) {
	var originalStackTrackLimit = Error.stackTraceLimit;
	var originalPrepareStackTrace = Error.prepareStackTrace;

	try {
		Error.stackTraceLimit = Infinity;
		Error.prepareStackTrace = function prepareStackTrace(dummy, stack) {
			return stack;
		};

		var dummy = {};
		Error.captureStackTrace(dummy, beginningFrameFunction || stack);
		return dummy.stack;
	}
	finally {
		Error.prepareStackTrace = originalPrepareStackTrace;
		Error.stackTraceLimit = originalStackTrackLimit;
	}
};


Helper.prototype.stackForEvent = function stackForEvent(event) {
	return (event.stack || (event.stack = (event.callee && this.stack(event.callee) || undefined)));
};



var _formattedLevelByLevel = {
	fatal: 'FATAL',
	error: 'ERROR',
	warn:  ' WARN',
	info:  ' INFO',
	debug: 'DEBUG',
	trace: 'TRACE',
};


var _outputByLevel = {
	fatal: process.stderr,
	error: process.stderr,
	warn:  process.stderr,
	info:  process.stdout,
	debug: process.stdout,
	trace: process.stdout,
};


var _priorityByLevel = {
	fatal: 6,
	error: 5,
	warn:  4,
	info:  3,
	debug: 2,
	trace: 1,
};
