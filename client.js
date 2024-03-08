const socket = io();

let username;

function startGame() {
    socket.emit('startGame');
}

function sendGuess() {
    const guess = document.getElementById('guessInput').value;
    socket.emit('guess', guess);
}

socket.on('updatePlayers', (players) => {
    const playersList = document.getElementById('playersList');
    playersList.innerHTML = '';
    players.forEach(player => {
        const li = document.createElement('li');
        li.textContent = player.username;
        playersList.appendChild(li);
    });
});

socket.on('startGame', (word) => {
    // Handle game start on the client side
    console.log(`Game started! Word: ${word}`);
});

socket.on('updateScore', (updatedScore) => {
    // Update the score on the client side
    score = updatedScore;
    updateScoreDisplay();
});

socket.on('gameOver', (winner) => {
    // Handle game over on the client side
    console.log(`Game over! Winner: ${winner}`);
    displayGameOverMessage(winner);
});

function updateScoreDisplay() {
    const playersList = document.getElementById('playersList');
    playersList.innerHTML = '';
    players.forEach(player => {
        const li = document.createElement('li');
        li.textContent = `${player.username} - Score: ${score[player.id] || 0}`;
        playersList.appendChild(li);
    });
}

function displayGameOverMessage(winner) {
    // Hide game elements
    document.getElementById('startButton').style.display = 'none';
    document.getElementById('guessInput').style.display = 'none';

    // Display game over message and replay button
    const gameOverMessage = document.createElement('p');
    gameOverMessage.textContent = `Game over! Winner: ${winner}`;
    document.body.appendChild(gameOverMessage);

    const replayButton = document.createElement('button');
    replayButton.textContent = 'Replay';
    replayButton.onclick = () => {
        // Show game elements again
        document.getElementById('startButton').style.display = 'block';
        document.getElementById('guessInput').style.display = 'block';

        // Remove game over message and replay button
        gameOverMessage.remove();
        replayButton.remove();

        // Reset scores
        score = {};
        updateScoreDisplay();

        // Start a new game
        socket.emit('startGame');
    };

    document.body.appendChild(replayButton);
}

// Prompt the user for a username when they connect
username = prompt('Enter your username:');
socket.emit('join', username);