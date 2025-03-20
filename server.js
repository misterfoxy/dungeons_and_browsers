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

const gameState = {
    players: [],
    enemies: [],
    gridSize: 50,
    rows: 14,
    cols: 14,
    turnIndex: 0, // Whose turn it is in initiative order
    initiative: [],
    activePlayerId: null, // Current turn's player ID
    isMultiplayer: false, // Whether it's a single or multiplayer session
}

io.on('connection', (socket) => {
    // console.log(`User connected: ${socket.id}`);
  // Add player to state
    gameState.players[socket.id] = {
        id: socket.id,
        name: `Player ${Object.keys(gameState.players).length + 1}`,
        x: Math.floor(Math.random() * 10) * 50,
        y: Math.floor(Math.random() * 10) * 50,
        health: 100,
        isReady: false
    };


    socket.on('createGame', (gameStartPayload) => {

         // server receives player character count  (1 or 2)
            // server generates game start data (map layout, character positions, initiative order) 
            // server sends game start data to client
            // client generates map and UI based on game start data
            // client sends game ready message to server
            // server sends game ready message to all clients
        // console.log(gameStartPayload)
        const gameId = Math.random().toString(36).substr(2, 9);
        games[gameId] = {
            players: [socket.id],
            state: {}, // Initialize game state here
        };

        const initiative = generateInitiative(gameStartPayload.players);

        gameState.initiative = initiative;
        gameState.gameId = gameId;

        socket.join(gameId);
        socket.emit('gameCreated', gameState);

    });

    socket.on('startTurn', (data) => {

        const player = gameState.initiative[gameState.turnIndex];
        gameState.activePlayerId = player.id;

        io.to(data.gameId).emit('turnStart', gameState);
    });

    socket.on('endTurn', (data) => {
        gameState.turnIndex = (gameState.turnIndex + 1) % gameState.initiative.length;
        io.to(data.gameId).emit('turnEnd', gameState);
    }
    );


    socket.on('playerMove',(data, callback) => {
        // console.log(`Move received from ${socket.id}:`, data);

        const player = data.char; // Get active player

        const distance = Math.max(Math.abs(data.targetx - player.x) / gameState.gridSize,Math.abs(data.targety - player.y) / gameState.gridSize);


        if (distance <= player.currentDistance) {
            // Update player position
            player.x = data.targetx;
            player.y = data.targety;
            player.currentDistance -= distance;
            io.emit('stateUpdate', gameState);
            callback({success: true, player: player});
            // socket.emit('validMove', { message: 'Successful move', player: player });
          
        } else {
            callback({success: false});
            // socket.emit('invalidMove', { message: 'Invalid move' });
        }
        

                // this.socket.emit('playerMove',{char: this.selectedCharacter, currentx:this.selectedCharacter.x,currenty:this.selectedCharacter.y,targetx:targetX,targety:targetY})

        // io.to(data.roomId).emit('updateGameState', data);
    });

    socket.on('playerAttack', ({ attackerId, targetId, distance }) => {
        const attacker = gameState.initiative.find(c => c.id === attackerId);
        const target = gameState.initiative.find(c => c.id === targetId);
    
        // console.log(`Target health at start: ${target.currentHealth}`);
        if (!attacker || !target) return;
    
        // Check attack range
        if (distance > 2) return;
    
        // Calculate damage
        const damage = Math.max(attacker.attack - target.defense, 1);
        target.currentHealth -= damage;
        attacker.currentActionCount -= 1;
    
        let defeated = false;
        if (target.currentHealth <= 0) {
            defeated = true;
            gameState.initiative = gameState.initiative.filter(char => char.currentHealth > 0);
        }
    
        // Broadcast state update to all clients
        io.emit('stateUpdate', {
            initiative: gameState.initiative,
            lastAttack: {
                attackerId,
                targetId,
                damage,
                defeated,
            }
        });
    
        // Check win conditions
       const{gameOver, winner} = checkWinCondition(gameState);
       if (gameOver){
        io.emit('gameOver', {winner});
       }
    });
    

    socket.on('playerAction', (data) => {
        io.to(data.roomId).emit('updateGameState', data);
    });

    socket.on('enemyTurn', (enemyId, callback) => {
        const enemy = gameState.initiative.find(c => c.id === enemyId);
        const player = gameState.initiative.find(c => c.isPlayer);
    
        if (!enemy || !player) {
            return callback({ success: false, message: 'Invalid enemy or player not found.' });
        }
    
        // Move the enemy towards the player
        const moveResult = moveEnemyTowardsPlayer(enemy, player);
    
        // If the enemy is within range, attack
        if (moveResult.success) {
            const attackResult = enemyAttack(enemy, player);
            callback({ success: true, moveResult, attackResult });
        } else {
            callback({ success: false, message: 'Enemy movement failed.' });
        }
    
        // Emit updated state to all clients
        io.emit('stateUpdate', gameState);
    });


    socket.on('disconnect', () => {
        
    });


});


function generateInitiative(players){

    

    // takes in array of players from client side to determine how many are in game and on team
    const playerCount = players.length;

    const enemiesNeeded = playerCount == 1 ? 3 : 5;

    const enemies = createEnemies(enemiesNeeded);

    const initiative = [...players,...enemies].sort((a, b) => b.initiative - a.initiative);

    return initiative;
}

function createEnemies(count){
    const enemies = [];

    for (let i = 0; i < count; i++) {
      enemies.push({
        id: `${i + 1}`,
        name: `Goblin ${i + 1}`,
        x: Math.round((Math.random() * 501 + 100) / 50) * 50, // Range 100 to 600, snapped to nearest 50
        y: Math.round((Math.random() * 501 + 100) / 50) * 50, 
        health: 20,
        attack: 10,
        defense: 3,
        initiative: Math.floor(Math.random() * 20), // DnD style initiative roll
        isPlayer: false,
        distance: 5, 
        actionCount:2,
        currentActionCount:2,
        bonusActionCount: 1, 
        currentBonusActionCount:1, 
        currentDistance: 5, 
        currentHealth: 20,
        defeated:false

      });
    }

    return enemies;
}

function moveEnemyTowardsPlayer(enemy, player) {
    const distanceX = player.x - enemy.x;
    const distanceY = player.y - enemy.y;
    const moveDistance = 150; // Move 3 tiles per turn

    if (Math.abs(distanceX) > Math.abs(distanceY)) {
        enemy.x += Math.sign(distanceX) * moveDistance;
        enemy.x = Math.max(150, Math.min((gridSize * 9), enemy.x));
    } else {
        enemy.y += Math.sign(distanceY) * moveDistance;
        enemy.y = Math.max(150, Math.min((gridSize * 9), enemy.y));
    }

    return { success: true, newPosition: { x: enemy.x, y: enemy.y } };
}

// Helper function for enemy attack
function enemyAttack(enemy, player) {
    // Calculate damage
    const damage = Math.max(enemy.attack - player.defense, 1);
    player.currentHealth -= damage;
    
    console.log(`${enemy.name} attacks ${player.name} for ${damage} damage!`);
    
    // Check if the player is defeated
    let defeated = false;
    if (player.currentHealth <= 0) {
        defeated = true;
        console.log(`${player.name} has been defeated!`);
        gameState.initiative = gameState.initiative.filter(c => c.id !== player.id);
    }

    return { success: true, damage, defeated };
}

function checkWinCondition(gameState){
    const alivePlayers = gameState.initiative.filter(character => character.isPlayer && character.currentHealth > 0);
    const aliveEnemies = gameState.initiative.filter(character => !character.isPlayer && character.currentHealth > 0);

    if (aliveEnemies.length === 0) {
        // All enemies are defeated, players win
        return { gameOver: true, winner: 'players' };
    } else if (alivePlayers.length === 0) {
        // All players are defeated, enemies win
        return { gameOver: true, winner: 'enemies' };
    }

    return { gameOver: false };
}

const PORT = process.env.PORT || 3003;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
