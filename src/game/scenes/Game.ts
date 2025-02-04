import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

interface Character {
    name: string;
    initiative: number;
    spriteName: string;
    // hexLocation: number;
}

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameText: Phaser.GameObjects.Text;
    initiative: Character[] = [];

    constructor ()
    {
        super({key:'Game'});
    }

    create ()
    {

    this.generateMap();
    this.generateInitiative();
   

    this.add.sprite(125, 200, 'wizard')
    this.add.sprite(300, 600, 'barbar')
    this.add.sprite(800, 600, 'barbar')
    this.add.sprite(800, 200, 'barbar')

        EventBus.emit('current-scene-ready', this);
    }

    generateMap(){
        const hexSize = 50; // Radius of the hexagon
        const hexWidth = hexSize * 2;
        const hexHeight = Math.sqrt(3) * hexSize;
        const cols = 10; // Number of columns
        const rows = 10;  // Number of rows
    
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                let x = col * hexWidth * 0.75; // Offset columns
                let y = row * hexHeight;
    
                if (col % 2 !== 0) {
                    y += hexHeight / 2; // Offset odd columns
                }
    
                this.add.image(x+100, y+100, 'hex').setOrigin(0.5);
            }
        }
    }

    generateInitiative(){
        const characters = [
            { name: "Player 1", initiative: Math.random() * 20, spriteName: "wizard"},
            { name: "Enemy 1", initiative: Math.random() * 20, spriteName: "barbar" },
            { name: "Enemy 2", initiative: Math.random() * 20, spriteName: "barbar" },
            { name: "Enemy 3", initiative: Math.random() * 20, spriteName: "barbar" }
        ];
        // Sort by highest initiative
        const sorted = [...characters].sort((a, b) => b.initiative - a.initiative);
        console.log(sorted)
        this.initiative=[...sorted];

        this.gameText = this.add.text(852, 184, this.initiative[0].name, {
            fontFamily: 'Arial Black', fontSize: 12, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);
        
        this.gameText = this.add.text(852, 204, this.initiative[1].name, {
            fontFamily: 'Arial Black', fontSize: 12, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);
        
        this.gameText = this.add.text(852, 224, this.initiative[2].name, {
            fontFamily: 'Arial Black', fontSize: 12, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);
        
        this.gameText = this.add.text(852, 244, this.initiative[3].name, {
            fontFamily: 'Arial Black', fontSize: 12, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);
    }
    changeScene ()
    {
        this.scene.start('GameOver');
    }
}
