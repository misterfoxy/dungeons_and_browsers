import React, { useState, useEffect } from "react";
import {PhaserGame} from "./PhaserGame"; // Your Phaser game component

const InitiativeManager = () => {
    const [initiativeOrder, setInitiativeOrder] = useState([]);
    const [currentTurn, setCurrentTurn] = useState(0);

    useEffect(() => {
        // Example: Generate characters with random initiative
        const characters = [
            { name: "Player 1", initiative: Math.random() * 20 },
            { name: "Enemy 1", initiative: Math.random() * 20 },
            { name: "Player 2", initiative: Math.random() * 20 }
        ];
        // Sort by highest initiative
        const sorted = [...characters].sort((a, b) => b.initiative - a.initiative);
        setInitiativeOrder(sorted);
    }, []);

    const nextTurn = () => {
        setCurrentTurn((prev) => (prev + 1) % initiativeOrder.length);
    };

    return (
        <div>
            <h2>Turn Order</h2>
            <ul>
                {initiativeOrder.map((char, index) => (
                    <li key={index} style={{ fontWeight: index === currentTurn ? "bold" : "normal" }}>
                        {char.name} (Initiative: {char.initiative.toFixed(1)})
                    </li>
                ))}
            </ul>
            <button onClick={nextTurn}>End Turn</button>

            {/* Pass turn info to Phaser */}
            <PhaserGame currentCharacter={initiativeOrder[currentTurn]} />
        </div>
    );
};

export default InitiativeManager;
