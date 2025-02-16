import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

interface Character {
    name: string;
    initiative: number;
    x: number;
    y: number;
    isPlayer: boolean;
    sprite?: Phaser.GameObjects.Sprite;
    health: number;
    currentHealth: number;
    attack: number;
    defense: number;
    // hexLocation: number;
}

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameText: Phaser.GameObjects.Text;
    initiative: Character[] = [];
    currentTurnIndex: number = 0;
    selectedCharacter: Character | null = null;
    private gridSize = 64; // Each tile is 64x64 pixels
    private rows = 10;
    private cols = 10;
    private turnTextObjects: Phaser.GameObjects.Text[] = [];

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
                
                // Add interactivity to tiles
                tile.setInteractive();
                tile.on('pointerdown', () => this.moveSelectedCharacter(x, y));
            }
        }
    }

    // create characters and stats
    generateInitiative(): void {

        
        this.initiative = [
            { name: "Player 1", x: 100, y: 100, attack: 20, defense: 20, currentHealth: 100, health: 100, initiative: Math.random() * 20, isPlayer:true },
            { name: "Enemy 1", x: 400, y: 400, attack: 4, defense: 2, currentHealth: 40,health: 100, initiative: Math.random() * 20, isPlayer:false },
            { name: "Enemy 2", x: 600, y: 200, attack: 10, defense: 5, currentHealth: 40,health: 100, initiative: Math.random() * 20, isPlayer:false },
            { name: "Enemy 3", x: 200, y: 400, attack: 10, defense: 5, currentHealth: 40, health: 100,initiative: Math.random() * 20, isPlayer:false }
        ].sort((a, b) => b.initiative - a.initiative);

       
    }

    // div for displaying current turn
    createTurnUI(): void {
        const uiX = 800; // Adjust for positioning
        const uiY = 50;
    
        this.turnTextObjects = this.initiative.map((char, index) => {
            return this.add.text(uiX, uiY + index * 30, `${char.name} ${char.currentHealth} / ${char.health} `, {
                fontSize: '20px',
                color: '#FF0000',
                backgroundColor: index === 0 ? '#ff0000' : '#FFFFFF' // Highlight current turn
            });
        });
    }


    // div for displaying BG3 style turn options

    createSkillUI(): void{

        const buttonStyle = { fontSize: '20px', color: '#ffffff', backgroundColor: '#333333', padding: { x: 10, y: 5 } };

        const attackButton = this.add.text(50, 10, "Attack", buttonStyle)
        .setInteractive()
        .on('pointerdown', () => this.playerAttack());

    // Defend Button
    const defendButton = this.add.text(150, 10, "Defend", buttonStyle)
        .setInteractive()
        .on('pointerdown', () => this.playerDefend());

    // Skill Button
    const skillButton = this.add.text(250, 10, "Skill", buttonStyle)
        .setInteractive()
        .on('pointerdown', () => this.playerUseSkill());

    // Improve visibility
    attackButton.setPadding(10).setStyle({ backgroundColor: '#ff0000' });
    defendButton.setPadding(10).setStyle({ backgroundColor: '#00ff00' });
    skillButton.setPadding(10).setStyle({ backgroundColor: '#0000ff' });

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

    // make movement on grid within 10 places
    moveSelectedCharacter(targetX: number, targetY: number): void {
        if (!this.selectedCharacter) return;

        // Calculate how many grid spaces away the move is
        const gridX = Math.abs(targetX - this.selectedCharacter.x) / this.gridSize;
        const gridY = Math.abs(targetY - this.selectedCharacter.y) / this.gridSize;
        const distance = gridX + gridY; // Manhattan Distance

        if (distance <= 10) {
            this.selectedCharacter.sprite?.setPosition(targetX, targetY);
            this.selectedCharacter.x = targetX;
            this.selectedCharacter.y = targetY;
            this.endTurn();
        }
    }

    // move initiative forward 
    endTurn(): void {
        this.currentTurnIndex = (this.currentTurnIndex + 1) % this.initiative.length;
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
            Math.abs(enemy.x - player.x) <= 64 &&
            Math.abs(enemy.y - player.y) <= 64
        );
    
        if (adjacentEnemies.length === 0) {
            console.log("No enemies nearby to attack!");
            return;
        }
    
        // Select the first adjacent enemy to attack
        const target = adjacentEnemies[0];
    
        // Calculate damage
        const damage = Math.max(player.attack - target.defense, 1);
        target.health -= damage;
    
        console.log(`${player.name} attacks ${target.name} for ${damage} damage!`);
        
        // Check if the enemy is defeated
        if (target.health <= 0) {
            console.log(`${target.name} has been defeated!`);
            this.initiative = this.initiative.filter(char => char !== target);
        }
    
        this.endTurn(); // Move to the next turn after attack
    }

    playerDefend(): void {
        console.log('defending')
    }

    playerUseSkill(): void {
        console.log("skill")
    }

    static moveTowards(enemy: any, target: any) {
        const distanceX = target.x - enemy.x;
        const distanceY = target.y - enemy.y;
        const moveDistance = 64; // Move 1 tile per turn

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
