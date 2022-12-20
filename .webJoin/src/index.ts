import 'dotenv/config';
import express from 'express';
import path from 'path';
const app = express();
const port: number = 3000;

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			SESSION_SECRET: string;
		}
	}
}

process.on('uncaughtException', (err, origin) => {
	console.log(err);
});

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const getFile = (filename: string): string => path.join(__dirname, '../views', filename);
app.get('/', (req, res) => {
	res.sendFile(getFile('join.html'));
});

app.listen(port, () => {
	console.log('HTTP Server running on port ' + port);
});

console.log('Server started!');
