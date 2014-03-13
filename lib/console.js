'use strict';

var Helper = require('./helper');


var Console = module.exports = exports = function Console(options) {
	this._helper = new Helper(options);
};


Console.prototype.config = function config(value) {
	this._helper.config(value);
};


Console.prototype.eventEnabled = function eventEnabled(event) {
	if (!event.callee) {
		event.callee = eventEnabled;
	}

	return this._helper.eventIsEnabled(event);
};


Console.prototype.putEvent = function putEvent(event) {
	if (!event.callee) {
		event.callee = putEvent;
	}

	var helper = this._helper;
	if (!helper.eventIsEnabled(event)) {
		return;
	}

	var date = helper.formattedDateForEvent(event);
	var level = helper.formattedLevelForEvent(event);
	var message = helper.formattedMessageForEvent(event);
	var output = helper.outputForEvent(event);

	output.write(date);
	output.write(' | ');
	output.write(level);
	output.write(' | ');
	output.write(message);
	output.write('\n');
};
