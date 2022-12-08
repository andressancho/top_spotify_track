// import { initializeApp } from "firebase/app";
const firebase = require('firebase/app')
const firestore = require('firebase/firestore')

const express = require('express');
var request = require('request');
var querystring = require('querystring');
var userId = ''


const firebaseConfig = {
  apiKey: "AIzaSyCg-oj1lN3nKaSdGNJMEnXA22VVYe9UrKA",
  authDomain: "database-f3f20.firebaseapp.com",
  databaseURL: "https://database-f3f20-default-rtdb.firebaseio.com",
  projectId: "database-f3f20",
  storageBucket: "database-f3f20.appspot.com",
  messagingSenderId: "233530587453",
  appId: "1:233530587453:web:16d10f0951081ea25b6d54",
  measurementId: "G-KRHGS27J40"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firestore.getFirestore();

const NODE_ENV = process.env.NODE_ENV || 'development';
require('dotenv').config({
    path: `.env.${NODE_ENV}`
});

const app = express();



app.get('/', function(req, res) {

    var scope = 
    'user-read-private user-read-email user-top-read';
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
        response_type: 'code',
        client_id: process.env.CLIENT_ID,
        scope: scope,
        redirect_uri: process.env.REDIRECT_URI
        }));
  
  });

  app.get('/getToken', function(req, res) {

    var code = req.query.code || null;

    var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    form: {
        code: code,
        redirect_uri: process.env.REDIRECT_URI,
        grant_type: 'authorization_code'
    },
    headers: {
        'Authorization': 'Basic ' + (new Buffer.from(process.env.CLIENT_ID + ':' + process.env.CLIENT_SECRET).toString('base64'))
    },
    json: true
    };

    request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            var access_token = body.access_token,
                refresh_token = body.refresh_token;
            
            var options = {
                url: 'https://api.spotify.com/v1/me',
                headers: { 'Authorization': 'Bearer ' + access_token },
                json: true
            };
        
               
            request.get(options, async function(error, response, body) {

                var name = body.display_name,
                email = body.email;

                const user = { 
                    access_token,
                    refresh_token,
                    name,
                    email }
                userId = body.id

                const cityRef = firestore.doc(db, 'users', userId);
                await firestore.setDoc(cityRef, user, { merge: true });            
               
                res.status(200).send(user)
            });
 
        }
        else{
            res.json(body);
        }
    });

    
  });


app.get('/top', async function(req, res) {
    const docRef = firestore.doc(db, "users", userId);
    const docSnap = await firestore.getDoc(docRef);
    
    if (docSnap.exists()) {
      console.log("Document data:", docSnap.data());
    } else {
      // doc.data() will be undefined in this case
      console.log("No such document!");
    }

    var options = {
        url: 'https://api.spotify.com/v1/me/top/tracks?'+ 
        querystring.stringify({
            time_range: 'short_term',
            limit: '10'
        }),
        headers: { 'Authorization': 'Bearer ' + docSnap.data().access_token },
        json: true
    };

      // use the access token to access the Spotify Web API
    request.get(options, function(error, response, body) {

        var listOfSongs = []
        var title = '', artist = '', album = '', popularity = '', albumImageUrl = '', songUrl = '';

        body.items.forEach((song)=>{
            title = song.name
            artist = song.artists.map((_artist) => _artist.name).join(', ')
            album = song.album.name
            popularity = song.popularity
            albumImageUrl = song.album.images[0].url
            songUrl =  song.external_urls.spotify

            listOfSongs.push({title,
                artist,
                album,
                popularity,
                albumImageUrl,
                songUrl
            });
        });

        console.log(listOfSongs);
        res.json(listOfSongs);
      });



});

const port = 8888;
app.listen(port, () => {
    console.log(`Server started on ${port}`);
});