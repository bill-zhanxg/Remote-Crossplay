'use strict';

refreshSettingPresets();

document.querySelectorAll('.collapsible').forEach((element) => {
	let finished = true;
	element.addEventListener('click', function () {
		this.classList.toggle('active');
		const attr = this.getAttribute('open');
		const content = attr ? document.getElementById(attr) : this.nextElementSibling;
		if (content.style.maxHeight) {
			finished = true;
			content.style.maxHeight = content.scrollHeight + 'px';
			setTimeout(() => (content.style.maxHeight = null), 0);
		} else {
			content.style.maxHeight = content.scrollHeight + 'px';
			finished = false;
			setTimeout(() => {
				if (!finished) content.style.maxHeight = 'initial';
			}, 300);
		}
	});
});

document.querySelectorAll('input[type="checkbox"]').forEach((element) => {
	const mouseAttr = element.getAttribute('mouse');
	const keyAttr = element.getAttribute('key');
	const setting = element.getAttribute('setting');
	const button = element.parentNode.parentNode.querySelector('button');
	const children =
		keyAttr || !button
			? null
			: document
					.getElementById(button.getAttribute('open'))
					.querySelectorAll(':scope > div > label > input[type="checkbox"]');

	element.addEventListener('change', () => {
		if (mouseAttr) window.settingActions.mouse(!element.checked, parseInt(mouseAttr));
		else if (keyAttr) window.settingActions.key(!element.checked, parseInt(keyAttr));
		else if (setting) {
			// Backup methods, probably never going to use it
		} else if (children) {
			children.forEach((child) => {
				if (child.checked !== element.checked) {
					child.checked = element.checked;
					child.dispatchEvent(new Event('change'));
				}
			});
		}

		try {
			let current = element;
			let target = document
				.querySelector(`button[open=${element.parentNode.parentNode.parentNode.id}]`)
				.parentNode.querySelector('input[type="checkbox"]');
			while (true) {
				const check = Array.from(
					current.parentNode.parentNode.parentNode.querySelectorAll('input[type="checkbox"]'),
				).some((otherElement) => (current.checked ? !otherElement.checked : otherElement.checked));
				if ((current.checked || !(current.checked || check)) && target && target.checked !== current.checked)
					target.checked = element.checked;
				current = target;
				target = document
					.querySelector(`button[open=${target.parentNode.parentNode.parentNode.id}]`)
					.parentNode.querySelector('input[type="checkbox"]');
			}
		} catch {}
	});
});

const placeholderText = 'No Keybind Set';
const modifiers = ['Control', 'Shift', 'Alt', 'Meta'];
document.querySelectorAll('.keybind').forEach(
	(
		/**
		 * @type {HTMLElement}
		 */
		element,
	) => {
		const keybind = element.getAttribute('keybind');
		let keyPressed = [];
		element.addEventListener('focusin', () => {
			element.removeAttribute('placeholder');
			addListeners();
		});
		element.addEventListener('focusout', () => {
			element.setAttribute('placeholder', placeholderText);
			stopListening();
		});

		function onkeydown(event) {
			event.preventDefault();
			if (event.key === 'Escape') return stopListening(true);
			if (keyPressed[keyPressed.length - 1] !== event.key) keyPressed.push(event.key);
		}

		function addListeners() {
			element.addEventListener('keydown', onkeydown);
			element.addEventListener('keyup', stopListening);
		}

		function stopListening(remove) {
			if (remove === true) {
				element.value = null;
				window.settingActions.keybind(keybind, null);
			} else {
				if (keyPressed.length < 1) return;
				if (keyPressed.length === 1 && modifiers.includes(keyPressed[0]))
					alert('Please avoid using a modifier key as a global shortcut.');
				else {
					keyPressed.sort((a, b) => {
						let first;
						let second;
						modifiers.forEach((key, index) => {
							if (a === key) first = { key, index };
							if (b === key) second = { key, index };
						});
						return second?.index < first?.index ? 0 : first ? -1 : second ? 1 : 0;
					});
					const value = keyPressed.join(' + ').toUpperCase();
					element.value = value;
					window.settingActions.keybind(keybind, value);
				}
			}
			keyPressed = [];
			element.removeEventListener('keydown', onkeydown);
			element.removeEventListener('keyup', stopListening);
			element.blur();
		}
	},
);

window.settingActions.triggerKeybind((keybind) => {
	const element = document.querySelector(`input[bindkey=${keybind}]`);
	if (element) {
		element.checked = !element.checked;
		element.dispatchEvent(new Event('change'));
		new Audio(element.checked ? '../enable.mp3' : '../disable.mp3').play();
	}
});

const save = document.getElementById('save');
const video = document.getElementById('video');
window.mainActions.minimize(() => {
	video.classList.add('hidden');
	save.classList.remove('hidden');
});
window.mainActions.restore(() => {
	save.classList.add('hidden');
	video.classList.remove('hidden');
});

window.dataActions.getHostData().then(
	(
		/**
		 * @type {{
		 * 		port: number;
		 * 		key: string;
		 * 		publicIp: string;
		 * 		privateIp: string;
		 * 		portForwardError: string | null;
		 * }}
		 */
		res,
	) => {
		window.alert = window.mainActions.messageBox;

		const peerConfig = {
			iceServers: [
				{ urls: 'stun:stun.bill-zhanxg.com:3478' },
				{
					urls: 'turn:turn.bill-zhanxg.com:5349',
					username: 'guest',
					credential: 'guest',
				},
				// Source: https://www.metered.ca/tools/openrelay/
				{
					urls: 'stun:openrelay.metered.ca:80',
				},
				{
					urls: 'turn:openrelay.metered.ca:80',
					username: 'openrelayproject',
					credential: 'openrelayproject',
				},
				{
					urls: 'turn:openrelay.metered.ca:443',
					username: 'openrelayproject',
					credential: 'openrelayproject',
				},
			],
		};

		document.querySelectorAll('.ip').forEach((element) => (element.innerText = res.publicIp));
		document.querySelectorAll('.privIp').forEach((element) => (element.innerText = res.privateIp));
		document.querySelectorAll('.port').forEach((element) => (element.innerText = res.port));
		if (res.portForwardError === null) document.getElementById('success').classList.remove('hidden');
		else {
			document.getElementById('error').classList.remove('hidden');
			document.querySelectorAll('.reason').forEach((element) => (element.innerText = res.portForwardError));
		}
		document.getElementById('loading').classList.add('hidden');
		document.getElementById('main').classList.remove('hidden');

		/** @type {import('socket.io').Socket<import('types/socket.io').ServerToClientEvents, import('types/socket.io').ClientToServerEvents, import('types/socket.io').InterServerEvents, import('types/socket.io').SocketData>} */
		const socket = io(`http://localhost:${res.port}`, {
			auth: {
				token: res.key,
			},
		});

		navigator.mediaDevices
			.getUserMedia({
				audio: {
					mandatory: {
						chromeMediaSource: 'desktop',
					},
				},
				video: {
					mandatory: {
						chromeMediaSource: 'desktop',
					},
				},
			})
			.then((stream) => {
				video.srcObject = stream;
				const audioTrack = stream.getAudioTracks()[0];
				const videoTrack = stream.getVideoTracks()[0];
				const videoSettings = videoTrack.getSettings();

				// Setup debug setting
				const setMaxValue = (element, maxValue) => {
					element.value = maxValue;
					element.previousElementSibling.setAttribute('max', maxValue);
					element.previousElementSibling.value = maxValue;
				};
				setMaxValue(document.querySelector('.debug-setting[debug=width]'), videoSettings.width);
				setMaxValue(document.querySelector('.debug-setting[debug=fps]'), videoSettings.frameRate);

				connect();
				async function connect() {
					let peerConnection = new RTCPeerConnection(peerConfig);
					stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

					const debugInfo = document.getElementById('debug-info');
					const debugView = document.getElementById('debug-view');
					const disconnectText = document.getElementById('disconnect-text');
					const disconnectBtn = document.getElementById('disconnect-btn');
					const changeText = (text, connected) => {
						disconnectText.innerText = text;
						disconnectText.classList[connected ? 'remove' : 'add']('red');
						disconnectBtn.disabled = !connected;
						debugInfo.classList[connected ? 'add' : 'remove']('hidden');
						debugView.classList[connected ? 'remove' : 'add']('hidden');
					};
					peerConnection.addEventListener('connectionstatechange', () => {
						switch (peerConnection.connectionState) {
							case 'connecting':
								changeText('A user is trying to connect...', true);
								break;
							case 'failed':
								changeText('A user failed to connect.', false);
								break;
							case 'connected':
								changeText('A user is connected!', true);
								break;
							case 'disconnected':
								changeText('The user got disconnected, most likely due to a TURN server restart!', false);
								break;
						}
					});

					peerConnection.addEventListener('icecandidate', (event) => {
						if (event.candidate) socket.emit('candidate', event.candidate);
					});

					socket.on('sessionDescription', (description) => {
						peerConnection.setRemoteDescription(new RTCSessionDescription(description));
					});
					socket.on('candidate', (candidate) => {
						peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
					});

					const offer = await peerConnection.createOffer().catch(() => null);
					if (offer === null)
						return alert('There was an error while creating the offer. Please restart the process and try again.');
					peerConnection.setLocalDescription(offer);
					socket.emit('sessionDescription', offer);

					// Debug handler
					const debugMenu = document.getElementById('debug-menu');
					const localDebug = document.getElementById('local-debug');
					const audioDebug = localDebug.querySelector('.audio');
					const videoDebug = localDebug.querySelector('.video');
					const lastUpdatedDebug = localDebug.querySelector('.lastUpdated');
					const connectedHostDebug = localDebug.querySelector('.connectedHost');
					const candidateTypeDebug = localDebug.querySelector('.candidateType');
					const protocolDebug = localDebug.querySelector('.protocol');
					const bandwidthAudioDebug = audioDebug.querySelector('.bandwidth');
					const bandwidthVideoDebug = videoDebug.querySelector('.bandwidth');
					const frameSizeDebug = videoDebug.querySelector('.frameSize');
					const rawDebug = localDebug.querySelector('.raw');

					const remoteDebug = document.getElementById('remote-debug');
					const audioRemoteDebug = remoteDebug.querySelector('.audio');
					const videoRemoteDebug = remoteDebug.querySelector('.video');
					const lastUpdatedRemoteDebug = remoteDebug.querySelector('.lastUpdated');
					const connectedHostRemoteDebug = remoteDebug.querySelector('.connectedHost');
					const candidateTypeRemoteDebug = remoteDebug.querySelector('.candidateType');
					const protocolRemoteDebug = remoteDebug.querySelector('.protocol');
					const bandwidthAudioRemoteDebug = audioRemoteDebug.querySelector('.bandwidth');
					const codecAudioRemoteDebug = audioRemoteDebug.querySelector('.codec');
					const bandwidthVideoRemoteDebug = videoRemoteDebug.querySelector('.bandwidth');
					const codecVideoRemoteDebug = videoRemoteDebug.querySelector('.codec');
					const frameSizeRemoteDebug = videoRemoteDebug.querySelector('.frameSize');
					const rawRemoteDebug = remoteDebug.querySelector('.raw');

					let previousTimestamp;
					let previousValues = {
						'remote-inbound-rtp': { audio: {}, video: {} },
						'outbound-rtp': { audio: {}, video: {} },
					};
					let previousRemoteTimestamp;
					let previousRemoteValues = { audio: {}, video: {} };
					const debugInterval = setInterval(() => {
						// Check if stats need to be refreshed
						if (!debugMenu.style.maxHeight) return;
						if (localDebug.style.maxHeight) {
							peerConnection.getStats().then((stats) => {
								if (!stats) return;
								let activeCandidatePair;
								let now;
								stats.forEach((stat) => {
									now = stat.timestamp;
									if (stat.type === 'remote-inbound-rtp' || stat.type === 'outbound-rtp') {
										const type = stat.mediaType || stat.kind;
										for (const key in stat) {
											const debugElement = (type === 'audio' ? audioDebug : videoDebug).querySelector(`.${key}`);
											if (debugElement)
												debugElement.innerText = key === 'roundTripTime' ? `${stat[key] * 1000}ms` : stat[key];

											const rateElement = (type === 'audio' ? audioDebug : videoDebug).querySelector(`.${key}-rate`);
											let previousValue;
											Object.keys(previousValues).forEach((key1) =>
												Object.keys(previousValues[key1]).forEach((key2) =>
													Object.keys(previousValues[key1][key2]).forEach((key3) => {
														if (key1 === stat.type && key2 === type && key3 === key)
															previousValue = previousValues[key1][key2][key3];
													}),
												),
											);
											if (rateElement && previousTimestamp && previousValue !== undefined) {
												rateElement.innerText =
													Math.floor((1000 * (stat[key] - previousValue)) / (now - previousTimestamp)) + '/s';
											}
										}
										if (type === 'video') {
											if (stat.frameWidth && stat.frameHeight)
												frameSizeDebug.innerText = `${stat.frameWidth}x${stat.frameHeight}`;
										}

										// Calculate bandwidth
										const element =
											type === 'audio' ? bandwidthAudioDebug : type === 'video' ? bandwidthVideoDebug : null;
										if (previousTimestamp && stat.type === 'outbound-rtp' && element)
											element.innerText = Math.floor(
												(8 *
													(stat.bytesSent +
														stat.headerBytesSent -
														previousValues[stat.type][type].bytesSent -
														previousValues[stat.type][type].headerBytesSent)) /
													(now - previousTimestamp),
											);

										previousValues[stat.type][type] = stat;
									}

									// Search for the candidate pair, spec-way first.
									if (stat.type === 'transport') activeCandidatePair = stats.get(stat.selectedCandidatePairId);
									// Fallback for Firefox.
									if (!activeCandidatePair && stat.type === 'candidate-pair' && stat.selected)
										activeCandidatePair = stat;

									lastUpdatedDebug.innerText = new Date(now).toLocaleTimeString();
								});

								if (activeCandidatePair && activeCandidatePair.remoteCandidateId) {
									const remoteCandidate = stats.get(activeCandidatePair.remoteCandidateId);
									// Figure out the peer's IP
									const connectedHost =
										remoteCandidate.address && remoteCandidate.port
											? `${remoteCandidate.address}:${remoteCandidate.port}`
											: remoteCandidate.ip && remoteCandidate.port
											? `${remoteCandidate.ip}:${remoteCandidate.port}`
											: remoteCandidate.ipAddress && remoteCandidate.portNumber
											? `${remoteCandidate.ipAddress}:${remoteCandidate.portNumber}`
											: null;
									connectedHostDebug.innerText = connectedHost ? connectedHost : 'unknown';

									// Get candidateType
									let candidateType = remoteCandidate.candidateType;
									if (candidateType === 'host') candidateType += ' (Direct Connection)';
									else if (candidateType === 'srflx') candidateType += ' (Through STUN Server)';
									else if (candidateType === 'prflx') candidateType += ' (Peer Connection)';
									else if (candidateType === 'relay') candidateType += ' (Through TURN Server)';
									candidateTypeDebug.innerText = candidateType ? candidateType : 'unknown';

									// Get protocol
									protocolDebug.innerText = remoteCandidate.protocol ? remoteCandidate.protocol : 'unknown';
								}

								rawDebug.innerHTML = dumpStats(stats);
								if (now) previousTimestamp = now;
							});
						}
						if (remoteDebug.style.maxHeight) {
							socket.emit('debug', (stats) => {
								if (!stats) return;
								stats = new Map(Object.entries(stats));

								let activeCandidatePair;
								let now;
								stats.forEach((stat) => {
									now = stat.timestamp;
									if (stat.type === 'inbound-rtp') {
										const type = stat.mediaType || stat.kind;
										for (const key in stat) {
											const debugElement = (type === 'audio' ? audioRemoteDebug : videoRemoteDebug).querySelector(
												`.${key}`,
											);
											if (debugElement) debugElement.innerText = stat[key];

											// Display rates
											const rateElement = (type === 'audio' ? audioRemoteDebug : videoRemoteDebug).querySelector(
												`.${key}-rate`,
											);
											let previousValue;
											Object.keys(previousRemoteValues).forEach((key1) =>
												Object.keys(previousRemoteValues[key1]).forEach((key2) => {
													if (key1 === type && key2 === key) previousValue = previousRemoteValues[key1][key2];
												}),
											);
											if (rateElement && previousRemoteTimestamp && previousValue !== undefined) {
												rateElement.innerText =
													Math.floor((1000 * (stat[key] - previousValue)) / (now - previousRemoteTimestamp)) + '/s';
											}
										}
										if (type === 'video' && stat.frameWidth && stat.frameHeight)
											frameSizeRemoteDebug.innerText = `${stat.frameWidth}x${stat.frameHeight}`;

										// Calculate bandwidth
										if (previousRemoteTimestamp)
											(type === 'audio' ? bandwidthAudioRemoteDebug : bandwidthVideoRemoteDebug).innerText = Math.floor(
												(8 *
													(stat.bytesReceived +
														stat.headerBytesReceived -
														previousRemoteValues[type].bytesReceived -
														previousRemoteValues[type].headerBytesReceived)) /
													(now - previousRemoteTimestamp),
											);

										previousRemoteValues[type] = stat;
									}

									// Display codec
									if (stat.type === 'codec') {
										const mineType = stat.mimeType.split('/');
										const element = mineType[0] === 'audio' ? codecAudioRemoteDebug : codecVideoRemoteDebug;
										element.innerText = mineType[1];
									}

									// Search for the candidate pair, spec-way first.
									if (stat.type === 'transport') activeCandidatePair = stats.get(stat.selectedCandidatePairId);
									// Fallback for Firefox.
									if (!activeCandidatePair && stat.type === 'candidate-pair' && stat.selected)
										activeCandidatePair = stat;

									lastUpdatedRemoteDebug.innerText = new Date(now).toLocaleTimeString();
								});

								if (activeCandidatePair && activeCandidatePair.remoteCandidateId) {
									const remoteCandidate = stats.get(activeCandidatePair.remoteCandidateId);

									// Figure out the peer's IP
									const connectedHost =
										remoteCandidate.address && remoteCandidate.port
											? `${remoteCandidate.address}:${remoteCandidate.port}`
											: remoteCandidate.ip && remoteCandidate.port
											? `${remoteCandidate.ip}:${remoteCandidate.port}`
											: remoteCandidate.ipAddress && remoteCandidate.portNumber
											? `${remoteCandidate.ipAddress}:${remoteCandidate.portNumber}`
											: null;
									connectedHostRemoteDebug.innerText = connectedHost ? connectedHost : 'unknown';

									// Get candidateType
									let candidateType = remoteCandidate.candidateType;
									if (candidateType === 'host') candidateType += ' (Direct Connection)';
									else if (candidateType === 'srflx') candidateType += ' (Through STUN Server)';
									else if (candidateType === 'prflx') candidateType += ' (Peer Connection)';
									else if (candidateType === 'relay') candidateType += ' (Through TURN Server)';
									candidateTypeRemoteDebug.innerText = candidateType ? candidateType : 'unknown';

									// Get protocol
									protocolRemoteDebug.innerText = remoteCandidate.protocol ? remoteCandidate.protocol : 'unknown';
								}

								rawRemoteDebug.innerHTML = dumpStats(stats);
								if (now) previousRemoteTimestamp = now;
							});
						}
					}, 1000);
					socket.on('debug', async (callback) =>
						peerConnection.getStats().then((stats) => callback(Object.fromEntries(stats))),
					);

					function dumpStats(results) {
						let statsString = '';
						results.forEach((res) => {
							statsString += `
								<h3>Report type=${res.type}</h3>
								id: ${res.id}<br>
								time: ${res.timestamp}<br>
							`;
							Object.keys(res).forEach((key) => {
								if (key !== 'type' && key !== 'id' && key !== 'timestamp') {
									if (typeof res[key] === 'object') statsString += `${key}: ${JSON.stringify(res[key])}<br>`;
									else statsString += `${key}: ${res[key]}<br>`;
								}
							});
						});
						return statsString;
					}

					// Debug Settings handler
					audioTrack.applyConstraints({ latency: { exact: 0.001 } }).catch(() => {});
					videoTrack.applyConstraints({ latency: { exact: 0.001 } }).catch(() => {});

					document.querySelectorAll('.debug-setting').forEach((element) => {
						const audioSender = peerConnection.getSenders()[0];
						const videoSender = peerConnection.getSenders()[1];
						const attribute = element.getAttribute('debug');
						const debugType = element.getAttribute('debug-type') ? true : false;
						const changeState = (disabled) => {
							element.disabled = disabled;
							if (element.previousElementSibling) element.previousElementSibling.disabled = disabled;
							return true;
						};
						element.onchange = () => {
							if (!peerConnection || element.disabled) return;
							changeState(true);
							let value = parseInt(element.value);
							if (isNaN(value)) value = 0;
							if (element.type !== 'checkbox')
								value = Math.max(
									Math.min(value, parseInt(element.previousElementSibling.max) || value),
									parseInt(element.previousElementSibling.min),
								);
							const onError = () =>
								changeState(false) && alert(`There was an error when trying to change the ${attribute}.`);

							if (debugType) {
								const type = attribute.split('-');
								const sender = type[0] === 'audio' ? audioSender : videoSender;
								const parameters = sender.getParameters();
								let encoding = parameters.encodings[0];
								if (!encoding) encoding = {};
								let newValue;
								switch (type[1]) {
									case 'active':
										newValue = element.checked;
										break;
									case 'maxBitrate':
										newValue = value * 1000;
										break;
								}

								if (newValue === undefined) return;
								if (newValue === true || value === parseInt(element.previousElementSibling?.max))
									delete encoding[type[1]];
								else encoding[type[1]] = newValue;

								parameters.encodings[0] = encoding;
								sender
									.setParameters(parameters)
									.then(() => changeState(false))
									.catch(onError);
							} else {
								/**
								 * @type {MediaTrackConstraints}
								 */
								let constraints = videoTrack.getConstraints();
								if (attribute === 'width') constraints = { ...constraints, width: { exact: value } };
								else if (attribute === 'fps') constraints = { ...constraints, frameRate: { max: value } };
								if (constraints)
									videoTrack
										.applyConstraints(constraints)
										.then(() => changeState(false))
										.catch(onError);
							}
							element.value = value;
							if (element.previousElementSibling) element.previousElementSibling.value = value;
						};
						element.dispatchEvent(new Event('change'));
						changeState(false);
					});

					disconnectBtn.addEventListener('click', disconnect);
					socket.on('disconnection', disconnect);

					function disconnect() {
						socket.emit('disconnection');
						changeText('The other player has exited the session.', false);
						document.querySelectorAll('.debug-setting').forEach((element) => {
							element.disabled = true;
							if (element.type !== 'checkbox') element.previousElementSibling.disabled = true;
						});
						peerConnection?.close();
						peerConnection = null;
						socket.removeAllListeners('sessionDescription');
						socket.removeAllListeners('candidate');
						socket.removeAllListeners('debug');
						socket.removeAllListeners('disconnection');
						clearInterval(debugInterval);
						connect();
					}
				}
			})
			.catch((err) => {
				if (err.message === 'Permission denied') alert('Please grant access to your screen and restart.');
				else if (err.message === 'Requested device not found') alert('Please ensure that your screen is connected.');
				else alert(err.message);
			});
	},
);

function getSettingPresetKey() {
	return 'setting-preset';
}
function savePreset() {
	document.getElementById('save-preset').disabled = true;
	const presetName = document.getElementById('preset-name');
	if (!presetName.value.trim()) return;
	const allInputs = Array.from(document.querySelectorAll('input'));
	const allDisabledInputs = allInputs.filter((input) => input.type === 'checkbox' && !input.checked);
	const mouse = [];
	const keys = [];
	const keybinds = [];
	const debug = [];
	allDisabledInputs.forEach((input) => {
		const mouseAttr = input.getAttribute('mouse');
		const keyAttr = input.getAttribute('key');
		const debugAttr = input.getAttribute('debug');
		if (mouseAttr) mouse.push(parseInt(mouseAttr));
		else if (keyAttr) keys.push(parseInt(keyAttr));
		else if (debugAttr) debug.push({ debug: debugAttr });
	});
	const allTextInputs = allInputs.filter((input) => input.type === 'text' && input.value);
	allTextInputs.forEach((input) => {
		const keybind = input.getAttribute('keybind');
		const debugAttr = input.getAttribute('debug');
		if (keybind) keybinds.push({ toggle: keybind, keybind: input.value });
		else if (debugAttr) debug.push({ debug: debugAttr, value: input.value });
	});
	const final = { name: presetName.value, mouse, keys, keybinds, debug };
	presetName.value = null;
	setLocalStorage();
	function setLocalStorage() {
		try {
			const settingPreset = JSON.parse(localStorage.getItem(getSettingPresetKey()) || '[]');
			settingPreset.push(final);
			localStorage.setItem(getSettingPresetKey(), JSON.stringify(settingPreset));
			refreshSettingPresets();
		} catch {
			localStorage.removeItem(getSettingPresetKey());
			setLocalStorage();
		}
	}
}

function removePreset(index) {
	try {
		const settingPreset = JSON.parse(localStorage.getItem(getSettingPresetKey()));
		if (!settingPreset || !settingPreset[index]) return refreshSettingPresets();
		settingPreset.splice(index, 1);
		localStorage.setItem(getSettingPresetKey(), JSON.stringify(settingPreset));
	} catch {
		localStorage.removeItem(getSettingPresetKey());
	}
	refreshSettingPresets();
}

function removeAllSettingPresets() {
	localStorage.removeItem(getSettingPresetKey());
	refreshSettingPresets();
}

async function loadPreset(index) {
	try {
		let settingPreset = JSON.parse(localStorage.getItem(getSettingPresetKey()));
		if (!settingPreset || !settingPreset[index]) return refreshSettingPresets();
		settingPreset = settingPreset[index];
		for (const input of document.querySelectorAll('input')) {
			const keybindAttr = input.getAttribute('keybind');
			const mouseAttr = input.getAttribute('mouse');
			const keyAttr = input.getAttribute('key');
			const debugAttr = input.getAttribute('debug');
			if (keybindAttr) {
				const keybind = settingPreset.keybinds.find((o) => o.toggle === keybindAttr);
				const value = keybind ? keybind.keybind : null;
				input.value = value;
				window.settingActions.keybind(keybindAttr, value);
				continue;
			} else if (mouseAttr) input.checked = !settingPreset.mouse.includes(parseInt(mouseAttr));
			else if (keyAttr) input.checked = !settingPreset.keys.includes(parseInt(keyAttr));
			else if (debugAttr) {
				let debug = settingPreset.debug.filter((o) => o.debug === debugAttr)[0];
				if (input.type === 'checkbox') input.checked = debug ? false : true;
				else if (input.type === 'text') input.value = debug.value;
				if (input.disabled) await observe();
			} else continue;

			input.dispatchEvent(new Event('change'));

			// Prevent variable overwriting each other
			if (debugAttr) await observe();

			function observe() {
				return new Promise((resolve) => {
					// Set up a new observer
					const observer = new MutationObserver((mutations) => {
						mutations.forEach((mutation) => {
							// Check the modified attributeName is "disabled"
							if (mutation.attributeName === 'disabled' && !input.disabled) {
								// Disconnect the observer
								observer.disconnect();
								resolve();
							}
						});
					});
					observer.observe(input, { attributes: true });
				});
			}
		}
	} catch {
		localStorage.removeItem(getSettingPresetKey());
		refreshSettingPresets();
	}
}

function refreshSettingPresets() {
	const presets = document.getElementById('presets');
	try {
		const settingPreset = JSON.parse(localStorage.getItem(getSettingPresetKey()));
		while (presets.firstChild) presets.removeChild(presets.firstChild);
		if (!settingPreset) return;
		settingPreset.forEach((setting, index) => {
			presets.insertAdjacentHTML(
				'afterbegin',
				`
				<div class="setting">
					<b class="saved-text">${setting.name}</b>
					<div class="btn-parent">
						<button class="btn" onclick="removePreset(${index})">Remove</button>
						<button class="btn" onclick="loadPreset(${index})">Load</button>
					</div>
				</div>
			`,
			);
		});
	} catch {
		localStorage.removeItem(getSettingPresetKey());
		refreshSettingPresets();
	}
}

function exit() {
	window.mainActions.exit();
}
