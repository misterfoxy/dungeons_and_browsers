import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameText: Phaser.GameObjects.Text;

    constructor ()
    {
        super('Game');
    }

    create ()
    {

    this.generateMap();
   

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
        
    }
    changeScene ()
    {
        this.scene.start('GameOver');
    }
}
