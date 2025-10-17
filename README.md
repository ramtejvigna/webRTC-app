# WebRTC Video Chat Application

A simple peer-to-peer video chat application built with WebRTC, Next.js, and Socket.io.

## Features

- **Peer-to-Peer Video Calls**: Direct video communication between users using WebRTC
- **Room-based System**: Users can create or join rooms using unique room IDs
- **Real-time Signaling**: Socket.io server handles WebRTC signaling
- **Responsive Design**: Clean, simple interface that works on different screen sizes

## Architecture

### Client (Next.js 15 with App Router)
- **Framework**: Next.js 15 with TypeScript
- **WebRTC**: Native browser WebRTC APIs for peer-to-peer communication
- **Signaling**: Socket.io client for real-time communication with signaling server
- **Routing**: App Router with dynamic routes for rooms

### Server (Node.js with Express)
- **Framework**: Express.js with TypeScript
- **Signaling Server**: Socket.io server for WebRTC signaling
- **Room Management**: In-memory room state management
- **CORS**: Configured for cross-origin requests

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Modern web browser with WebRTC support

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd webRTC-app
```

2. Install server dependencies:
```bash
cd server
npm install
```

3. Install client dependencies:
```bash
cd ../client
npm install
```

### Running the Application

1. Start the signaling server:
```bash
cd server
npm run dev
```
The server will start on `http://localhost:5000`

2. Start the client application:
```bash
cd client
npm run dev
```
The client will start on `http://localhost:3000`

### Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Choose one of the options:
   - **Create Room**: Creates a new room with a unique ID
   - **Join Room**: Enter an existing room ID to start a video call
3. Allow camera and microphone permissions when prompted
4. Share the room ID with others to join the call

## Project Structure

```
webRTC-app/
├── client/                 # Next.js frontend application
│   ├── src/
│   │   └── app/
│   │       ├── page.tsx    # Home page (create/join rooms)
│   │       └── room/
│   │           └── [id]/
│   │               └── page.tsx  # Video call room
│   ├── package.json
│   └── ...
├── server/                 # Express.js signaling server
│   ├── src/
│   │   ├── server.ts       # Main server file
│   │   └── constants.ts    # Configuration
│   ├── .env               # Environment variables
│   ├── package.json
│   └── ...
└── README.md
```

## WebRTC Flow

1. **Room Creation/Joining**: Users create or join rooms through the web interface
2. **Media Access**: Browser requests access to camera and microphone
3. **Socket Connection**: Client connects to signaling server via Socket.io
4. **Peer Discovery**: When a second user joins, the signaling server notifies existing users
5. **Offer/Answer Exchange**: WebRTC offer and answer are exchanged through the signaling server
6. **ICE Candidate Exchange**: Network information is shared for NAT traversal
7. **Direct Connection**: Once negotiated, video/audio streams directly between peers

## Technologies Used

- **Frontend**: Next.js 15, TypeScript, React
- **Backend**: Node.js, Express.js, Socket.io
- **WebRTC**: Native browser APIs
- **Build Tools**: TypeScript, Turbopack, nodemon

## Environment Variables

### Server (.env)
```
PORT=5000
```

## Development

### Building for Production

Server:
```bash
cd server
npm run build
npm start
```

Client:
```bash
cd client
npm run build
npm start
```

## Troubleshooting

- **Camera/Microphone not working**: Ensure HTTPS or localhost for WebRTC permissions
- **Connection issues**: Check that both server and client are running
- **Firewall issues**: Ensure ports 3000 and 5000 are accessible
- **Browser compatibility**: Use modern browsers (Chrome, Firefox, Safari, Edge)

## License

This project is open source and available under the [MIT License](LICENSE).