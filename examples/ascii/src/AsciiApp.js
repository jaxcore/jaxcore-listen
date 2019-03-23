import React, {Component} from 'react';
import Jaxcore, {Spin, Listen, MonauralScope} from 'jaxcore-client';

import Speak from "jaxcore-speak";
import en from "jaxcore-speak/voices/en/en.json";

import chess from './vocabularies/chess.json';

import ascii from './ascii.json';

global.ascii = ascii;

const asciiWords = [];
global.asciiWords = asciiWords;

function sortWordLength(a, b) {
	
	if (a[0].length === b[0].length) {
		return parseInt(a[1]) > parseInt(b[1]);
	}
	return a[0].length < b[0].length ? 1 : -1;
}

function processAscii() {
	let dec, ch, words;
	for (dec in ascii) {
		ch = ascii[dec][0];
		words = ascii[dec][1];
		dec = parseInt(dec);
		if (dec >= 65 && dec <= 90) { // A-Z
			let lch = ch.toLowerCase();
			let letter = dec + 32;
			let letterwords = ascii[letter][1];
			letterwords.forEach((lw) => {
				words.unshift("upper case " + lw);
				words.unshift("capital " + lw);
			});
			// words = words.concat(letterwords);
			// words.unshift("uppercase " + lch);
			words.unshift("upper case " + lch);
			words.unshift("capital " + lch);
		} else if (dec >= 97 && dec <= 122) { // a-z
			// words.unshift("lowercase " + ch);
			words.unshift("letter " + ch);
			words.unshift("lower case " + ch);
			words.unshift(ch);
		}
		if (words.length === 0) {
			asciiWords.push([ch, dec]);
		} else {
			words.forEach(function (word) {
				asciiWords.push([word, dec]);
			});
		}
	}
	asciiWords.sort(sortWordLength);
}

processAscii();


function processText(text) {
	let index = null;
	
	let w;
	let strIndex;
	for (let i = 0; i < asciiWords.length; i++) {
		w = asciiWords[i][0];
		
		
		let same = false;
		if (text === w) {
			index = i;
			strIndex = 0;
			same = true;
			break;
		} else {
			let reg = new RegExp("^" + w + " | " + w + " | " + w + "$");
			let m = text.match(reg);
			if (m) {
				index = i;
				strIndex = m.index;
				break;
			}
		}
	}
	if (index !== null) {
		let found = asciiWords[index][0];
		let dec = asciiWords[index][1];
		let ch = ascii[dec][0];
		let before = text.substring(0, strIndex);
		let after = text.substring(strIndex + found.length + 1);
		let ret = []; //b,found,a];
		let b = processText(before);
		let a = processText(after);
		
		if (b) ret.push(b);
		
		ret.push(dec);
		
		if (a) ret.push(a);
		let r = ret.flat();
		return r;
	} else {
		//
	}
}

global.processText = processText;

Speak.addLanguages(en);

let voice = new Speak({language: 'en/en', profile: 'Jack'});
global.voice = voice;

class AsciiApp extends Component {
	constructor() {
		super();
		this.numSpins = 0;
		this.firstRecognition = true;
		this.isRecording = true;
		this.inputRef = React.createRef();
		this.state = {
			mouseSelected: null,
			recognizedChars: [],
			text: '',
			recognizedText: ''
		};
		
		this.speakScopeRef = React.createRef();
		this.listenScopeRef = React.createRef();
		
		global.app = this;
	}
	
	componentDidMount() {
		this.speakScope = new MonauralScope(this.speakScopeRef.current, {
			lineWidth: 1,
			strokeColor: '#FF0000',
			fillColor: 'rgba(255,0,0,0.1)',
			bgFillColor: 'rgba(180,64,64,0.05)',
			dotColor: '#FF0000',
			dotSize: 2,
			background: null
		});
		this.speakScope.draw();
		voice.setVisualizer(this.speakScope);
		
		this.listenScope = new MonauralScope(this.listenScopeRef.current, {
			lineWidth: 1,
			strokeColor: '#0000FF',
			fillColor: 'rgba(0,0,255,0.1)',
			bgFillColor: 'rgba(64,64,180,0.05)',
			dotColor: '#0000FF',
			dotSize: 2,
			background: null,
			selectedProcessor: 'ascii'
		});
		this.listenScope.draw();
		
		window.addEventListener('keydown', (e) => {
			if (e.keyCode === 32) {
				e.preventDefault();
				this.startRecording();
			}
			// console.log('d', e.keyCode);
			
		});
		window.addEventListener('keyup', (e) => {
			if (e.keyCode === 32) {
				e.preventDefault();
				this.stopRecording();
			}
		});
		
		Listen.on('recognized', (text) => {
			console.log('recognized:', text);
			this.receiveText(text);
		});
		
		Spin.connectAll((spin) => {
			console.log('connected', spin);
			
			this.numSpins++;
			
			voice.speak('Connected Spin ' + this.numSpins);
			
			spin.on('knob', (pushed) => {
				voice.speak('knob ' + (pushed ? 'pushed' : 'released'));
			});
			
			spin.on('button', (pushed) => {
				if (pushed) {
					if (this.firstRecognition) {
						this.firstRecognition = false;
						voice.speak('voice recognition activating').then(() => {
							this.startRecording();
						});
					} else {
						this.startRecording();
					}
				} else {
					this.stopRecording();
				}
			});
		});
	}
	
	receiveText(text) {
		let recognizedChars = processText(text);
		if (!recognizedChars) recognizedChars = [];
		this.setState({
			recognizedText: text,
			recognizedChars
		});
	}
	
	render() {
		return (
			<div>
				<div className="panel">
					Recognized Text: {this.state.recognizedText}
					<br/>
					Processed Characters : {this.state.recognizedChars.map((dec) => {
					return ascii[dec][0];
				}).join(' ')}
					<select class="selectedProcessor" value={this.state.selectedProcessor} onChange={e=>this.changeProcessor(e)}>
						<option value="ascii">ascii</option>
						<option value="chess">chess</option>
					</select>
					<canvas id="speak" ref={this.speakScopeRef} width="70" height="70"/>
					<canvas id="listen" ref={this.listenScopeRef} width="70" height="70"/>
				</div>
				
				{this.renderTable()}
			
			</div>
		);
	}
	
	changeProcessor(e) {
		let selectedProcessor = e.target.options[e.target.selectedIndex].value;
		this.setState({
			selectedProcessor
		});
	}
	
	onChangeText(e) {
		this.setState({
			text: e.target.value
		});
	}
	
	renderTable() {
		if (this.state.selectedProcessor === 'ascii') return this.renderAscii();
		else {
			let data = chess;
			let rows = data.map((line,i) => {
				let tds = line.map((word,j) => {
					return (<td key={j}>{word}</td>);
				})
				return (<tr key={i}>
					{tds}
				</tr>);
			});
			return (<table>
				<tbody className="header">
				<tr className="header">
					<th className="dec">target</th>
					<th className="words" colSpan="6">words</th>
				</tr>
				</tbody>
				<tbody>
				{rows}
				</tbody>
			</table>);
		}
	}
	
	renderAscii() {
		
		let i = 0;
		let words;
		let rows = [];
		let a;
		for (let dec in ascii) {
			a = ascii[dec][0];
			words = ascii[dec][1];
			
			let clss = '';
			if (this.state.mouseSelected === i) clss += 'mouseSelected ';
			if (this.state.recognizedChars.indexOf(i) > -1) clss += 'voiceSelected';
			
			let wordElms = [];
			
			let rowi = i;
			words.forEach((word, index) => {
				wordElms.push(<a key={index} href="/" onClick={e => this.clickRow(e, rowi, a, word)}>
					{word}
				</a>);
			});
			
			let words2 = [];
			wordElms.forEach((w, i) => {
				words2.push(w);
				if (i < words.length - 1) {
					words2.push((<span key={'s_' + i}>{' '}/{' '}</span>));
				}
			});
			
			let firstWord = words[0];
			rows.push(<tr key={i} className={clss} onClick={e => this.clickRow(e, rowi, a, firstWord)}>
				<td className="dec">{dec}</td>
				<td className="char">{a}</td>
				<td>{words2}</td>
			</tr>);
			
			i++;
		}
		
		return (<table>
			<tbody className="header">
			<tr className="header">
				<th className="dec">dec</th>
				<th className="char">char</th>
				<th className="words" colSpan="6">words</th>
			</tr>
			</tbody>
			<tbody>
			{rows}
			</tbody>
		</table>);
	}
	
	clickRow(e, i, a, word) {
		e.preventDefault();
		e.stopPropagation();
		this.setState({
			mouseSelected: i
		});
		if (!word) {
			word = a;
			if (/[A-Z]/.test(word)) {
				word = "uppercase " + word;
			} else if (/[a-z]/.test(word)) {
				word = "letter " + word;
			}
		}
		
		voice.speak(word);
	}
	
	startRecording() {
		if (!this.state.isRecording) {
			Listen.start();
			this.listenScope.startRecording();
			this.setState({
				isRecording: true,
				recognizedText: '',
				recognizedChars: [],
			});
		}
	}
	
	stopRecording() {
		if (this.state.isRecording) {
			Listen.stop();
			this.listenScope.stopRecording();
			this.setState({
				isRecording: false
			});
		}
	}
}

export default AsciiApp;
