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

    // has user selected an action, and if so, is it an attack action, defense action, bonus action, or movement.
    actionSelectedTruthy: boolean;
    actionSelectedCase: string;
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
        // this.startMusic();
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
            { name: "Player 1", x: 200, y: 350, distance: 5, actionCount:2,currentActionCount:2,bonusActionCount: 1, currentBonusActionCount:1, currentDistance: 5, attack: 20, defense: 5, currentHealth: 50, health: 50, initiative: Math.random() * 20, isPlayer:true, defeated:false },
            { name: "Enemy 1", x: 150, y: 150, distance: 5,actionCount:1,currentActionCount:1,bonusActionCount: 1, currentBonusActionCount:1, currentDistance: 5, attack: 10, defense: 5, currentHealth: 20,health: 20, initiative: Math.random() * 20, isPlayer:false, defeated:false },
            { name: "Enemy 2", x: 500, y: 200, distance: 5,actionCount:1,currentActionCount:1,bonusActionCount: 1, currentBonusActionCount:1, currentDistance: 5, attack: 10, defense: 5, currentHealth: 20,health: 20, initiative: Math.random() * 20, isPlayer:false, defeated:false },
            { name: "Enemy 3", x: 350, y: 150, distance: 5,actionCount:1,currentActionCount:1,bonusActionCount: 1, currentBonusActionCount:1, currentDistance: 5, attack: 10, defense: 5, currentHealth: 20, health: 20,initiative: Math.random() * 20, isPlayer:false, defeated:false }
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
                backgroundColor: index === 0 ? '#00ff00' : '#FFFFFF' // Highlight current turn
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
            
            char.sprite = this.add.sprite(char.x, char.y, (char.isPlayer == true ? 'wizard':'barbar')).setInteractive();
            
            // char.sprite.on('pointerdown', () => {
                
                
            //     if (this.isCurrentTurn(char)) {
            //         this.selectedCharacter = char;
            //     }
            // });

            char.sprite.on("pointerdown", () => this.handleEnemyClick(char));
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

        if (distance > 2){
            console.log("too far, move closer")
            return;
        }

        // attacking and damage logic

        this.tweens.add({
            targets: player.sprite,
            x: player.x + 5, // Small movement to the right
            yoyo: true,
            duration: 50,
            repeat: 2
        });

        this.time.delayedCall(200, () => {
            // Flash enemy sprite red
            const originalTint = target.sprite?.tint;
            target.sprite?.setTint(0xff0000);
            this.sound.play('attack_fx');

    
            this.time.delayedCall(150, () => {
                target.sprite?.clearTint(); // Remove tint after flash
                this.clearAttackHighlights();

            });
    
            // Calculate damage
            const damage = Math.max(player.attack - target.defense, 1);
            target.currentHealth -= damage;
            player.currentActionCount -= 1;
            console.log(`${player.name} attacks ${target.name} for ${damage} damage!`);
            
            // remove "attack mode"
            this.isAttacking = false

    
            // Check if the enemy is defeated
            if (target.currentHealth <= 0) {
                console.log(`${target.name} has been defeated!`);
                target.sprite?.destroy();
                this.initiative = this.initiative.filter(char => char.currentHealth > 0);
                this.checkWinConditions();
            }
    
            this.createTurnUI();
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
                const targetX = player.x + (dx * tileSize);
                const targetY = player.y + (dy * tileSize);

                // console.log(`targetX: ${targetX}`)
                // console.log(`targetY: ${targetY}`)
    
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

        const player = this.selectedCharacter; // Get active player

        const distance = Math.max(Math.abs(targetX - player.x) / this.gridSize,Math.abs(targetY - player.y) / this.gridSize);
        

        if (distance <= player.currentDistance) {
            this.sound.play('steps_fx');
            player.x = targetX;
            player.y = targetY;
            player.currentDistance -= distance;
            this.selectedCharacter.sprite?.setPosition(targetX, targetY);
            this.isMoving = !this.isMoving
            this.movementHighlightLayer.clear(); // Remove old highlights
            this.createTurnUI(); // Refresh UI after moving
        } else {
            console.log("Not enough movement left!");
        }
        
    }

    // move initiative forward 
    endTurn(): void {
        this.currentTurnIndex = (this.currentTurnIndex + 1) % this.initiative.length;
        this.isMoving = false; // Disable movement mode
        this.movementHighlightLayer.clear(); // Remove previous highlights
        this.selectedCharacter.currentDistance = this.selectedCharacter.distance
        this.selectedCharacter.currentActionCount = this.selectedCharacter.actionCount;
        if(!this.gameOver){
            this.startTurn();   
        }
        
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
            this.moveTowards(enemy, player);
        }

        // End turn after movement/action
        setTimeout(() => {

            this.endTurn();

        },1000)

    }

    // attack enemy
    playerAttack(): void {
        const player = this.selectedCharacter;
        if (!player || !player.isPlayer || player.currentActionCount==0) return; 

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

    handleAttack(player: any, target: any): void{

        const distance = Phaser.Math.Distance.Between(player.x, player.y, target.x, target.y);
        if (distance > this.gridSize + 10) { // Small buffer for precision
            console.log('Target is too far away!');
            return;
        }

        console.log(`${player.name} attacks ${target.name}!`);

        // Shake player sprite to indicate attack
        this.tweens.add({
            targets: player.sprite,
            x: player.x + 5,
            yoyo: true,
            duration: 50,
            repeat: 2
        });
    
        // Delay damage for better animation timing
        this.time.delayedCall(200, () => {
            // Flash the enemy sprite red briefly
            const originalTint = target.sprite.tint;
            target.sprite.setTint(0xff0000);
            this.time.delayedCall(150, () => target.sprite.clearTint());
    
            // Calculate and apply damage
            const damage = Math.max(player.attack - target.defense, 1);
            target.currentHealth -= damage;
            console.log(`${target.name} takes ${damage} damage!`);
    
            // Check if the enemy is defeated
            if (target.currentHealth <= 0) {
                console.log(`${target.name} has been defeated!`);
                this.sound.play('death_fx');

                target.sprite?.destroy();
                this.initiative = this.initiative.filter(char => char.currentHealth > 0);
                this.checkWinConditions();
            }
    
            this.createTurnUI();
    
            // Remove event listeners after attack
            this.initiative.forEach(character => character.sprite?.off('pointerdown'));
    
        });

    }
    playerDefend(): void {
        console.log('defending')
    }

    playerUseSkill(): void {
        console.log("skill")
    }

    checkWinConditions(): void {
        // if any values in initiative exist where isPlayer = false, the game is not won yet

        if(this.initiative.filter(character => character.isPlayer).length === 0){
            
            this.playerWon = true;
            this.gameOver = true;
            this.scene.start('GameOver');

        }
        
        else if(this.initiative.length < 2 && this.initiative[0].isPlayer === true){
            
            this.playerWon = true;
            this.gameOver = true;
            this.scene.start('YouWin');

        }

    }
    

    moveTowards(enemy: any, target: any): void {

        const distanceX = target.x - enemy.x;
        const distanceY = target.y - enemy.y;
        const moveDistance = 150; // Move 3 tile per turn

        // Move closer to the player in X or Y direction
        if (Math.abs(distanceX) > Math.abs(distanceY)) {
            enemy.x += Math.sign(distanceX) * moveDistance;
            enemy.x = Math.max(150, Math.min((this.gridSize * 9), enemy.x));
        } else {
            enemy.y += Math.sign(distanceY) * moveDistance;
            enemy.y = Math.max(150, Math.min((this.gridSize * 9), enemy.y));
        }

        // ✅ Constrain enemy within grid boundaries
        // enemy.x = Math.max(50, Math.min((this.gridSize * 9), enemy.x));
        // enemy.y = Math.max(50, Math.min((this.gridSize * 9), enemy.y));
        this.sound.play('steps_fx');
        enemy.sprite?.setPosition(enemy.x, enemy.y);

        // ✅ Check for attack range after repositioning
        const player = this.initiative.find(char => char.isPlayer);
        const distance = (Math.max(Math.abs(player.x - enemy.x), Math.abs(player.y - enemy.y))/this.gridSize);

        if (distance <= 2){
            this.enemyAttack(enemy,player);
        }
    }

    enemyAttack(enemy: any, target: any): void {
        // find player character
        // attack player character
        debugger;
        // attacking and damage logic

        this.tweens.add({
            targets: enemy.sprite,
            x: enemy.x + 5, // Small movement to the right
            yoyo: true,
            duration: 50,
            repeat: 2
        });

        this.time.delayedCall(200, () => {
            // Flash enemy sprite red
            const originalTint = target.sprite?.tint;
            target.sprite?.setTint(0xff0000);
            this.sound.play('attack_fx');

    
            this.time.delayedCall(150, () => {
                target.sprite?.clearTint(); // Remove tint after flash
                this.clearAttackHighlights();
            });
    
            // Calculate damage
            const damage = Math.max(enemy.attack - target.defense, 1);
            target.currentHealth -= damage;
            console.log(`${enemy.name} attacks ${target.name} for ${damage} damage!`);
            
            // remove "attack mode"
            this.isAttacking = false
    
            // Check if the enemy is defeated
            if (target.currentHealth <= 0) {
                console.log(`${target.name} has been defeated!`);
                target.sprite?.destroy();
                this.initiative = this.initiative.filter(char => char.currentHealth > 0);
                this.checkWinConditions();
            }
    
            this.createTurnUI();

        });
    }

    changeScene ()
    {
        this.scene.start('GameOver');
    }
}
