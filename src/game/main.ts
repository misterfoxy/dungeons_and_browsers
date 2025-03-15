import { Boot } from './scenes/Boot';
import { GameOver } from './scenes/GameOver';
import {YouWin} from './scenes/YouWin';
import { Rules } from './scenes/Rules';
import { Game as MainGame } from './scenes/Game';
import { MainMenu } from './scenes/MainMenu';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 1200,
    height: 800,
    parent: 'game-container',
    backgroundColor: '#028af8',
    audio: {
        disableWebAudio: false
    },
    scene: [
        Boot,
        Preloader,
        MainMenu,
        Rules,
        MainGame,
        GameOver,
        YouWin
    ]
};

const StartGame = (parent: string) => {

    return new Game({ ...config, parent });

}

export default StartGame;
