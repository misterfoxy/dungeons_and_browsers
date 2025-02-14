import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

interface Character {
    name: string;
    initiative: number;
    x: number;
    y: number;
    isPlayer: boolean;
    sprite?: Phaser.GameObjects.Sprite;
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
        this.startTurn();

    }

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

    generateInitiative(): void {

        
        this.initiative = [
            { name: "Player 1", x: 100, y: 100, initiative: Math.random() * 20, isPlayer:true },
            { name: "Enemy 1", x: 400, y: 400, initiative: Math.random() * 20, isPlayer:false },
            { name: "Enemy 2", x: 600, y: 200, initiative: Math.random() * 20, isPlayer:false },
            { name: "Enemy 3", x: 200, y: 400, initiative: Math.random() * 20, isPlayer:false }
        ].sort((a, b) => b.initiative - a.initiative);
    }

    createTurnUI(): void {
        const uiX = 800; // Adjust for positioning
        const uiY = 50;
    
        this.turnTextObjects = this.initiative.map((char, index) => {
            return this.add.text(uiX, uiY + index * 30, char.name, {
                fontSize: '20px',
                color: '#000000',
                backgroundColor: index === 0 ? '#ff0000' : '#FFFFFF' // Highlight current turn
            });
        });
    }

    setupCharacters(): void {


        this.initiative.forEach((char, i) => {

            //what is in char?
            char.sprite = this.add.sprite(char.x, char.y, (i == 0 ? 'wizard':'barbar')).setInteractive();
            
            char.sprite.on('pointerdown', () => {
                if (this.isCurrentTurn(char)) {
                    this.selectedCharacter = char;
                }
            });
        });
    }

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

            this.endTurn();

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
