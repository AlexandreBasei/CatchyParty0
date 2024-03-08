const express = require('express');
const session = require('express-session');
const passport = require('passport');
const SpotifyStrategy = require('passport-spotify').Strategy;
const axios = require('axios');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');


const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.use(express.json());

// Configurations de l'API Spotify
const clientId = 'd2dd99251bd9480b81222d8e8b26f6dd'; // LyricS
// const clientId = '862c7dacc1604e9db43fc7bcf899ca4c'; // LyricS BP
const clientSecret = 'c6948141c6814b08826dc09eda752ef3';  // LyricS
// const clientSecret = 'cb373d236ee7436aedddcfbabdd9d9e';  // LyricS BP

const redirectUri = 'http://localhost:3000/auth/spotify/callback';

app.get('/', (req, res) => {
  res.render('home');
});

// Ajouter cette ligne pour configurer express-session
app.use(session({ secret: clientSecret, resave: true, saveUninitialized: true }));

// Ajoutez cette ligne pour configurer Passport avec express-session
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

// Configurer passport avec la stratégie Spotify
passport.use(new SpotifyStrategy({
  clientID: clientId,
  clientSecret: clientSecret,
  callbackURL: redirectUri
},
  function (accessToken, refreshToken, expires_in, profile, done) {
    // Ici, vous pouvez enregistrer les informations de l'utilisateur ou faire autre chose avec les données

    // Exemple d'enregistrement des informations de l'utilisateur
    const user = {
      id: profile.id, // Identifiant unique de l'utilisateur
      displayName: profile.displayName, // Nom d'affichage de l'utilisateur
      accessToken: accessToken, // Token d'accès à Spotify
      refreshToken: refreshToken, // Token de rafraîchissement pour obtenir un nouveau token d'accès
      expires_in: expires_in // Durée de validité du token d'accès
    };

    // Enregistrez l'utilisateur dans votre base de données ou faites toute autre opération nécessaire
    // Assurez-vous d'appeler done() pour indiquer que le processus d'authentification est terminé.
    return done(null, user);
  }
));

// Rediriger l'utilisateur vers l'authentification Spotify
app.get('/auth/spotify', passport.authenticate('spotify', {
  scope: ['user-top-read', 'user-follow-read', 'playlist-modify-private', 'playlist-read-private', 'user-follow-modify']
}));

// Gérer la réponse de Spotify
app.get('/auth/spotify/callback',
  passport.authenticate('spotify', { failureRedirect: '/' }),
  function (req, res) {
    if (!req.user) {
      return res.status(401).send('Erreur d\'authentification avec Spotify');
    }
    res.redirect('/home');
  }
);

app.get('/logout', function (req, res, next) {
  if (req.isAuthenticated()) {
    req.logout(function (err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
  }
  else {
    res.redirect("/");
  }
});

app.get('/blindtest', async (req, res) => {
  if (req.isAuthenticated()) {
    const user = req.user; // Accédez aux informations de l'utilisateur à partir de req.user
    const accessToken = user.accessToken; // Exemple : Accédez à l'accessToken de l'utilisateur
    if (req.user && req.user.accessToken) {

      const type = req.query.type;
      const id = req.query.id;
      const artistName = req.query.name;

      try {
        const [user_datas] = await Promise.all([
          // axios.get('https://api.spotify.com/v1/me/playlists?limit=50', {
          //   headers: {
          //     'Authorization': `Bearer ${req.user.accessToken}`
          //   }
          // }),

          axios.get('https://api.spotify.com/v1/me', {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          })
        ]);

        // Définissez le nombre maximum de pistes à récupérer à chaque fois (par exemple, 50)
        const limit = 50;

        // Récupérez les pistes par lots jusqu'à ce que toutes les pistes soient récupérées
        let offset = 0;
        let allTracks = [];

        // Déclarez tracksData à l'extérieur de la boucle
        let tracksData;
        let allTrackNames = [];

        if (type === 'playlist') {
          do {
            const tracksData = await axios.get(`https://api.spotify.com/v1/playlists/${id}/tracks`, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
              params: {
                offset: offset,
                limit: limit,
              },
            });

            const tracks = tracksData.data.items;

            // Si aucune piste n'est retournée, cela signifie que toutes les pistes ont été récupérées
            if (tracks.length === 0) {
              break;
            }

            // Ajoutez les pistes actuelles à la liste complète
            allTracks = allTracks.concat(tracks);

            // Stockez les noms des pistes dans le tableau


            allTrackNames.push(...tracks.map(track => track.track.name));

            // Mettez à jour l'offset pour la prochaine itération
            offset += limit;

          } while (allTracks.length < 1000);

        } else if (type === 'artist') {
          // Utilisez l'ID de l'artiste dans la requête
          const artistId = id;

          // Récupérez les albums de l'artiste
          const albumsData = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/albums`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            params: {
              limit: 50, // Limitez le nombre d'albums retournés par requête
            },
          });

          const albums = albumsData.data.items;

          // Parcourez chaque album pour récupérer les pistes
          for (const album of albums) {
            let offset = 0;
            let limit = 50; // Limitez le nombre de pistes retournées par requête

            do {
              const tracksData = await axios.get(`https://api.spotify.com/v1/albums/${album.id}/tracks`, {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
                params: {
                  offset: offset,
                  limit: limit,
                },
              });

              const tracks = tracksData.data.items;

              // Si aucune piste n'est retournée, cela signifie que toutes les pistes de l'album ont été récupérées
              if (tracks.length === 0) {
                break;
              }

              // Ajoutez les pistes actuelles à la liste complète
              allTracks = allTracks.concat(tracks);

              // Stockez les noms des pistes dans le tableau
              allTrackNames.push(...tracks.map(track => track.name));

              // Mettez à jour l'offset pour la prochaine itération
              offset += limit;

            } while (allTracks.length < 1000);
          }

        } else if (type === 'album') {
          // Utilisez l'ID de l'album dans la requête
          const albumId = id;

          let offset = 0;
          let limit = 50; // Limitez le nombre de pistes retournées par requête

          do {
            const tracksData = await axios.get(`https://api.spotify.com/v1/albums/${albumId}/tracks`, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
              params: {
                offset: offset,
                limit: limit,
              },
            });

            const tracks = tracksData.data.items;

            // Si aucune piste n'est retournée, cela signifie que toutes les pistes de l'album ont été récupérées
            if (tracks.length === 0) {
              break;
            }

            // Ajoutez les pistes actuelles à la liste complète
            allTracks = allTracks.concat(tracks);

            // Stockez les noms des pistes dans le tableau
            allTrackNames.push(...tracks.map(track => track.name));

            // Mettez à jour l'offset pour la prochaine itération
            offset += limit;

          } while (allTracks.length < 1000);
        }

        // const playlists = playlistsData.data.items;
        const displayName = user.displayName;
        const pp = user_datas.data;

        // // Sélectionnez une playlist au hasard
        // const randomPlaylist = playlists[Math.floor(Math.random() * playlists.length)];

        // Obtenez l'ID de la playlist sélectionnée
        // const playlistId = '1L4rTXx7MNAuwvCzihm3ZH';



        console.log(allTrackNames.length);
        console.log(allTrackNames);

        // Renvoyez la liste complète des pistes à la vue EJS
        res.render('blindtest', { tracks: allTracks, pp, displayName, accessToken, artistName });
      } catch (error) {
        console.error('Erreur lors de la récupération des données Spotify:', error);
        res.redirect('/error');
      }
    }

    else {
      console.log("Access Token:", req.user.accessToken, "<br/><br/><br/><br/><br/><br/><br/><br/>"); // Ajout de cette ligne

      console.error("Erreur: Access Token non disponible");
      res.redirect('/error');
    }
  }
  else {
    res.redirect('/'); // Redirigez l'utilisateur vers l'authentification si ce n'est pas déjà fait
  }
}
);

app.get('/blindtest-selector', async (req, res) => {
  if (req.isAuthenticated()) {
    const user = req.user; // Accédez aux informations de l'utilisateur à partir de req.user
    const accessToken = user.accessToken; // Exemple : Accédez à l'accessToken de l'utilisateur
    if (req.user && req.user.accessToken) {

      const type = req.query.type;
      const id = req.query.id;

      try {
        const [user_datas] = await Promise.all([
          // axios.get('https://api.spotify.com/v1/me/playlists?limit=50', {
          //   headers: {
          //     'Authorization': `Bearer ${req.user.accessToken}`
          //   }
          // }),

          axios.get('https://api.spotify.com/v1/me', {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          })
        ]);

        // const playlists = playlistsData.data.items;
        const displayName = user.displayName;
        const pp = user_datas.data;
        // Renvoyez la liste complète des pistes à la vue EJS
        res.render('blindtest-selector', { pp, displayName, accessToken });
      } catch (error) {
        console.error('Erreur lors de la récupération des données Spotify:', error);
        res.redirect('/error');
      }
    }

    else {
      console.log("Access Token:", req.user.accessToken, "<br/><br/><br/><br/><br/><br/><br/><br/>"); // Ajout de cette ligne

      console.error("Erreur: Access Token non disponible");
      res.redirect('/error');
    }
  }
  else {
    res.redirect('/'); // Redirigez l'utilisateur vers l'authentification si ce n'est pas déjà fait
  }
}
);

app.get('/lyrics-playlist', async (req, res) => {
  if (req.isAuthenticated()) {
    const user = req.user; // Accédez aux informations de l'utilisateur à partir de req.user
    const accessToken = user.accessToken; // Exemple : Accédez à l'accessToken de l'utilisateur
    if (req.user && req.user.accessToken) {
      const lyricSPlaylistId = await checkLyricSPlaylist(accessToken);
      const playlistId = lyricSPlaylistId.playlistId;

      try {

        const [user_datas] = await Promise.all([
          // axios.get('https://api.spotify.com/v1/me/playlists?limit=50', {
          //   headers: {
          //     'Authorization': `Bearer ${req.user.accessToken}`
          //   }
          // }),

          axios.get('https://api.spotify.com/v1/me', {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          })
        ]);

        // const playlists = playlistsData.data.items;
        const displayName = user.displayName;
        const pp = user_datas.data;

        const playlistData = await getPlaylistData(accessToken, playlistId);
        res.render('lyrics-playlist', { playlist: playlistData, displayName, pp, playlistId, accessToken });
      } catch (error) {
        console.error('Erreur lors de la récupération des données Spotify:', error);
        res.redirect('/error');
      }
    }
    else {
      console.log("Access Token:", req.user.accessToken, "<br/><br/><br/><br/><br/><br/><br/><br/>"); // Ajout de cette ligne

      console.error("Erreur: Access Token non disponible");
      res.redirect('/error');
    }
  }
  else {
    res.redirect('/'); // Redirigez l'utilisateur vers l'authentification si ce n'est pas déjà fait
  }
}
);

app.post('/delete/:playlistId/:songId', async (req, res) => {

  try {
    const accessToken = req.user.accessToken;
    const trackId = req.params.songId;
    console.log('track ID:', trackId);
    const playlistId = req.params.playlistId;
    console.log('Playlist ID:', playlistId);

    await deleteSongFromPlaylist(accessToken, playlistId, trackId);
    res.redirect('/lyrics-playlist');
  } catch (error) {
    // Gérer les erreurs de manière appropriée dans votre application
    console.error("Erreur: Access Token non disponible", error);
  }
});

// Fonction pour récupérer les informations de la playlist
async function getPlaylistData(accessToken, playlistId) {
  try {
    const response = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const playlistData = response.data;
    const tracks = playlistData.tracks.items.map(item => {
      const trackData = item.track;
      return {
        id: trackData.id,
        name: trackData.name,
        artists: trackData.artists,
        cover: trackData.album.images[0].url,
        external_url: trackData.external_urls.spotify,
      };
    });

    return tracks;
  } catch (error) {
    console.error('Erreur lors de la récupération des informations de la playlist:', error.message);
    throw error;
  }
}

// Fonction pour supprimer une chanson de la playlist
async function deleteSongFromPlaylist(accessToken, playlistId, trackId) {
  console.log(accessToken, playlistId, trackId);
  try {
    const response = await axios({
      method: 'delete',
      url: `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        tracks: [
          {
            uri: `spotify:track:${trackId}`,
          },
        ],
      },
    });

    // La réponse pourrait être utilisée pour des vérifications supplémentaires si nécessaire
    console.log('Statut de la réponse:', response.status);
  } catch (error) {
    console.error('Erreur lors de la suppression de la chanson de la playlist:', error.message);
    throw error;
  }
}


app.post('/clear-playlist/:playlistId', async (req, res) => {
  try {
    const accessToken = req.user.accessToken;
    const playlistId = req.params.playlistId;

    console.log('Playlist ID:', playlistId);

    // Effectuer la suppression des pistes ici (utilisez la fonction clearPlaylist ou équivalente)
    await clearPlaylist(accessToken, playlistId);

    // Répondre avec un statut 204 (No Content) pour indiquer le succès
    res.status(204).send();
  } catch (error) {
    // Gérer les erreurs de manière appropriée
    console.error('Erreur lors de la suppression de toutes les chansons de la playlist:', error.message);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression des pistes' });
  }
});

async function clearPlaylist(accessToken, playlistId) {
  try {
    // Récupérer les informations actuelles de la playlist
    const responseInfo = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!responseInfo.data || !responseInfo.data.tracks || !responseInfo.data.tracks.items) {
      throw new Error('Impossible de récupérer les informations de la playlist');
    }

    // Récupérer les IDs de toutes les pistes
    const trackIds = responseInfo.data.tracks.items.map(item => item.track.id);
    console.log(trackIds);
    // Supprimer toutes les pistes de la playlist
    const response = await axios({
      method: 'delete',
      url: `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        tracks: trackIds.map(trackId => ({ uri: `spotify:track:${trackId}` })),
      },
    });

    console.log('Réponse DELETE:', response.data);

    if (!response.data) {
      throw new Error('Impossible de supprimer les pistes de la playlist');
    }

    console.log('Playlist vidée avec succès');
  } catch (error) {
    if (error.response && error.response.data && error.response.data.error && error.response.data.error.message) {
      console.error('Erreur lors de la suppression des pistes de la playlist:', error.response.data.error.message);
    } else {
      console.error('Erreur inattendue:', error.message);
    }
    throw error;
  }
}



app.get('/game', async (req, res) => {
        res.render('game');
});


let players = [];
let word = '';
let score = {};
let connectedUsers = 0;

io.on('connection', (socket) => {
  connectedUsers++;
  const currentUserNumber = connectedUsers;
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

let gameData = {
  currentIndex: 0,
  correctAnswers: 0,
  totalPoints: 0,
  answers: [],
  // Add other relevant game data properties
};

// Listen for incoming connections
io.on('connection', (socket) => {
  console.log('A user connected');

  // Listen for the startBlindTest event
  socket.on('startBlindTest', (data) => {
    console.log('Data received from client:', data);
    // Update the game state, e.g., reset gameData based on data received from the client
    // Emit an update to all clients with the new game state
    io.emit('updateClientState', {
      message: 'Data received on the server',
      data: data,
    });
  });

  // Listen for the submitAnswer event
  socket.on('submitAnswer', (data) => {
    // Update the game state based on the answer received from the client
    // Emit an update to all clients with the new game state
    io.emit('updateGameState', gameData);
  });

  // Listen for the restartBlindTest event
  socket.on('restartBlindTest', () => {
    // Reset the game state
    gameData = {
      currentIndex: 0,
      correctAnswers: 0,
      totalPoints: 0,
      answers: [],
      // Add other relevant game data properties
    };

    // Emit an update to all clients with the new game state
    io.emit('updateGameState', gameData);
  });

  // Handle disconnections
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });

  // function updateServerGameState() {
  //   // Update the game state on the server
  //   // ...
  
  //   // Emit the updated game state to all clients
  //   io.emit('updateGameState', {
  //     currentIndex: updatedIndex,
  //     correctAnswers: updatedCorrectAnswers,
  //     totalPoints: updatedTotalPoints,
  //     answers: updatedAnswers,
  //     numPlayers: io.engine.clientsCount, // Number of connected clients
  //   });
  // }
});

server.listen(3000, () => {
  console.log('Serveur en cours d\'exécution sur le port 3000');
});