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
    currentTurnIndex: 0, // Whose turn it is in initiative order
    initiative: [],
    activePlayerId: null, // Current turn's player ID
    isMultiplayer: false, // Whether it's a single or multiplayer session
    gameOver: false,
    playerWon: false,
}

io.on('connection', (socket) => {
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

        const player = gameState.initiative[gameState.currentTurnIndex];

        gameState.activePlayerId = player.id;

        if (!player.isPlayer){
            console.log('Enemy turn');
            enemyTurn(player.id);
        }
        else{
            io.to(data.gameId).emit('turnStart', gameState);

        }

    });

    socket.on('endTurn', () => {
        // gameState.currentTurnIndex = (gameState.currentTurnIndex + 1) % gameState.initiative.length;
        // io.to(data.gameId).emit('turnEnd', gameState);
        endTurn()
    });


   socket.on('playerMove', (data, callback) => {
    // Find the character in the global initiative array
    const charIndex = gameState.initiative.findIndex(c => c.id === data.char.id);
    if (charIndex === -1) {
        callback({ success: false, message: 'Character not found' });
        return;
    }
    const character = gameState.initiative[charIndex];


      // Occupancy check
    const occupied = gameState.initiative.some(c => c.id !== character.id && c.x === data.targetx && c.y === data.targety);
    if (occupied) {
        callback({ success: false, message: 'Tile occupied' });
        return;
    }

    const distance = Math.max(
        Math.abs(data.targetx - character.x) / gameState.gridSize,
        Math.abs(data.targety - character.y) / gameState.gridSize
    );

    if (distance <= character.currentDistance) {
        // Update character position in global state
        character.x = data.targetx;
        character.y = data.targety;
        character.currentDistance -= distance;

        // Optionally emit state update to all clients
        io.emit('stateUpdate', gameState);

        callback({ success: true, player: character });
    } else {
        callback({ success: false, message: 'Move too far' });
    }
});
    socket.on('playerAttack', ({ attackerId, targetId, distance }, callback) => {
        const attacker = gameState.initiative.find(c => c.id === attackerId);
        const target = gameState.initiative.find(c => c.id === targetId);
    
        // console.log(`Target health at start: ${target.currentHealth}`);
        if (!attacker || !target) return;
    
        // Check attack range
        if (distance > 2) return;

          // Check if attacker has action points left
    if (attacker.currentActionCount <= 0) {
        if (callback) callback({ success: false, message: 'No action points left' });
        return;
    }

    
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
            ...gameState,
            initiative: gameState.initiative,
            lastAttack: {
                attackerId,
                targetId,
                damage,
                defeated,
            },
            // currentTurnIndex: gameState.currentTurnIndex
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

function startTurn(){
     const currentPlayer = gameState.initiative[gameState.currentTurnIndex];

    if (currentPlayer && currentPlayer.isPlayer === false) {
        gameState.startingTurn = false;
        enemyTurn(currentPlayer.id);
    } else if (currentPlayer) {
        gameState.startingTurn = true;
        io.emit('stateUpdate', gameState);
    }
}

function endTurn(){

     // Advance turn index first
    if (gameState.initiative.length > 0) {
        gameState.currentTurnIndex = (gameState.currentTurnIndex + 1) % gameState.initiative.length;
    }

    // Now reset the points for the character whose turn is starting
    const nextCharacter = gameState.initiative[gameState.currentTurnIndex];
    if (nextCharacter) {
        nextCharacter.currentActionCount = nextCharacter.actionCount;
        nextCharacter.currentBonusActionCount = nextCharacter.bonusActionCount;
        nextCharacter.currentDistance = nextCharacter.distance;
    }
  

    // Mark turn as ending
    gameState.startingTurn = false;
    io.emit('stateUpdate', gameState);

    startTurn();
    
}

function enemyTurn(enemyId){

    const enemy = gameState.initiative.find(c => c.id === enemyId);
        const player = gameState.initiative.find(c => c.isPlayer);
    
        console.log(`Starting enemy at x: ${enemy.x}, y: ${enemy.y}`);
        if (!enemy || !player) {
            return callback({ success: false, message: 'Invalid enemy or player not found.' });
        }
    
        // Move the enemy towards the player
        const moveResult = moveEnemyTowardsPlayer(enemy, player);
        // console.log(moveResult)
    
        // If the enemy is within range, attack
        if (moveResult.success) {
            enemy.x = moveResult.newPosition.x;
            enemy.y = moveResult.newPosition.y;
            console.log(`Enemy now at x: ${enemy.x}, y: ${enemy.y}`);

            if(enemy.currentActionCount > 0){
                enemy.currentActionCount -= 1;
                const attackResult = enemyAttack(enemy, player);
                // handle calculation of damage to player

                if (attackResult.defeated) {
                    // Player is defeated
                    gameState.initiative = gameState.initiative.filter(c => c.id !== player.id);

                }
            }
        } 

        gameState.initiative = [...gameState.initiative]
        // console.log(gameState.initiative)
        // Emit updated state to all clients
        io.emit('stateUpdate', gameState);
        
        setTimeout(()=>{
            endTurn();
        }, 1000)
        
}

function moveEnemyTowardsPlayer(enemy, player) {
    const distanceX = player.x - enemy.x;
    const distanceY = player.y - enemy.y;
    const moveDistance = 150; // Move 3 tiles per turn

    if (Math.abs(distanceX) > Math.abs(distanceY)) {
        enemy.x += Math.sign(distanceX) * moveDistance;
        enemy.x = Math.max(150, Math.min((gameState.gridSize * 9), enemy.x));
    } else {
        enemy.y += Math.sign(distanceY) * moveDistance;
        enemy.y = Math.max(150, Math.min((gameState.gridSize * 9), enemy.y));
    }

    //   // Check if the new position is occupied
    // const occupied = gameState.initiative.some(c => c.id !== enemy.id && c.x === newX && c.y === newY);
    // if (occupied) {
    //     // Don't move if occupied
    //     return { success: false, newPosition: { x: enemy.x, y: enemy.y } };
    // }

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
