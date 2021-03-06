let Speech = require('../../lib/speech');

let speech = new Speech({
	models: {
		english: {
			path: __dirname + '/../../deepspeech-0.6.0-models'
		}
	}
});

speech.on('recognize', function (text) {
	console.log('Recognized Text:', text);
});

speech.on('start-continuous', function () {
	console.log('start-continuous');
});

speech.on('stop-continuous', function () {
	console.log('stop-continuous');
});

const readline = require('readline').createInterface({
	input: process.stdin,
	output: process.stdout
});

function continuousLoop() {
	console.log('\nPress Ctrl-C to exit at any time.');
	
	readline.question('\nPress ENTER to start continuous recording.\n', (name) => {
		
		readline.question('Press ENTER to stop.\n', (name) => {
			
			console.log('Stopping continuous recording.');
			
			speech.stopContinuous();
			
			setTimeout(continuousLoop, 1000);
		});
		
		// todo: fix continuousRecorder already started
		speech.startContinuous();
		
	});
}

process.stdin.resume();

continuousLoop();
