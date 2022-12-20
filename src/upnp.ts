const natUpnp: any = require('nat-upnp');

type Port =
	| number
	| {
			host?: string;
			port: number;
	  };

const client = natUpnp.createClient();

export function portMapping(options: {
	public: Port;
	private: Port;
	description?: string;
	ttl?: number;
	protocol?: 'TCP' | 'UDP';
}) {
	return new Promise<void>((resolve, reject) => {
		client.portMapping(options, (err: Error) => {
			if (err) reject(err);
			else resolve();
		});
	});
}

export function portUnmapping(options: { public: Port; protocol?: 'TCP' | 'UDP' }) {
	return new Promise<void>((resolve, reject) => {
		client.portUnmapping(options, (err: Error) => {
			if (err) reject(err);
			else resolve();
		});
	});
}

export function externalIp() {
	return new Promise<string>((resolve, reject) => {
		client.externalIp((err: Error | undefined, ip: string) => {
			if (err) reject(err);
			else resolve(ip);
		});
	});
}
