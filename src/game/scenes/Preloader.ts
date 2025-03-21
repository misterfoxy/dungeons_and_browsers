import { Scene } from 'phaser';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        //  We loaded this image in our Boot Scene, so we can display it here
        this.add.image(512, 384, 'background');

        //  A simple progress bar. This is the outline of the bar.
        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

        //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
        const bar = this.add.rectangle(512-230, 384, 4, 28, 0xffffff);

        //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on('progress', (progress: number) => {

            //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
            bar.width = 4 + (460 * progress);

        });
    }

    preload ()
    {
        //  Load the assets for the game - Replace with your own assets
        this.load.setPath('assets');

        this.load.image('logo', 'logo.png');
        this.load.image('star', 'star.png');
        this.load.image('wizard','wiz.png');
        this.load.image('barbar','barbar.png')
        this.load.image('hex','hex.png')
        this.load.audio("bgMusic", 'song18.mp3');
        this.load.audio("attack_fx",'knife.flac');
        this.load.audio("death_fx",'Death.wav');
        this.load.audio("steps_fx",'steps.flac')

        // this.load.spritesheet('player-attack', 'assets/player_attack.png', { frameWidth: 64, frameHeight: 64 });
        // this.anims.create({
        //     key: 'player-attack',
        //     frames: this.anims.generateFrameNumbers('player-attack', { start: 0, end: 5 }),
        //     frameRate: 10,
        //     repeat: 0
        // });

    }

    create ()
    {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.

        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        if (this.cache.audio.has("bgMusic")) {
            this.scene.start("GameScene"); // Now it's safe to switch scenes
        } else {
            console.error("bgMusic failed to load!");
        }
        this.scene.start('MainMenu');
    }
}
