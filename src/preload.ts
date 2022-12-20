import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('mainActions', {
	userAction: (type: string, url: string) => ipcRenderer.invoke('userAction', type, url),
	messageBox: (message: string) => ipcRenderer.invoke('messageBox', message),
	minimize: (callback: () => void) => ipcRenderer.on('minimize', () => callback()),
	restore: (callback: () => void) => ipcRenderer.on('restore', () => callback()),
	fullscreen: (fullscreen: boolean) => ipcRenderer.invoke('fullscreen', fullscreen),
	exit: () => ipcRenderer.invoke('exit'),
});

contextBridge.exposeInMainWorld('settingActions', {
	mouse: (disable: boolean, mouse: number) => ipcRenderer.invoke('mouse', disable, mouse),
	key: (disable: boolean, key: number) => ipcRenderer.invoke('key', disable, key),
	keybind: (keybind: string, keys: string | null) => ipcRenderer.invoke('keybind', keybind, keys),
	triggerKeybind: (callback: (keybind: string) => void) =>
		ipcRenderer.on('triggerKeybind', (event, keybind: string) => callback(keybind)),
});

contextBridge.exposeInMainWorld('dataActions', {
	getHostData: () =>
		new Promise((resolve) => {
			ipcRenderer.once('getHostData', (event, res) => {
				resolve(res);
			});
		}),
	getJoinData: () =>
		new Promise((resolve) => {
			ipcRenderer.once('getJoinData', (event, res) => {
				resolve(res);
			});
		}),
});
