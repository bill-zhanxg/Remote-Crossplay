# Remote-Crossplay

## What is Remote Crossplay?
Remote Crossplay enables users to engage in a single-device game on multiple devices simultaneously.

## Features
- Send mouse left, middle, right, and wheel actions remotely
- Send all key inputs remotely
- Hear audio from the remote device
- View the screen of the remote device
- Automatic port forwarding
- Adjust WebRTC connection for the lowest latency
- View all debug information
- Achieve a delay of under 500ms (with a good internet connection, usually under 100ms)
- If you are not the host, both Windows and web interfaces are available.

## Limitations
- Only support Windows if you're the host

## Getting Started
### If you're trying to use the app, just go to the `Releases` section on the right side and download the latest version of Remote Crossplay. If you want to host it but you're not using Windows or want to build from the source code, follow these steps:
1. Make sure you have Git, Node.js, and npm installed on your machine
2. Run the command `git clone https://github.com/bill-zhanxg/Remote-Crossplay.git` to clone the repository to your local machine
3. Run the command `npm install` to install all required Node.js packages
### Starting the Application
1. In the root directory of the cloned repository, run the command `npm run dev` to start the app
### Building the Application
1. In the root directory of the cloned repository, run the command `npm run build` to build the app
### Starting the Web Version of Remote Crossplay
1. Go to the `.webJoin` directory: `cd .webJoin`
2. Run the command `npm install` to install all required Node.js packages
3. Install `nodemon` as a global or local package
4. Start the application with the command `npm run dev`

## Contributing
Your contributions are greatly valued in the open source community, where you can learn, be inspired, and collaborate with others who share a passion for open source software development. If you have any ideas for improvement or would like to contribute, please don't hesitate to submit a pull request.

## License
This software is distributed under the MIT License, which grants permission to use, copy, modify, and distribute the software for any purpose, without charge. Please see the accompanying `LICENSE` file for full details of the MIT License terms and conditions.
