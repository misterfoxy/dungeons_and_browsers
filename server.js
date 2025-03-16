import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const games = []

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('createGame', () => {
        const gameId = Math.random().toString(36).substr(2, 9);
        games[gameId] = {
            players: [socket.id],
            state: {}, // Initialize game state here
        };
        socket.join(gameId);
        socket.emit('gameCreated', gameId);
        console.log(`Game created: ${gameId}`);
    });


    socket.on('playerMove',(data) => {
        console.log(`Move received from ${socket.id}:`, data);
        // io.to(data.roomId).emit('updateGameState', data);
    })

    socket.on('playerAction', (data) => {
        console.log(`Action received from ${socket.id}:`, data);
        io.to(data.roomId).emit('updateGameState', data);
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

function updateGameState(state, action) {
    // Example action processing:
    if (action.type === 'ATTACK') {
        const { attacker, target } = action;
        state[target].health -= 10;
    }
    return state;
}

const PORT = process.env.PORT || 3003;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));


// import express from 'express';
// import { createServer } from 'http';
// import { Server } from 'socket.io';

// const app = express();
// const httpServer = createServer(app);
// const io = new Server(httpServer, {
//     cors: {
//         origin: "*", // Allow connections from any origin
//         methods: ["GET", "POST"]
//     }
// });

// const PORT = 3001;

// // Store sessions
// const games: Record<string, any> = {};

// io.on('connection', (socket) => {
//     console.log('A user connected:', socket.id);

//     socket.on('createGame', () => {
//         const gameId = Math.random().toString(36).substr(2, 9);
//         games[gameId] = {
//             players: [socket.id],
//             state: {}, // Initialize game state here
//         };
//         socket.join(gameId);
//         socket.emit('gameCreated', gameId);
//         console.log(`Game created: ${gameId}`);
//     });

//     socket.on('joinGame', (gameId) => {
//         if (games[gameId] && games[gameId].players.length < 2) {
//             games[gameId].players.push(socket.id);
//             socket.join(gameId);
//             io.to(gameId).emit('playerJoined', games[gameId]);
//             console.log(`Player joined game: ${gameId}`);
//         } else {
//             socket.emit('joinError', 'Game is full or does not exist');
//         }
//     });

//     socket.on('playerAction', (data) => {
//         const { gameId, action } = data;
//         if (games[gameId]) {
//             // Update game state
//             games[gameId].state = updateGameState(games[gameId].state, action);
//             io.to(gameId).emit('updateState', games[gameId].state);
//         }
//     });

//     socket.on('disconnect', () => {
//         console.log('A user disconnected:', socket.id);
//         for (const [gameId, game] of Object.entries(games)) {
//             if (game.players.includes(socket.id)) {
//                 game.players = game.players.filter(p => p !== socket.id);
//                 if (game.players.length === 0) {
//                     delete games[gameId];
//                 }
//             }
//         }
//     });
// });

// function updateGameState(state: any, action: any) {
//     // Example action processing:
//     if (action.type === 'ATTACK') {
//         const { attacker, target } = action;
//         state[target].health -= 10;
//     }
//     return state;
// }

// httpServer.listen(PORT, () => {
//     console.log(`Server listening on http://localhost:${PORT}`);
// });

