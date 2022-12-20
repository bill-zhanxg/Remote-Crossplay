export interface ClientToServerEvents {
	candidate: (candidate: string) => void;
	sessionDescription: (description: string) => void;
	mouseInput: (
		type: 'down' | 'up' | 'move' | 'scroll',
		button: number,
		point: undefined | { x: number; y: number },
		original: boolean,
	) => void;
	mouseLocation: (callback: (location: { x: number; y: number }) => void) => void;
	keyInput: (key: string | false, down: boolean) => void;
	debug: (callback: (stats: RTCStatsReport | null) => void) => void;
	disconnection: () => void;
}
export interface ServerToClientEvents {
	message: (message: string, callback: () => void) => void;
	candidate: (candidate: string) => void;
	sessionDescription: (description: string) => void;
	mouseSetting: (disabled: boolean, mouse: number) => void;
	keySetting: (disabled: boolean, key: number) => void;
	debug: (callback: (err: Error, stats: RTCStatsReport[]) => void) => void;
	disconnection: () => void;
}
export interface InterServerEvents {}
export interface SocketData {
	host: boolean;
}
