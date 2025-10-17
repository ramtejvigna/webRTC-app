import express from "express"
import { Server } from "socket.io";
import http from "http";
import { PORT } from "./constants.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
})

app.get('/', (req, res) => {
    res.send("Signaling server running!!!!")
})

// Store room information
const rooms = new Map();

io.on('connection', socket => {
    console.log('Socket connected:', socket.id);

    socket.on('join', (roomId: string) => {
        console.log(`Socket ${socket.id} joining room ${roomId}`);
        
        // Join the room
        socket.join(roomId);
        
        // Get current room info
        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
        }
        
        const roomUsers = rooms.get(roomId);
        const isFirstUser = roomUsers.size === 0;
        
        // Add user to room
        roomUsers.add(socket.id);
        
        // Confirm to the joining user that they've joined
        socket.emit('room-joined', { roomId, userCount: roomUsers.size });
        
        // If there's already someone in the room, notify them
        if (!isFirstUser) {
            console.log(`Notifying existing users in room ${roomId} about new user`);
            socket.to(roomId).emit('user-joined');
        }
        
        console.log(`Room ${roomId} now has ${roomUsers.size} users`);
    });

    socket.on('signal', ({ roomId, data }: { roomId: string, data: any }) => {
        console.log(`Relaying signal in room ${roomId}:`, data.type);
        
        // Forward the signal to other users in the room
        socket.to(roomId).emit('signal', { data });
    });

    socket.on('video-toggle', ({ roomId, isVideoOff }: { roomId: string, isVideoOff: boolean }) => {
        console.log(`Video toggle in room ${roomId}: ${isVideoOff ? 'OFF' : 'ON'}`);
        
        // Forward the video toggle state to other users in the room
        socket.to(roomId).emit('video-toggle', { isVideoOff });
    });

    socket.on('leave', (roomId: string) => {
        console.log(`Socket ${socket.id} leaving room ${roomId}`);
        
        socket.leave(roomId);
        
        if (rooms.has(roomId)) {
            const roomUsers = rooms.get(roomId);
            roomUsers.delete(socket.id);
            
            // Notify others in the room
            socket.to(roomId).emit('user-left');
            
            // Clean up empty rooms
            if (roomUsers.size === 0) {
                rooms.delete(roomId);
                console.log(`Room ${roomId} deleted (empty)`);
            } else {
                console.log(`Room ${roomId} now has ${roomUsers.size} users`);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
        
        // Remove user from all rooms
        rooms.forEach((users, roomId) => {
            if (users.has(socket.id)) {
                users.delete(socket.id);
                socket.to(roomId).emit('user-left');
                
                if (users.size === 0) {
                    rooms.delete(roomId);
                    console.log(`Room ${roomId} deleted (empty)`);
                }
            }
        });
    });
})

server.listen(PORT, () => {
    console.log(`Server is listening at ${PORT}`);
})