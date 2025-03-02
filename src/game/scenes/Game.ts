import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

interface Character {
    name: string;
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
}

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameText: Phaser.GameObjects.Text;

    // has user selected an action, and if so, is it an attack action, defense action, bonus action, or movement.
    actionSelectedTruthy: boolean;
    actionSelectedCase: string;

    movementHighlightLayer: Phaser.GameObjects.Graphics;
    isMoving: boolean;
    initiative: Character[] = [];
    currentTurnIndex: number = 0;
    selectedCharacter: Character;
    private gridSize = 50; // Each tile is 50x50 pixels
    private rows = 10;
    private cols = 10;
    private turnTextObjects: Phaser.GameObjects.Text[] = [];
    private initiativeHeader: Phaser.GameObjects.Text | null = null;

    private gameOver: boolean = false;
    private playerWon: boolean = false;


    constructor ()
    {
        super({key:'Game'});
    }

    create ()
    {


        this.generateMap();
        this.generateInitiative();
        this.setupCharacters();
        this.createTurnUI();
        this.createSkillUI()
        this.startTurn();
        
        

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

    // create characters and stats
    generateInitiative(): void {

        this.initiative = [
            { name: "Player 1", x: 100, y: 100, distance: 10, currentDistance: 10, attack: 20, defense: 20, currentHealth: 100, health: 100, initiative: Math.random() * 20, isPlayer:true, defeated:false },
            { name: "Enemy 1", x: 450, y: 450, distance: 10, currentDistance: 10, attack: 4, defense: 2, currentHealth: 40,health: 100, initiative: Math.random() * 20, isPlayer:false, defeated:false },
            { name: "Enemy 2", x: 500, y: 500, distance: 10, currentDistance: 10, attack: 10, defense: 5, currentHealth: 40,health: 100, initiative: Math.random() * 20, isPlayer:false, defeated:false },
            { name: "Enemy 3", x: 350, y: 250, distance: 10, currentDistance: 10, attack: 10, defense: 5, currentHealth: 40, health: 100,initiative: Math.random() * 20, isPlayer:false, defeated:false }
        ].sort((a, b) => b.initiative - a.initiative);
       
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
    
        
        // Create a new header
        this.initiativeHeader = this.add.text(800, 25, "INITIATIVE", headerStyle);
        this.turnTextObjects = this.initiative.map((char, index) => {
            return this.add.text(uiX, uiY + index * 30,  this.getCharacterStatusText(char, index), {
                fontSize: '20px',
                color: '#FF0000',
                backgroundColor: index === 0 ? '#ff0000' : '#FFFFFF' // Highlight current turn
            });
        });
    }

    // updateTurnUI(): void {

    //     this.turnTextObjects = this.initiative.map((char, index) => {
    //             return this.add.text(800, 50 + index * 30,  this.getCharacterStatusText(char, index), {
    //                 fontSize: '20px',
    //                 color: '#FF0000',
    //                 backgroundColor: index === 0 ? '#ff0000' : '#FFFFFF' // Highlight current turn
    //          });
    //     });
    //     debugger;
    //     this.turnTextObjects.forEach((textObj, index) => {
    //         const char = this.initiative[index];
    //         if (char.currentHealth > 0) {
    //             textObj.setText(this.getCharacterStatusText(char, index));
    
    //             // Highlight active character
    //             textObj.setStyle({
    //                 backgroundColor: index === 0 ? '#ff9999' : '#FFFFFF'
    //             });
    //         }
           
    //     });
    // }

    // generate initiative card text
    getCharacterStatusText(char: any, index: number): string {
        return `${char.name} ${char.currentHealth} / ${char.health}`;
    }

    // div for displaying BG3 style turn options

    createSkillUI(): void{

        const buttonStyle = { fontSize: '20px', color: '#ffffff', backgroundColor: '#333333', padding: { x: 10, y: 5 } };

        const attackButton = this.add.text(50, 10, "Attack", buttonStyle)
        .setInteractive()
        .on('pointerover', () => {
            attackButton.setBackgroundColor('#00ff00');  // Change to green on hover
        })
        .on('pointerout', () => {
            attackButton.setBackgroundColor('#ff0000');  // Revert to red when not hovering
        })
        .on('pointerdown', () => this.playerAttack());
    

        // Defend Button
        const defendButton = this.add.text(150, 10, "Defend", buttonStyle)
            .setInteractive()
            
            .on('pointerdown', () => this.playerDefend());

        // Skill Button
        const skillButton = this.add.text(250, 10, "Skill ", buttonStyle)
            .setInteractive()
            .on('pointerdown', () => this.playerUseSkill());

        const moveButton = this.add.text(350, 10, " Move ", buttonStyle)
            .setInteractive()
            .on('pointerover', () => {
                moveButton.setBackgroundColor('#0000ff');  // Change to green on hover
            })
            .on('pointerout', () => {
                moveButton.setBackgroundColor('#00ff00');  // Revert to red when not hovering
            })
            .on('pointerdown', () => this.engageMovement());

        const endTurnButton = this.add.text(450, 10, "End Turn", buttonStyle)
        .setInteractive()
        .on('pointerover', () => {
            endTurnButton.setBackgroundColor('#00ff00');  // Change to green on hover
        })
        .on('pointerout', () => {
            endTurnButton.setBackgroundColor('#bd0000');  // Revert to red when not hovering
        })
        .on('pointerdown', () => this.endTurn());

    

    // Improve visibility
    attackButton.setPadding(10).setStyle({ backgroundColor: '#ff0000' });
    defendButton.setPadding(10).setStyle({ backgroundColor: '#00ff00' });
    skillButton.setPadding(10).setStyle({ backgroundColor: '#0000ff' });
    moveButton.setPadding(10).setStyle({ backgroundColor: '#0000ff' });
    endTurnButton.setPadding(10).setStyle({ backgroundColor: '#bd0000' });


    }

    // put character sprites on map
    setupCharacters(): void {

        this.initiative.forEach((char, i) => {
            console.log(JSON.stringify(char, null, 2));

            //what is in char?
            char.sprite = this.add.sprite(char.x, char.y, (char.isPlayer == true ? 'wizard':'barbar')).setInteractive();
            char.sprite.on('pointerdown', () => {
                if (this.isCurrentTurn(char)) {
                    this.selectedCharacter = char;
                }
            });
        });
    }

    // highlight current player. if COM player, execute enemyAI logic
    startTurn(): void {
      
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

        if (!this.selectedCharacter.isPlayer) {
            this.takeTurn(this.selectedCharacter);
        }

        EventBus.emit('current-scene-ready', this);

    }

    engageMovement(): void {
        const player = this.selectedCharacter; // Assuming player is first in initiative
        if (!player) return;
    
        this.isMoving = true; // Enable movement mode
        
        this.highlightValidMovementTiles(); // 🔥 Highlight valid tiles    
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
                const targetX = player.x + dx * tileSize;
                const targetY = player.y + dy * tileSize;

                // console.log(`targetX: ${targetX}`)
                // console.log(`targetY: ${targetY}`)
    
                // Ensure within movement range using Manhattan distance
                if (Math.abs(dx) + Math.abs(dy) <= range) {
                    // debugger;
                    const x = targetX;
                    const y = targetY;
    
                    // console.log(`drawing highlight at ${x} and ${y}`)
                    this.movementHighlightLayer.fillStyle(0x00FF00, 0.5); // Green highlight (50% transparent)
                    this.movementHighlightLayer.fillRect(x, y, tileSize,tileSize);
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

        const player = this.selectedCharacter; // Get active player

        const distance = (Math.abs(targetX - player.x) / this.gridSize) + (Math.abs(targetY - player.y) / this.gridSize);
        
        // console.log(`targetX: ${targetX} and target Y: ${targetY}`)
        // console.log(`playerX: ${player.x} and player Y: ${player.y}`)
        // console.log(`total movement: ${distance} and remaining movement: ${player.currentDistance}`)

        if (distance <= player.currentDistance) {
            player.x = targetX;
            player.y = targetX;
            player.currentDistance -= distance;
            this.selectedCharacter.sprite?.setPosition(targetX, targetY);
            this.highlightValidMovementTiles(); // 🔥 Highlight valid tiles    
            this.createTurnUI(); // Refresh UI after moving
        } else {
            // console.log("Not enough movement left!");
        }
        
    }

    // move initiative forward 
    endTurn(): void {
        this.currentTurnIndex = (this.currentTurnIndex + 1) % this.initiative.length;
        this.isMoving = false; // Disable movement mode
        this.movementHighlightLayer.clear(); // Remove previous highlights
        this.selectedCharacter.currentDistance = this.selectedCharacter.distance
        this.startTurn();
    }

    isCurrentTurn(char: Character): boolean {
        return this.initiative[this.currentTurnIndex] === char;
    }

    // enemy logic
    takeTurn(enemy: any): void {
        console.log(`${enemy.name} is taking its turn.`);

        // Example AI: Move toward the player if within range
        const player = this.initiative.find((char: any) => char.isPlayer);

        if (player) {
            Game.moveTowards(enemy, player);
        }

        // End turn after movement/action
        setTimeout(() => {

            this.endTurn();

        },1000)

    }

    // attack enemy
    playerAttack(): void {
        console.log('attacking')
        const player = this.selectedCharacter;
        if (!player.isPlayer) return; // Only allow player to attack
    
        // Find adjacent enemies (distance check)
        const adjacentEnemies = this.initiative.filter(enemy => 
            !enemy.isPlayer &&
            Math.abs(enemy.x - player.x) <= this.gridSize &&
            Math.abs(enemy.y - player.y) <= this.gridSize
        );
    
        if (adjacentEnemies.length === 0) {
            console.log("No enemies nearby to attack!");
            return;
        }
    
        // Select the first adjacent enemy to attack
        const target = adjacentEnemies[0];
    
        // Calculate damage
        const damage = Math.max(player.attack - target.defense, 1);
        target.currentHealth -= damage;
        console.log('brought opponent down to health level ' + target.currentHealth)
    
        console.log(`${player.name} attacks ${target.name} for ${damage} damage!`);
        
        // Check if the enemy is defeated
        if (target.currentHealth <= 0) {
            console.log(`${target.name} has been defeated!`);
            debugger;
            target.sprite?.destroy()
            this.initiative = this.initiative.filter(char => char.currentHealth > 0);

            this.checkWinConditions();
        }
    
        this.createTurnUI();
        // this.endTurn(); // Move to the next turn after attack
    }


    playerDefend(): void {
        console.log('defending')
    }

    playerUseSkill(): void {
        console.log("skill")
    }

    checkWinConditions(): void {
        // if any values in initiative exist where isPlayer = false, the game is not won yet

        if(this.initiative.length < 2 && this.initiative[0].isPlayer === true){
            this.add.text(800, 500, "YOU WIN")
            this.playerWon = true;
            this.gameOver = true;

        }
    }

    static moveTowards(enemy: any, target: any) {
        const distanceX = target.x - enemy.x;
        const distanceY = target.y - enemy.y;
        const moveDistance = 150; // Move 3 tile per turn

        // Move closer to the player in X or Y direction
        if (Math.abs(distanceX) > Math.abs(distanceY)) {
            enemy.x += Math.sign(distanceX) * moveDistance;
        } else {
            enemy.y += Math.sign(distanceY) * moveDistance;
        }

        enemy.sprite?.setPosition(enemy.x, enemy.y);
    }

    changeScene ()
    {
        this.scene.start('GameOver');
    }
}
