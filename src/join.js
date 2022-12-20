'use strict';

const video = document.getElementById('video');

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
	element.addEventListener('change', () => {
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

const draggable = document.getElementById('draggable');
let position1 = 0;
let position2 = 0;
let moved = false;
const resetWidth = () =>
	(draggable.style.left = Math.min(window.innerWidth, screen.width) - draggable.clientWidth + 'px');
const update = () =>
	(draggable.style.top =
		Math.min(Math.max(draggable.offsetTop - position1, 0), window.innerHeight - draggable.clientHeight) + 'px');
draggable.onmousedown = (event) => {
	event.preventDefault();
	position2 = event.clientY;
	document.onmouseup = (event) => {
		event.preventDefault();
		if (!moved) toggleSidePanel();
		document.onmouseup = null;
		document.onmousemove = null;
		moved = false;
	};
	document.onmousemove = (event) => {
		event.preventDefault();
		moved = true;
		position1 = position2 - event.clientY;
		position2 = event.clientY;
		update();
	};
};
const touchmove = (event) => {
	moved = true;
	position1 = position2 - event.touches[0].clientY;
	position2 = event.touches[0].clientY;
	update();
};
const touchend = (event) => {
	event.preventDefault();
	if (!moved) toggleSidePanel();
	document.removeEventListener('touchend', touchend);
	document.removeEventListener('touchmove', touchmove);
	moved = false;
};
draggable.addEventListener('touchstart', (event) => {
	event.preventDefault();
	position2 = event.touches[0].clientY;
	document.addEventListener('touchend', touchend);
	document.addEventListener('touchmove', touchmove);
});

window.onresize = () => {
	draggable.style.top = Math.max(Math.min(draggable.offsetTop, window.innerHeight - draggable.clientHeight), 0) + 'px';
	resetWidth();
};

let closed = true;
const sidePanel = document.getElementById('sidePanel');
const svg = document.getElementById('svg');
function toggleSidePanel() {
	sidePanel.style.width = closed ? '100%' : '0';
	sidePanel.style.left = closed ? '0' : '100%';
	svg.style.rotate = closed ? '180deg' : null;
	closed = !closed;
}

window.dataActions.getJoinData().then((res) => {
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

	/** @type {import('socket.io').Socket<import('types/socket.io').ServerToClientEvents, import('types/socket.io').ClientToServerEvents, import('types/socket.io').InterServerEvents, import('types/socket.io').SocketData>} */
	const socket = io(res.url);

	socket.on('connect_error', () => {
		// Endpoint doesn't exist
		alert('The URL you entered was not valid. Please try again.');
		exit();
	});

	socket.once('connect', () => {
		// Socket connected
		socket.removeAllListeners('connect_error');
	});

	socket.on('message', (message, callback) => {
		callback();
		alert(message);
	});

	const peerConnection = new RTCPeerConnection(peerConfig);
	peerConnection.addEventListener('icecandidate', (event) => {
		if (event.candidate) socket.emit('candidate', event.candidate);
	});
	peerConnection.addEventListener('track', (event) => {
		video.srcObject = event.streams[0];
	});

	socket.on('sessionDescription', async (description) => {
		await peerConnection.setRemoteDescription(new RTCSessionDescription(description));
		const answer = await peerConnection.createAnswer();
		peerConnection.setLocalDescription(answer);
		socket.emit('sessionDescription', answer);
	});
	socket.on('candidate', (candidate) => {
		peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
	});

	socket.on('disconnect', exit);

	const disconnectText = document.getElementById('disconnect-text');
	const verboseText = document.getElementById('verbose-text');
	peerConnection.addEventListener('connectionstatechange', () => {
		switch (peerConnection.connectionState) {
			case 'connecting':
				verboseText.innerText = 'Initiating WebRTC connection...';
				break;
			case 'failed':
				if (!noAlert) alert('The connection failed, which is most likely due to firewall issues.');
				exit();
				break;
			case 'connected':
				disconnectText.innerText = 'Congratulations, you are now connected!';
				disconnectText.classList.remove('red');
				verboseText.innerText = 'The WebRTC connection has been successfully established!';
				document.getElementById('loading').classList.add('hidden');
				draggable.classList.remove('hidden');
				resetWidth();
				break;
			case 'disconnected':
				if (!noAlert) alert('You got disconnected, most likely due to a TURN server restart!');
				exit();
				break;
		}
	});
	peerConnection.addEventListener('signalingstatechange', () => {
		switch (peerConnection.signalingState) {
			case 'have-local-offer':
				verboseText.innerText = 'Received local offer from remote peer, creating answer...';
				break;
			case 'stable':
				verboseText.innerText = 'WebRTC connection is in a stable state.';
				break;
		}
	});

	// Setting handler
	socket.on('mouseSetting', (disabled, mouse) => {
		try {
			const element = document.querySelector(`input[mouse="${mouse}"]`);
			element.checked = !disabled;
			element.dispatchEvent(new Event('change'));
		} catch {}
	});

	socket.on('keySetting', (disabled, key) => {
		try {
			const element = document.querySelector(`input[key="${key}"]`);
			element.checked = !disabled;
			element.dispatchEvent(new Event('change'));
		} catch {}
	});

	// Game handler
	let mousePressed = [];
	video.addEventListener('contextmenu', (event) => event.preventDefault());
	video.addEventListener('mousedown', (event) => {
		event.preventDefault();
		const position = getMousePositionRatio(event);
		if (!position) return;
		socket.emit('mouseInput', 'down', event.button, position);
		if (!mousePressed.includes(event.button)) mousePressed.push(event.button);
	});
	video.addEventListener('mouseup', (event) => {
		if (event.button) {
			socket.emit('mouseInput', 'up', event.button);
			if (mousePressed.includes(event.button)) mousePressed.splice(mousePressed.indexOf(event.button), 1);
		} else {
			mousePressed.forEach((i) => socket.emit('mouseInput', 'up', i));
			mousePressed = [];
		}
	});
	video.addEventListener('mousemove', (event) => {
		event.preventDefault();
		const position = getMousePositionRatio(event);
		if (!position) return video.dispatchEvent(new Event('mouseup'));
		if (mousePressed.length > 0) socket.emit('mouseInput', 'move', event.button, position);
	});

	// Wheel handler
	video.addEventListener('wheel', (event) => {
		socket.emit('mouseInput', 'scroll', event.button, {
			x: event.deltaX,
			y: event.deltaY,
		});
	});

	// Touchscreen handler
	const clickOffset = 10;
	let touched = false;
	let firstClick = false;
	let secondClickHold = false;
	let firsClickTimeout;
	video.addEventListener('touchstart', (event) => {
		event.preventDefault();
		let doubleClick = false;

		if (touched) video.dispatchEvent(new Event('touchend'));
		touched = true;

		const { touches } = event;
		// Handle double click
		if (firstClick && !touches[1]) {
			doubleClick = true;
			secondClickHold = true;
			socket.emit('mouseInput', 'down', 0);
			if (firsClickTimeout) clearTimeout(firsClickTimeout);
		}
		firstClick = true;
		firsClickTimeout = setTimeout(() => (firstClick = false), 300);

		/**
		 * @type {{x: number, y: number}}
		 */
		let mouseLocation;
		socket.emit('mouseLocation', (location) => (mouseLocation = location));
		const startPoint = {
			x: touches[0].clientX,
			y: touches[0].clientY,
		};
		const startPoint2 = touches[1]
			? {
					x: touches[1].clientX,
					y: touches[1].clientY,
			  }
			: null;
		let storedPoint = {
			x: touches[0].clientX,
			y: touches[0].clientY,
		};
		let storedPoint2 = touches[1]
			? {
					x: touches[1].clientX,
					y: touches[1].clientY,
			  }
			: null;

		const videoSize = videoDimensions(video);
		let leftClick = startPoint2 ? false : true;
		let rightClick = startPoint2 ? true : false;
		let scrollLock = null;
		const touchmove = (event) => {
			event.preventDefault();
			// Math handling (With scroll handling (two fingers))
			const progressX = -(storedPoint.x - event.touches[0].clientX);
			const progressY = -(storedPoint.y - event.touches[0].clientY);
			if (startPoint2) {
				if (
					rightClick &&
					!(
						Math.abs(startPoint.x - event.touches[0].clientX) < clickOffset &&
						Math.abs(startPoint.y - event.touches[0].clientY) < clickOffset &&
						Math.abs(startPoint2.x - event.touches[1].clientX) < clickOffset &&
						Math.abs(startPoint2.y - event.touches[1].clientY) < clickOffset
					)
				)
					rightClick = false;
				// Scroll Handling: Get both finger's progress and use the larger one
				const progressX2 = -(storedPoint2.x - event.touches[1].clientX);
				const progressY2 = -(storedPoint2.y - event.touches[1].clientY);

				storedPoint = {
					x: event.touches[0].clientX,
					y: event.touches[0].clientY,
				};
				storedPoint2 = {
					x: event.touches[1].clientX,
					y: event.touches[1].clientY,
				};

				const sensitive = 3;
				const maxScroll = {
					x: progressX > 0 ? Math.max(progressX, progressX2) : Math.min(progressX, progressX2),
					y: progressY > 0 ? Math.max(progressY, progressY2) : Math.min(progressY, progressY2),
				};
				// Remember the progress got reversed negative
				maxScroll.x *= -sensitive;
				maxScroll.y *= -sensitive;
				// Scroll lock:
				if (!scrollLock && Math.abs(maxScroll.x - maxScroll.y) > 10)
					scrollLock = Math.abs(maxScroll.x) > Math.abs(maxScroll.y) ? 'x' : 'y';
				else if (!scrollLock && Math.abs(maxScroll.x - maxScroll.y) === 0) scrollLock = 'xy';
				socket.emit(
					'mouseInput',
					'scroll',
					0,
					!scrollLock || scrollLock === 'xy'
						? maxScroll
						: scrollLock === 'x'
						? { x: maxScroll.x, y: 0 }
						: { x: 0, y: maxScroll.y },
				);
				return;
			} else if (mouseLocation) {
				const sensitive = {
					x: 1000 / videoSize.width,
					y: 1000 / videoSize.height,
				};
				socket.emit(
					'mouseInput',
					'move',
					0,
					{
						x: mouseLocation.x + progressX * sensitive.x,
						y: mouseLocation.y + progressY * sensitive.y,
					},
					true,
				);
			}
			if (
				(leftClick || rightClick) &&
				!(
					Math.abs(startPoint.x - event.touches[0].clientX) < clickOffset &&
					Math.abs(startPoint.y - event.touches[0].clientY) < clickOffset
				)
			) {
				leftClick = false;
				rightClick = false;
			}
		};
		const touchend = (event) => {
			video.removeEventListener('touchmove', touchmove);
			video.removeEventListener('touchend', touchend);
			touched = false;
			if (doubleClick) {
				secondClickHold = false;
				socket.emit('mouseInput', 'up', 0);
				return;
			}
			if (!event.isTrusted) return;
			// Check if it's double click hold before emit left click
			setTimeout(() => {
				if (leftClick && !secondClickHold) {
					// Left click
					socket.emit('mouseInput', 'down', 0);
					socket.emit('mouseInput', 'up', 0);
				}
			}, 300);
			if (rightClick) {
				// Right click
				socket.emit('mouseInput', 'down', 2);
				socket.emit('mouseInput', 'up', 2);
			}
		};
		video.addEventListener('touchmove', touchmove);
		video.addEventListener('touchend', touchend);

		// Hold to right click
		if (!startPoint2) {
			setTimeout(() => {
				if (leftClick) {
					leftClick = false;
					rightClick = true;
				}
			}, 500);
		}
	});

	document.onkeydown = (event) => {
		event.preventDefault();
		if (sidePanel.style.width !== '100%') socket.emit('keyInput', event.code, true);
	};
	document.onkeyup = (event) => socket.emit('keyInput', event.code, false);

	window.addEventListener('blur', () => {
		video.dispatchEvent(new Event('mouseup'));
		socket.emit('keyInput', false);
	});

	// Debug handler
	const localDebug = document.getElementById('local-debug');
	const audioDebug = localDebug.querySelector('.audio');
	const videoDebug = localDebug.querySelector('.video');
	const lastUpdatedDebug = localDebug.querySelector('.lastUpdated');
	const connectedHostDebug = localDebug.querySelector('.connectedHost');
	const candidateTypeDebug = localDebug.querySelector('.candidateType');
	const protocolDebug = localDebug.querySelector('.protocol');
	const bandwidthAudioDebug = audioDebug.querySelector('.bandwidth');
	const codecAudioDebug = audioDebug.querySelector('.codec');
	const bandwidthVideoDebug = videoDebug.querySelector('.bandwidth');
	const codecVideoDebug = videoDebug.querySelector('.codec');
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
	const bandwidthVideoRemoteDebug = videoRemoteDebug.querySelector('.bandwidth');
	const frameSizeRemoteDebug = videoRemoteDebug.querySelector('.frameSize');
	const rawRemoteDebug = remoteDebug.querySelector('.raw');

	let previousTimestamp;
	let previousValues = { audio: {}, video: {} };
	let previousRemoteTimestamp;
	let previousRemoteValues = {
		'remote-inbound-rtp': { audio: {}, video: {} },
		'outbound-rtp': { audio: {}, video: {} },
	};
	setInterval(() => {
		// Check if stats need to be refreshed
		if (sidePanel.style.width !== '100%') return;
		if (localDebug.style.maxHeight) {
			peerConnection.getStats().then((stats) => {
				if (!stats) return;
				let activeCandidatePair;
				let now;
				stats.forEach((stat) => {
					now = stat.timestamp;
					if (stat.type === 'inbound-rtp') {
						const type = stat.mediaType || stat.kind;
						for (const key in stat) {
							const debugElement = (type === 'audio' ? audioDebug : videoDebug).querySelector(`.${key}`);
							if (debugElement) debugElement.innerText = stat[key];

							// Display rates
							const rateElement = (type === 'audio' ? audioDebug : videoDebug).querySelector(`.${key}-rate`);
							let previousValue;
							Object.keys(previousValues).forEach((key1) =>
								Object.keys(previousValues[key1]).forEach((key2) => {
									if (key1 === type && key2 === key) previousValue = previousValues[key1][key2];
								}),
							);
							if (rateElement && previousTimestamp && previousValue !== undefined) {
								rateElement.innerText =
									Math.floor((1000 * (stat[key] - previousValue)) / (now - previousTimestamp)) + '/s';
							}
						}
						if (type === 'video' && stat.frameWidth && stat.frameHeight)
							frameSizeDebug.innerText = `${stat.frameWidth}x${stat.frameHeight}`;

						// Calculate bandwidth
						if (previousTimestamp)
							(type === 'audio' ? bandwidthAudioDebug : bandwidthVideoDebug).innerText = Math.floor(
								(8 *
									(stat.bytesReceived +
										stat.headerBytesReceived -
										previousValues[type].bytesReceived -
										previousValues[type].headerBytesReceived)) /
									(now - previousTimestamp),
							);

						previousValues[type] = stat;
					}

					// Display codec
					if (stat.type === 'codec') {
						const mineType = stat.mimeType.split('/');
						const element = mineType[0] === 'audio' ? codecAudioDebug : codecVideoDebug;
						element.innerText = mineType[1];
					}

					// Search for the candidate pair, spec-way first.
					if (stat.type === 'transport') activeCandidatePair = stats.get(stat.selectedCandidatePairId);
					// Fallback for Firefox.
					if (!activeCandidatePair && stat.type === 'candidate-pair' && stat.selected) activeCandidatePair = stat;

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
					if (stat.type === 'remote-inbound-rtp' || stat.type === 'outbound-rtp') {
						const type = stat.mediaType || stat.kind;
						for (const key in stat) {
							const debugElement = (type === 'audio' ? audioRemoteDebug : videoRemoteDebug).querySelector(`.${key}`);
							if (debugElement) debugElement.innerText = key === 'roundTripTime' ? `${stat[key] * 1000}ms` : stat[key];

							const rateElement = (type === 'audio' ? audioRemoteDebug : videoRemoteDebug).querySelector(
								`.${key}-rate`,
							);
							let previousValue;
							Object.keys(previousRemoteValues).forEach((key1) =>
								Object.keys(previousRemoteValues[key1]).forEach((key2) =>
									Object.keys(previousRemoteValues[key1][key2]).forEach((key3) => {
										if (key1 === stat.type && key2 === type && key3 === key)
											previousValue = previousRemoteValues[key1][key2][key3];
									}),
								),
							);
							if (rateElement && previousRemoteTimestamp && previousValue !== undefined) {
								rateElement.innerText =
									Math.floor((1000 * (stat[key] - previousValue)) / (now - previousRemoteTimestamp)) + '/s';
							}
						}
						if (type === 'video') {
							if (stat.frameWidth && stat.frameHeight)
								frameSizeRemoteDebug.innerText = `${stat.frameWidth}x${stat.frameHeight}`;
						}

						// Calculate bandwidth
						const element =
							type === 'audio' ? bandwidthAudioRemoteDebug : type === 'video' ? bandwidthVideoRemoteDebug : null;
						if (previousRemoteTimestamp && stat.type === 'outbound-rtp' && element)
							element.innerText = Math.floor(
								(8 *
									(stat.bytesSent +
										stat.headerBytesSent -
										previousRemoteValues[stat.type][type].bytesSent -
										previousRemoteValues[stat.type][type].headerBytesSent)) /
									(now - previousRemoteTimestamp),
							);

						previousRemoteValues[stat.type][type] = stat;
					}

					// Search for the candidate pair, spec-way first.
					if (stat.type === 'transport') activeCandidatePair = stats.get(stat.selectedCandidatePairId);
					// Fallback for Firefox.
					if (!activeCandidatePair && stat.type === 'candidate-pair' && stat.selected) activeCandidatePair = stat;

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
});

let muted = false;
const toggleMuteBtn = document.getElementById('toggle-mute-btn');
function toggleMute() {
	muted = !muted;
	video.muted = muted;
	toggleMuteBtn.innerText = muted ? 'Unmute Remote Sound' : 'Mute Remote Sound';
}

let fullscreen = false;
const toggleFullscreenBtn = document.getElementById('toggle-fullscreen-btn');
function toggleFullscreen(onlyChange = false) {
	fullscreen = !fullscreen;
	if (!onlyChange) fullscreen ? document.documentElement.requestFullscreen() : document.exitFullscreen();
	toggleFullscreenBtn.innerText = fullscreen ? 'Exit Fullscreen' : 'Fullscreen';
}

document.addEventListener('fullscreenchange', () => {
	if ((document.fullscreenElement && !fullscreen) || (!document.fullscreenElement && fullscreen))
		toggleFullscreen(true);
});

function exit() {
	window.mainActions.exit();
}

function getMousePositionRatio(event, touch = false) {
	const videoSize = videoDimensions(video);
	// Calculate the blank space on top of the actual video
	const space = {
		x: (video.offsetWidth - videoSize.width) / 2,
		y: (video.offsetHeight - videoSize.height) / 2,
	};
	// Calculate the position of the cursor in the playing video
	const position = {
		x: touch ? event.touches[0].clientX : event.clientX - space.x,
		y: touch ? event.touches[0].clientY : event.clientY - space.y,
	};
	// If the cursor isn't in the actual video but still clicked the video element
	if (
		[position.x, position.y].some((point) => isNaN(point) || point < 0) ||
		position.x > videoSize.width ||
		position.y > videoSize.height
	)
		return null;
	return {
		x: position.x / videoSize.width,
		y: position.y / videoSize.height,
	};
}

// Taken from: https://nathanielpaulus.wordpress.com/2016/09/04/finding-the-true-dimensions-of-an-html5-videos-active-area/
function videoDimensions(video) {
	// Ratio of the video's intrinsic dimensions
	const videoRatio = video.videoWidth / video.videoHeight;
	// The width and height of the video element
	let width = video.offsetWidth;
	let height = video.offsetHeight;
	// The ratio of the element's width to its height
	const elementRatio = width / height;
	// If the video element is short and wide
	if (elementRatio > videoRatio) width = height * videoRatio;
	// It must be tall and thin, or exactly equal to the original ratio
	else height = width / videoRatio;
	return {
		width: width,
		height: height,
	};
}
