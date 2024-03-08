const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;
app.set('view engine', 'ejs');
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

app.get('/test', (req, res) => {
    res.render('game');

});

let players = [];
let word = '';
let score = {};

io.on('connection', (socket) => {
    console.log('User connected');

    // Handle player joining
    socket.on('join', (username) => {
        players.push({ id: socket.id, username });
        io.emit('updatePlayers', players);
    });

    socket.on('replayRequest', () => {
        // Émettre un événement vers tous les clients pour synchroniser l'interface
        score = {};
        io.emit('updateInterface');
      });

    // Handle game start
    socket.on('startGame', () => {
        // Choose a word (you can implement your logic to choose a word)
        word = 'example';
        io.emit('startGame', word);
    });

    // Handle player guess
    socket.on('guess', (guess) => {
        if (guess.toLowerCase() === word.toLowerCase()) {
            // Correct guess, update score
            score[socket.id] = (score[socket.id] || 0) + 10;
            io.emit('updateScore', score, players);

            // Check if a player reached the winning score
            for (const playerId in score) {
                if (score[playerId] >= 30) {
                    io.emit('gameOver', players.find(player => player.id === playerId).username);
                    // You may want to reset the game here
                }
            }
        }
    });

    // Handle player disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected');
        players = players.filter(player => player.id !== socket.id);
        delete score[socket.id];
        io.emit('updatePlayers', players);
        io.emit('updateScore', score);

        for (const playerId in score) {
            if (score[playerId] >= 30) {
                const winner = players.find(player => player.id === playerId).username;
                io.emit('gameOver', winner);
                // You may want to reset the game here
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});