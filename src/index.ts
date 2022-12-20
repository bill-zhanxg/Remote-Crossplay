import { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu } from 'electron';
import path from 'path';
import express from 'express';
import http from 'http';
import crypto from 'crypto';
import { portMapping, portUnmapping, externalIp } from './upnp';
import { keyboard, screen, mouse, Point } from '@nut-tree/nut-js';
import { Server } from 'socket.io';
import keyMapping from './keyMapping';
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from './types/socket.io';
const network: any = require('network');
let storedPort: null | number = null;

// Nut.js configuration
mouse.config.autoDelayMs = 0;
mouse.config.mouseSpeed = 10000;
keyboard.config.autoDelayMs = 0;

// Enable touch events
app.commandLine.appendSwitch('touch-events', 'enabled');
app.on('ready', () => {
	const win = new BrowserWindow({
		show: false,
		width: 600,
		height: 400,
		minWidth: 600,
		minHeight: 400,
		autoHideMenuBar: true,
		icon: path.join(__dirname, '../icon.ico'),
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
		},
	});
	Menu.setApplicationMenu(Menu.buildFromTemplate([]));
	win.maximize();

	const loadFile = (filename: string) => win.loadFile(path.join(__dirname, filename));
	ipcMain.handle('userAction', async (event, type: 'host' | 'join', url: string) => {
		await loadFile(`${type}.html`);

		// MessageBox handler
		ipcMain.handle('messageBox', (event, message) => showMessageBox(win, message));

		if (type === 'host') {
			const disabledMouse: number[] = [];
			const disabledKeys: number[] = [];

			const app = express();
			const server = http.createServer(app);
			const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server, {
				maxHttpBufferSize: 1e8,
				serveClient: false,
				cors: { origin: '*' },
			});

			let ready = false;
			let key: string | undefined;
			let full = false;
			let hostDescription: string | undefined;
			let hostIceCandidate: string[] = [];
			io.on('connection', (socket) => {
				const disconnect = (message: string) => {
					let disconnected = false;
					const checkDisconnect = () => {
						if (!disconnected) socket.disconnect(true);
					};
					socket.emit('message', message, checkDisconnect);
					setTimeout(() => checkDisconnect, 1000);
				};
				socket.on('sessionDescription', (description) =>
					socket.data.host && !full
						? (hostDescription = description)
						: socket.broadcast.emit('sessionDescription', description),
				);
				socket.on('candidate', (candidate) =>
					socket.data.host && !full ? hostIceCandidate.push(candidate) : socket.broadcast.emit('candidate', candidate),
				);
				socket.on('debug', (callback) =>
					socket.broadcast
						.timeout(1000)
						.emit('debug', (err, stats) => (err || !stats[0] ? callback(null) : callback(stats[0]))),
				);

				if (!key) return disconnect('The server is not yet ready.');
				if (socket.handshake.auth?.token === key && !ready) {
					socket.data.host = true;
					ready = true;

					const disconnectSocket = (message = 'The host has disconnected.') => {
						let disconnected = false;
						const checkDisconnect = () => {
							if (!disconnected) socket.broadcast.disconnectSockets(true);
						};
						socket.broadcast.emit('message', message, checkDisconnect);
						setTimeout(() => checkDisconnect, 1000);
					};
					socket.on('disconnect', () => disconnectSocket());

					socket.on('disconnection', () => disconnectSocket('You have been disconnected by the host.'));

					// Setting handler
					ipcMain.handle('mouse', (event, disable, mouse) => {
						if (disable) {
							if (!disabledMouse.includes(mouse)) disabledMouse.push(mouse);
						} else if (disabledMouse.includes(mouse)) disabledMouse.splice(disabledMouse.indexOf(mouse), 1);
						socket.broadcast.emit('mouseSetting', disable, mouse);
					});

					ipcMain.handle('key', (event, disable: boolean, key: number) => {
						if (disable) {
							if (!disabledKeys.includes(key)) disabledKeys.push(key);
						} else if (disabledKeys.includes(key)) disabledKeys.splice(disabledKeys.indexOf(key), 1);
						socket.broadcast.emit('keySetting', disable, key);
					});

					// Exit handler
					ipcMain.handle('exit', () => {
						disconnectSocket();
						loadFile('index.html');
						removeUpnp();
						server.close();
						removeAllIpcHandlers();
						globalShortcut.unregisterAll();
					});
					return;
				}
				if (!(ready && hostDescription && hostIceCandidate)) return disconnect('The host is not yet ready.');
				if (full) return disconnect('The room is currently at capacity and cannot accept any more users.');
				socket.on('disconnect', () => {
					socket.broadcast.emit('disconnection');
					full = false;
				});
				full = true;
				socket.emit('sessionDescription', hostDescription);
				hostIceCandidate.forEach((candidate) => socket.emit('candidate', candidate));
				hostIceCandidate = [];

				// Send the changed keySetting and mouseSetting to client
				disabledMouse.forEach((mouse) => socket.emit('mouseSetting', true, mouse));
				disabledKeys.forEach((key) => socket.emit('keySetting', true, key));

				// Receive mouse input from client
				socket.on('mouseInput', async (type, button, point, original = false) => {
					if (type === 'scroll' && !disabledMouse.includes(button)) {
						// Scroll handler
						if (!point) return;
						if (point.x) mouse.scrollLeft(point.x);
						if (point.y) mouse.scrollDown(point.y);
						return;
					}
					if (!(button === 0 || button === 1 || button === 2) || disabledMouse.includes(button)) return;
					if (type === 'down' || type === 'move') {
						if (point && point.x && point.y) {
							const position = original
								? point
								: new Point((await screen.width()) * point.x, (await screen.height()) * point.y);
							if (position) await mouse.move([position]);
						}
						if (type === 'down') {
							await mouse.pressButton(button);
						}
					} else {
						await mouse.releaseButton(button);
					}
				});
				socket.on('mouseLocation', async (callback) => callback(await mouse.getPosition()));

				// Receive Key input from client
				let pressedKeys: number[] = [];
				socket.on('keyInput', async (key: string | false, down) => {
					if (key === false) {
						pressedKeys.forEach((key) => keyboard.releaseKey(key));
						pressedKeys = [];
						return;
					}
					const keyNum = (keyMapping as { [index: string]: number })[key];
					if (keyNum === undefined) return;
					if (down) {
						if (!disabledKeys.includes(keyNum) && !pressedKeys.includes(keyNum)) {
							keyboard.pressKey(keyNum);
							pressedKeys.push(keyNum);
						}
					} else {
						keyboard.releaseKey(keyNum);
						pressedKeys.splice(pressedKeys.indexOf(keyNum), 1);
					}
				});
			});

			process.on('uncaughtException', (err) => {
				if (err.message.includes('listen EADDRINUSE')) {
					dialog.showMessageBox(win, {
						type: 'error',
						title: 'Unable to host',
						message: 'The port you specified is already being used by another program. Please choose a different port.',
					});
				} else {
					dialog.showMessageBox(win, {
						type: 'error',
						title: 'Unknown error occurred',
						message: err.message,
					});
				}
				loadFile('index.html');
				process.removeAllListeners('uncaughtException');
			});
			const port = parseInt(url);
			storedPort = port;
			server.listen(port);

			server.on('listening', () => {
				process.removeAllListeners('uncaughtException');
				key = crypto.randomInt(100000000000, 10000000000000).toString(32);
				const portMappingPromise = portMapping({
					public: port,
					private: port,
					description: 'Remote Crossplay',
					ttl: 60 * 60 * 5,
				}).catch((err: Error) => err);
				const publicIpPromise = externalIp().catch((err: Error) => err);

				network.get_private_ip((err: Error, ip: string) => {
					portMappingPromise.then((portErr) => {
						publicIpPromise.then((publicIp) => {
							win.webContents.send('getHostData', {
								port,
								key,
								publicIp: publicIp instanceof Error ? 'unknown' : publicIp,
								privateIp: err ? 'localhost' : ip,
								portForwardError: portErr
									? portErr.message.includes('timeout')
										? "UPnP IGD is not enabled in your router's settings, or your router does not support it."
										: portErr.message.includes('Request failed: 500')
										? 'This port is already listed in the port mapping rules for your router.'
										: portErr.message
									: null,
							});
						});
					});
				});
			});

			const keybinds: { keybind: string; keys: string }[] = [];
			ipcMain.handle('keybind', (event, keybind: string, keys: string | null) => {
				const key = keybinds.find((o) => o.keybind === keybind);
				if (key) {
					keybinds.splice(keybinds.indexOf(key), 1);
					globalShortcut.unregister(key.keys);
				}

				if (keys !== null) {
					globalShortcut.register(keys, () => win.webContents.send('triggerKeybind', keybind));
					keybinds.push({ keybind, keys });
				}
			});
		} else if (type === 'join') {
			win.webContents.send('getJoinData', { url: url });

			// Full screen handler
			ipcMain.handle('fullscreen', (event, fullscreen: boolean) => win.setFullScreen(fullscreen));

			// Exit handler
			ipcMain.handle('exit', () => {
				loadFile('index.html');
				removeAllIpcHandlers();
			});
		} else return false;

		win.on('minimize', () => win.webContents.send('minimize'));
		win.on('restore', () => win.webContents.send('restore'));
		win.on('focus', () => win.webContents.send('restore'));

		return true;
	});

	loadFile('index.html');
	win.show();
});

function removeAllIpcHandlers() {
	ipcMain.removeHandler('messageBox');
	ipcMain.removeHandler('mouse');
	ipcMain.removeHandler('key');
	ipcMain.removeHandler('keybind');
	ipcMain.removeHandler('fullscreen');
	ipcMain.removeHandler('exit');
}

function showMessageBox(win: BrowserWindow, message: string) {
	dialog.showMessageBox(win, {
		type: 'info',
		title: win.title,
		message,
	});
}

app.on('window-all-closed', async () => {
	await removeUpnp();
	app.quit();
});

async function removeUpnp() {
	if (storedPort !== null) await portUnmapping({ public: storedPort }).catch(() => {});
}
