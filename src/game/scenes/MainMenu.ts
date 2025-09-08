import { GameObjects, Scene } from 'phaser';

import { EventBus } from '../EventBus';

export class MainMenu extends Scene
{
    background: GameObjects.Image;
    logo: GameObjects.Text;
    title: GameObjects.Text;
    logoTween: Phaser.Tweens.Tween | null;

    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        this.background = this.add.image(512, 384, 'background');

        this.logo = this.add.text(512, 300, 'STRA-TEE-JURY')

        const buttonStyle = { fontSize: '20px', color: '#ffffff', backgroundColor: '#333333', padding: { x: 10, y: 5 } };

        const playSingle = this.add.text(300, 500, "Play Single Player", buttonStyle)
        .setInteractive()
        .on('pointerover', () => {
            playSingle.setBackgroundColor('#00ff00');  // Change to green on hover
        })
        .on('pointerout', () => {
            playSingle.setBackgroundColor('#ff0000');  // Revert to red when not hovering
        })
        .on('pointerdown', () =>  this.scene.start('Game'));

        const playMulti = this.add.text(600, 500, "Play Multi Player", buttonStyle)
        .setInteractive()
        .on('pointerover', () => {
            playMulti.setBackgroundColor('#00ff00');  // Change to green on hover
        })
        .on('playMulti', () => {
            playSingle.setBackgroundColor('#ff0000');  // Revert to red when not hovering
        })
        .on('pointerdown', () =>  this.scene.start('Rules'));
    

        EventBus.emit('current-scene-ready', this);
    }
    
    changeScene ()
    {
        if (this.logoTween)
        {
            this.logoTween.stop();
            this.logoTween = null;
        }

        this.scene.start('Rules');
    }

    moveLogo (reactCallback: ({ x, y }: { x: number, y: number }) => void)
    {
        if (this.logoTween)
        {
            if (this.logoTween.isPlaying())
            {
                this.logoTween.pause();
            }
            else
            {
                this.logoTween.play();
            }
        } 
        else
        {
            this.logoTween = this.tweens.add({
                targets: this.logo,
                x: { value: 750, duration: 3000, ease: 'Back.easeInOut' },
                y: { value: 80, duration: 1500, ease: 'Sine.easeOut' },
                yoyo: true,
                repeat: -1,
                onUpdate: () => {
                    if (reactCallback)
                    {
                        reactCallback({
                            x: Math.floor(this.logo.x),
                            y: Math.floor(this.logo.y)
                        });
                    }
                }
            });
        }
    }
}
