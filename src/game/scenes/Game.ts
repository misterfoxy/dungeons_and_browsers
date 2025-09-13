import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { io, Socket} from 'socket.io-client';


interface Character {
    name: string;
    id: string,
    initiative: number;
    x: number;
    y: number;
    isPlayer: boolean;
    defeated: boolean;
    sprite?: Phaser.GameObjects.Sprite;
    health: number;
    currentHealth: number;
    attack: number;
    defense: number;
    distance: number;
    currentDistance: number;
    actionCount: number;
    currentActionCount: number;
    bonusActionCount: number;
    currentBonusActionCount: number;
}

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameText: Phaser.GameObjects.Text;

    movementHighlightLayer: Phaser.GameObjects.Graphics;
    isMoving: boolean = false;
    isAttacking: boolean = false;
    initiative: Character[] = [];
    currentTurnIndex: number = 0;
    selectedCharacter: Character;
    private gridSize = 50; // Each tile is 50x50 pixels
    private rows = 14;
    private cols = 14;
    private turnTextObjects: Phaser.GameObjects.Text[] = [];
    private initiativeHeader: Phaser.GameObjects.Text | null = null;
    private bgMusic!: Phaser.Sound.BaseSound;
    private gameOver: boolean = false;
    private playerWon: boolean = false;

    private socket!: Socket;
    private spriteMap: Map<string, Phaser.GameObjects.Sprite> = new Map();

    constructor ()
    {
        super({key:'Game'});
        const socket = io('http://localhost:3003');

    }

    create ()
    {

        this.socket = io('http://localhost:3003');

        this.socket.on('connect', () => {
            console.log('---');
        });
     
        const gameStartPayload = {
            players: [
                { name: "Player 1", id:0, x: 200, y: 350, distance: 5, actionCount:2,currentActionCount:2,bonusActionCount: 1, currentBonusActionCount:1, currentDistance: 5, attack: 20, defense: 5, currentHealth: 50, health: 50, initiative: 20, isPlayer:true, defeated:false },
                { name: "Player 2", id:10, x: 300, y: 350, distance: 5, actionCount:2,currentActionCount:2,bonusActionCount: 1, currentBonusActionCount:1, currentDistance: 5, attack: 20, defense: 5, currentHealth: 50, health: 50, initiative: 6, isPlayer:true, defeated:false },

            ],
            map: 'map0'
        }
        this.socket.emit('createGame',gameStartPayload);
        
        this.socket.on('gameCreated', (gameState) => {
            this.initiative = gameState.initiative;

            this.generateMap();
            this.setupCharacters();
            this.createTurnUI();
            this.createSkillUI()
            // this.startMusic();
            this.startTurn();
        });
        
        this.socket.on('playerJoined', (game) => {
            console.log('Player joined:', game);
        });

        
        
        this.socket.off('stateUpdate'); // Ensure no duplicate listeners
        this.socket.on('stateUpdate', (newState) => {
            // Merge character data without losing sprite references
            debugger;
            newState.initiative.forEach(updatedChar => {
                const existingChar = this.initiative.find(c => c.id === updatedChar.id);
                if (existingChar) {
                    Object.assign(existingChar, updatedChar);
                } else {
                    this.initiative.push(updatedChar); // Handle new character
                }
            });
        
            // Remove any characters no longer in the initiative
            this.initiative = this.initiative.filter(char =>
                newState.initiative.some(updated => updated.id === char.id)
            );
        
            this.currentTurnIndex = newState.currentTurnIndex;
            this.selectedCharacter = this.initiative[this.currentTurnIndex];
        
            // Always update characters
            this.setupCharacters();
        
            if (newState.lastAttack) {
                const { attackerId, targetId, damage, defeated } = newState.lastAttack;
                const attacker = this.initiative.find(c => c.id === attackerId);
                const target = this.initiative.find(c => c.id === targetId);
        
                if (attacker && target) {
                    this.tweens.add({
                        targets: attacker.sprite,
                        x: attacker.x + 5,
                        yoyo: true,
                        duration: 50,
                        repeat: 2
                    });
        
                    this.time.delayedCall(200, () => {
                        target.sprite?.setTint(0xff0000);
                        this.sound.play('attack_fx');
                        this.time.delayedCall(150, () => target.sprite?.clearTint());
                    });
        
                    if (defeated) {
                        target.sprite?.destroy();
                    }
                }
            }
        
            if (this.initiative[this.currentTurnIndex]?.isPlayer && newState.startingTurn === true) {
                this.startTurn();
            }
        
            this.createTurnUI();
        });
        

        this.socket.on('gameOver', (data) => {
            if (data.winner === 'players') {
                this.scene.start('YouWin');
            } else if (data.winner === 'enemies') {
                this.scene.start('GameOver');
            }
        });

    }

    // build map and interactivity
    generateMap(){


        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                let x = col * this.gridSize + 100;
                let y = row * this.gridSize + 100;

                const tile = this.add.image(x, y, 'hex').setOrigin(0.5);
                tile.setScale(0.5)

                // Add interactivity to tiles
                tile.setInteractive();
                tile.on('pointerdown', () => this.moveSelectedCharacter(x, y));
            }
        }


        this.movementHighlightLayer = this.add.graphics({ fillStyle: { color: 0x00FF00, alpha: 0.5 } });
        this.movementHighlightLayer.setDepth(100); // Ensure highlights appear above hex images

        
    }

    // div for displaying current turn
    createTurnUI(): void {
        const uiX = 800; // Adjust for positioning
        const uiY = 50;
        
        const headerStyle = { fontSize: '20px', color: '#ffffff', backgroundColor: '#333333', padding: { x: 10, y: 5 } };
    
        // Clear existing UI elements
        if (this.turnTextObjects) {
            this.turnTextObjects.forEach(textObj => textObj.destroy());
        }
    
        // Remove header if necessary (optional)
        if (this.initiativeHeader) {
            this.initiativeHeader.destroy();
        }

        if(this.selectedCharacter){
            this.add.text(800,450,`Moves Left:${this.selectedCharacter.currentDistance}`, headerStyle)
        }

        else if(!this.selectedCharacter){
            this.add.text(800,450,`Moves Left: 0`, headerStyle)
        }

        if(this.selectedCharacter){
            this.add.text(800,500,`Actions Left:${this.selectedCharacter.currentActionCount}`, headerStyle)
        }

        else if(!this.selectedCharacter){
            this.add.text(800,500,`Actions Left: 0`, headerStyle)
        }

        if (this.selectedCharacter){
            this.add.text(800,550,`Bonus Actions Left:${this.selectedCharacter.currentBonusActionCount}`, headerStyle)
        }
        
        else if(!this.selectedCharacter){
            this.add.text(800,550,`Bonus Actions Left: 0`, headerStyle)
        }
    
        
        // Create a new header
        this.initiativeHeader = this.add.text(800, 25, "INITIATIVE", headerStyle);
        this.turnTextObjects = this.initiative.map((char, index) => {
            return this.add.text(uiX, uiY + index * 30,  this.getCharacterStatusText(char, index), {
                fontSize: '20px',
                color: '#FF0000',
                backgroundColor: index === this.currentTurnIndex ? '#00ffff' : '#FFFFFF' // Highlight current turn
            });
        });

       
    }


    // generate initiative card text
    getCharacterStatusText(char: any, index: number): string {
        return `${char.name} ${char.currentHealth} / ${char.health}`;
    }

    // div for displaying BG3 style turn options

    createSkillUI(): void{

        const buttonStyle = { fontSize: '20px', color: '#ffffff', backgroundColor: '#333333', padding: { x: 10, y: 5 } };

        const attackButton = this.add.text(50, 10, "Attack Action", buttonStyle)
        .setInteractive()
        .on('pointerover', () => {
            attackButton.setBackgroundColor('#00ff00');  // Change to green on hover
        })
        .on('pointerout', () => {
            attackButton.setBackgroundColor('#ff0000');  // Revert to red when not hovering
        })
        .on('pointerdown', () => this.playerAttack());
    

        // // Defend Button
        // const defendButton = this.add.text(150, 10, "Defend", buttonStyle)
        //     .setInteractive()
            
        //     .on('pointerdown', () => this.playerDefend());

        // Skill Button
        const skillButton = this.add.text(250, 10, "Bonus Action", buttonStyle)
            .setInteractive()
            .on('pointerdown', () => this.playerUseSkill());

        const moveButton = this.add.text(450, 10, " Move ", buttonStyle)
            .setInteractive()
            .on('pointerover', () => {
                moveButton.setBackgroundColor('#0000ff');  // Change to green on hover
            })
            .on('pointerout', () => {
                moveButton.setBackgroundColor('#00ff00');  // Revert to red when not hovering
            })
            .on('pointerdown', () => this.engageMovement());

        const endTurnButton = this.add.text(650, 10, "End Turn", buttonStyle)
        .setInteractive()
        .on('pointerover', () => {
            endTurnButton.setBackgroundColor('#00ff00');  // Change to green on hover
        })
        .on('pointerout', () => {
            endTurnButton.setBackgroundColor('#bd0000');  // Revert to red when not hovering
        })
        .on('pointerdown', () => this.endTurn());

    

        // Improve visibility of buttons
        attackButton.setPadding(10).setStyle({ backgroundColor: '#ff0000' });
        // defendButton.setPadding(10).setStyle({ backgroundColor: '#00ff00' });
        skillButton.setPadding(10).setStyle({ backgroundColor: '#0000ff' });
        moveButton.setPadding(10).setStyle({ backgroundColor: '#0000ff' });
        endTurnButton.setPadding(10).setStyle({ backgroundColor: '#bd0000' });


    }

    startMusic(): void{
        if (this.cache.audio.has("bgMusic")) {
            console.log("Audio found, playing...");
            this.bgMusic = this.sound.add("bgMusic", { loop: true, volume: 0.5 });
            this.bgMusic.play();
        } else {
            console.error("bgMusic not found!");
        }
    }
    // put character sprites on map
    setupCharacters(): void {
        this.initiative.forEach((char, i) => {

            let sprite = this.spriteMap.get(char.id);
            if (!sprite) {
                // Create a new sprite if none exists for this character ID
                sprite = this.add.sprite(char.x, char.y, char.isPlayer ? 'wizard' : 'barbar').setInteractive();
    
                // Store in map
                this.spriteMap.set(char.id, sprite);
    
                sprite.on('pointerdown', () => this.handleEnemyClick(char));
            } else {
                // Just update position if sprite already exists
                sprite.setPosition(char.x, char.y);
            }
    
            // Link the existing sprite back to the character object
            char.sprite = sprite;
        });
    
        // Clean up any stale sprites (e.g., for defeated characters)
        this.spriteMap.forEach((sprite, id) => {
            if (!this.initiative.some(char => char.id === id)) {
                sprite.destroy(); // Remove sprite if no longer in the initiative
                this.spriteMap.delete(id);
            }
        });
    }

    handleEnemyClick(target: Character): void {

        if (!this.isAttacking){
            this.clearAttackHighlights();
            return;
        } 

        const player = this.selectedCharacter;
        if (!player || !player.isPlayer) return
        
        const distance = (Math.max(Math.abs(player.x - target.x), Math.abs(player.y - target.y))/this.gridSize);


        this.socket.emit(
            'playerAttack',
             {attackerId: player.id, targetId: target.id, distance: distance})
    
    }


    // highlight current player. if COM player, execute enemyAI logic
    startTurn(): void {
        debugger;
        this.initiative.forEach((char) => {
            char.sprite?.clearTint(); // Remove tint from all characters
        });
    
        this.selectedCharacter = this.initiative[this.currentTurnIndex];
        this.selectedCharacter.sprite?.setTint(0xffff00);

        this.turnTextObjects.forEach((text, index) => {
            if (index === this.currentTurnIndex) {
                text.setBackgroundColor('#ffff00'); // Highlight active turn
            } else {
                text.setBackgroundColor('#000000');
            }
        });
        
        this.turnTextObjects.forEach((text, index) => {
            text.setBackgroundColor(index === this.currentTurnIndex ? '#ffff00' : '#000000');
        });


        // this.socket.emit('startTurn', this.initiative[this.currentTurnIndex].id);
       
        // if (!this.selectedCharacter.isPlayer) {
        //     this.takeTurn(this.selectedCharacter);
        // }

        EventBus.emit('current-scene-ready', this);

    }

    engageMovement(): void {

        this.isAttacking = false;
        this.isMoving = true; // Enable movement mode

        this.clearAttackHighlights();
        this.highlightValidMovementTiles(); 

    }

    highlightValidMovementTiles(): void {
        this.movementHighlightLayer.clear(); // Remove old highlights
        
        const player = this.selectedCharacter; // Get active player
        if (!player) return;
    

        const range = player.currentDistance; // Number of squares the player can move
        const tileSize = this.gridSize; // Adjust based on your grid size
        
        for (let dx = -range; dx <= range; dx++) {
            for (let dy = -range; dy <= range; dy++) {

                // calculating places we could possibly go, starting from furthest left and down up through most up and right
                const targetX = player.x + (dx * tileSize);
                const targetY = player.y + (dy * tileSize);

            
    
                // Ensure within movement range using euclid distance
                if (
                    Math.max(Math.abs(targetX-player.x),Math.abs(targetY - player.y)) <= (range * tileSize)
                    && (targetX >= 100 && targetX <= 550 && targetY >= 100 && targetY <= 550)
                    && player.currentDistance>0
                    && !(this.initiative.some(char => char.x === targetX && char.y === targetY))

                
                ) {

                    const x = targetX;
                    const y = targetY;
    
                    // console.log(`drawing highlight at ${x} and ${y}`)
                    this.movementHighlightLayer.fillStyle(0x00FF00, 0.5); // Green highlight (50% transparent)
                    this.movementHighlightLayer.fillRect(x-25, y-25, tileSize,tileSize);
                }
                else{
                    // console.log('out of range')
                }
            }
        }
    }
    

    // make movement on grid 
    moveSelectedCharacter(targetX: number, targetY: number): void {

        if (!this.isMoving) return; // Only move if in movement mode

        this.socket.emit('playerMove',{char: this.selectedCharacter, currentx:this.selectedCharacter.x,currenty:this.selectedCharacter.y,targetx:targetX,targety:targetY},
            (response: any) => {
                if (response.success){
                    this.sound.play('steps_fx');
                    debugger;
                    this.selectedCharacter.currentDistance = response.player.currentDistance;
                    this.selectedCharacter.x = targetX;
                    this.selectedCharacter.y = targetY;
        
                    this.selectedCharacter.sprite?.setPosition(targetX, targetY);
                    this.isMoving = !this.isMoving
                    this.movementHighlightLayer.clear(); // Remove old highlights
                    this.createTurnUI(); // Refresh UI after moving
                }
                else{
                    console.log('invalid move, try again')

                }
            }
        )
        

        
    }

    // move initiative forward 
    endTurn(): void {
       debugger;
    this.isMoving = false; // Disable movement mode
    this.isAttacking = false;
    this.movementHighlightLayer.clear(); // Remove previous highlights

    if (this.selectedCharacter) {
        this.selectedCharacter.currentDistance = this.selectedCharacter.distance;
        this.selectedCharacter.currentActionCount = this.selectedCharacter.actionCount;
    } else {
        console.warn('endTurn: selectedCharacter is undefined');
    }

    this.socket.emit('endTurn');
        
    }

    isCurrentTurn(char: Character): boolean {
        return this.initiative[this.currentTurnIndex] === char;
    }

   

    // attack enemy
    playerAttack(): void {
        const player = this.selectedCharacter;
          if (!player || !player.isPlayer || player.currentActionCount==0) return; 
        this.isMoving = false; // Disable movement mode
      
        
        const data = {
            roomId: 'room-123', 
            action: 'attack',
            targetId: this.selectedCharacter.id
        };
    
        this.socket.emit('playerAction', data);

    // Set a flag to track attack mode
        this.isAttacking = true;

    // Highlight valid attack range (Optional UI improvement)
        this.highlightAttackableEnemies(player);
    
    }

    highlightAttackableEnemies(player: Character): void {
        this.initiative.forEach(enemy => {
            if (!enemy.isPlayer) {

                const distance = (Math.max(Math.abs(player.x - enemy.x), Math.abs(player.y - enemy.y))/this.gridSize);
                if (distance <= 2){
                    enemy.sprite?.setTint(0xffff00);
                }
            }

        });

        
    }

    clearAttackHighlights(): void {
        this.initiative.forEach(char => {
            if (!char.isPlayer) {
                char.sprite?.clearTint(); // Reset tint to default
            }
        });
    }


    playerUseSkill(): void {
        console.log("skill")
    }


    changeScene ()
    {
        this.scene.start('GameOver');
    }
}