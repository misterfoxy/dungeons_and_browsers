import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

interface Character {
    name: string;
    initiative: number;
    x: number;
    y: number;
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


    constructor ()
    {
        super({key:'Game'});
    }

    create ()
    {

    this.generateMap();
    this.generateInitiative();

    this.setupCharacters();
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
        console.log('generating init')
        this.initiative = [
            { name: "Player 1", x: 100, y: 100, initiative: Math.random() * 20 },
            { name: "Enemy 1", x: 400, y: 400, initiative: Math.random() * 20 },
            { name: "Enemy 2", x: 600, y: 200, initiative: Math.random() * 20 },
            { name: "Enemy 3", x: 200, y: 400, initiative: Math.random() * 20 }
        ].sort((a, b) => b.initiative - a.initiative);
    }

    // generateInitiative(){
    //     const characters = [
    //         { name: "Player 1", initiative: Math.random() * 20, spriteName: "wizard"},
    //         { name: "Enemy 1", initiative: Math.random() * 20, spriteName: "barbar" },
    //         { name: "Enemy 2", initiative: Math.random() * 20, spriteName: "barbar" },
    //         { name: "Enemy 3", initiative: Math.random() * 20, spriteName: "barbar" }
    //     ];
    //     // Sort by highest initiative
    //     const sorted = [...characters].sort((a, b) => b.initiative - a.initiative);
    //     console.log(sorted)
    //     this.initiative=[...sorted];

    //     this.gameText = this.add.text(852, 184, this.initiative[0].name, {
    //         fontFamily: 'Arial Black', fontSize: 12, color: '#ffffff',
    //         stroke: '#000000', strokeThickness: 8,
    //         align: 'center'
    //     }).setOrigin(0.5).setDepth(100);
        
    //     this.gameText = this.add.text(852, 204, this.initiative[1].name, {
    //         fontFamily: 'Arial Black', fontSize: 12, color: '#ffffff',
    //         stroke: '#000000', strokeThickness: 8,
    //         align: 'center'
    //     }).setOrigin(0.5).setDepth(100);
        
    //     this.gameText = this.add.text(852, 224, this.initiative[2].name, {
    //         fontFamily: 'Arial Black', fontSize: 12, color: '#ffffff',
    //         stroke: '#000000', strokeThickness: 8,
    //         align: 'center'
    //     }).setOrigin(0.5).setDepth(100);
        
    //     this.gameText = this.add.text(852, 244, this.initiative[3].name, {
    //         fontFamily: 'Arial Black', fontSize: 12, color: '#ffffff',
    //         stroke: '#000000', strokeThickness: 8,
    //         align: 'center'
    //     }).setOrigin(0.5).setDepth(100);
    // }

    setupCharacters(): void {

    //     this.add.sprite(125, 200, 'wizard')
    // this.add.sprite(300, 600, 'barbar')
    // this.add.sprite(800, 600, 'barbar')
    // this.add.sprite(800, 200, 'barbar')

        this.initiative.forEach((char, i) => {
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

    changeScene ()
    {
        this.scene.start('GameOver');
    }
}
