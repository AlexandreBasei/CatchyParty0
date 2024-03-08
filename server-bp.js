const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

let connectedUsers = 0;
let messages = [];
let checkboxState = false;

// SQLite configuration
const db = new sqlite3.Database('chat.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the database');
        // Create tables if they don't exist
        db.run('CREATE TABLE IF NOT EXISTS messages (message TEXT)');
        db.run('CREATE TABLE IF NOT EXISTS checkboxState (state INTEGER)');
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

let users = {}; // Stocker les informations des utilisateurs (score et nom)

io.on('connection', (socket) => {
    connectedUsers++;
    const currentUserNumber = connectedUsers;
    console.log(`User ${currentUserNumber} connected`);
    io.emit('user connected', { users, connectedUsers });
    

    if (connectedUsers === 2) {
        io.emit('start game'); // Émettre l'événement 'start game' lorsque 2 joueurs sont connectés
        // Envoyer les messages stockés, l'état de la case à cocher et les utilisateurs connectés à l'utilisateur
        socket.emit('stored messages', messages);
        socket.emit('stored checkbox state', checkboxState);
        socket.emit('user list', users);

    }

    else {
        // Informer les clients qu'ils doivent attendre plus de joueurs
        io.emit('waiting for players', connectedUsers);
    }

    // Envoyer le numéro d'utilisateur à l'utilisateur actuel
    socket.emit('user number', currentUserNumber);


    // Gérer la déconnexion d'un utilisateur
    socket.on('disconnect', () => {
        connectedUsers--;
        delete users[currentUserNumber]; // Retirer l'utilisateur de la liste lorsqu'il se déconnecte
        console.log(`User ${currentUserNumber} disconnected`);
        if (connectedUsers < 2) {
            io.emit('waiting for players', connectedUsers);
        }

        io.emit('user connected', { users, connectedUsers });
    });

    // Gérer l'envoi d'un message
    socket.on('chat message', ({ msg, userName }) => {
        const isCorrectAnswer = (msg.toLowerCase() === 'le mot choisi');
        
        users[currentUserNumber] = {
            name: userName,
            score: (users[currentUserNumber]?.score || 0) + 10,
        };
        
        if (isCorrectAnswer) {
            // Ajouter 10 points si la réponse est correcte
            users[currentUserNumber] = {
                name: userName,
                score: (users[currentUserNumber]?.score || 0) + 10,
            };

            // Vérifier si l'utilisateur a atteint 30 points
            if (users[currentUserNumber].score >= 30) {
                io.emit('user won', { userNumber: currentUserNumber, userName });
                // Réinitialiser le score après avoir gagné
                users[currentUserNumber].score = 0;
            }
        }

        const messageWithUser = `${userName}: ${msg}`;
        io.emit('chat message', isCorrectAnswer ? `${messageWithUser} - Bonne réponse !` : messageWithUser);

        // Sauvegarder le message dans la base de données
        messages.push(messageWithUser);
        db.run('INSERT INTO messages (message) VALUES (?)', [messageWithUser]);

        // Envoyer la liste mise à jour des utilisateurs aux clients
        io.emit('user list', users);
    });

    // Gérer le changement d'état de la case à cocher
    socket.on('checkbox state', (isChecked) => {
        checkboxState = isChecked;
        io.emit('checkbox state', isChecked);
        // Sauvegarder l'état de la case à cocher dans la base de données
        db.run('INSERT INTO checkboxState (state) VALUES (?)', [isChecked ? 1 : 0]);
    });

    socket.on('connection', () => {
        // Demander les messages stockés
        socket.emit('get stored messages');
    });

    // ...

    // Gérer la demande des messages stockés côté serveur
    socket.on('get stored messages', () => {
        // Envoyer les messages stockés au client
        socket.emit('stored messages', messages);
    });

    socket.on('stored messages', function (storedMessages) {
        // Mettre à jour l'interface utilisateur avec les messages stockés
        storedMessages.forEach(msg => {
            const li = document.createElement('li');
            li.textContent = msg;
            messages.appendChild(li);
        });
    });
});

// Retrieve stored messages from the database on startup
db.all('SELECT message FROM messages', [], (err, rows) => {
    if (err) {
        throw err;
    }
    console.log('Stored messages:', rows);
    messages = rows.map((row) => row.message);
});

// Retrieve stored checkbox state from the database on startup
db.get('SELECT state FROM checkboxState ORDER BY ROWID DESC LIMIT 1', [], (err, row) => {
    if (err) {
        throw err;
    }
    console.log('Stored checkbox state:', row);
    checkboxState = row ? row.state === 1 : false;
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
