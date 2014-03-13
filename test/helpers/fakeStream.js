'use strict';

module.exports = exports = {
	err: fakeStream.bind(null, 'stderr'),
	out: fakeStream.bind(null, 'stdout'),
};


function fakeStream(streamName, task, result) {
	var originalWrite = process[streamName].write;
	var output = '';

	process[streamName].write = function fakeWrite(string) {
		output += string;
	};

	try {
		task();
	}
	finally {
		process[streamName].write = originalWrite;
	}

	result(output);
}
