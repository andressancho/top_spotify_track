const firebase = require('firebase/app')
const firestore = require('firebase/firestore')

const axios = require('axios')
const express = require('express');
const querystring = require('querystring');
let userId = '00'
const PORT = process.env.PORT || 8888;


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

const accountsAxios = axios.create();
const customAxios = axios.create();

accountsAxios.interceptors.request.use(function (config) {
    const headers = {
            'Authorization': 'Basic ' + (new Buffer.from(process.env.CLIENT_ID + ':' + process.env.CLIENT_SECRET).toString('base64')),
            "Content-Type": "application/x-www-form-urlencoded"
    }
    config.headers = headers;
    return config;
  }, function (error) {
    return Promise.reject(error);
  });

  customAxios.interceptors.request.use(async function (config) {
    const docRef = firestore.doc(db, "users", userId);
    const doc = await firestore.getDoc(docRef);
    
    if (doc.exists()) {
        const headers = {
            'Authorization': 'Bearer ' + doc.data().access_token,
            "Content-Type": "application/json"
        };
        config.headers = headers;
    } 
    return config;
  }, function (error) {
    return Promise.reject(error);
  });

customAxios.interceptors.response.use(function (response) {
    return response;
  }, async function (error) {
    let originalRequest = error.config;
    if(error.response.status === 401){
        const docRef = firestore.doc(db, "users", userId);
        const doc = await firestore.getDoc(docRef);
        
        if (doc.exists()) {
            const params = {
                grant_type: 'refresh_token',
                refresh_token: doc.data().refresh_token
            };
        
            return accountsAxios.post('https://accounts.spotify.com/api/token',querystring.stringify(params)
            ).then(async response => {
                const access_token = response.data.access_token;
                const userRef = firestore.doc(db, 'users', userId);
                await firestore.setDoc(userRef, {access_token}, { merge: true });   
                return customAxios(originalRequest);
            }).catch(err => {
                console.log(err);
            });
        } 
    }
    return Promise.reject(error);
  });

app.get('/', function(req, res) {

    const scope = 'user-read-private user-read-email user-top-read';
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
        response_type: 'code',
        client_id: process.env.CLIENT_ID,
        scope: scope,
        redirect_uri: process.env.REDIRECT_URI
        }));  
  });

app.get('/getToken', function(req, res) {

    const code = req.query.code || null;
    const params = {
        code: code,
        redirect_uri: process.env.REDIRECT_URI,
        grant_type: 'authorization_code'
    };

    accountsAxios.post('https://accounts.spotify.com/api/token',querystring.stringify(params)
    ).then(response => {
            
        const access_token = response.data.access_token,
                refresh_token = response.data.refresh_token;

        console.log(response.data)

        const headers = {
            'Authorization': 'Bearer ' + access_token ,
            "Content-Type": "application/json"
        }
        axios.get('https://api.spotify.com/v1/me',{headers}).then(async response =>{
            const{display_name,email} = response.data;
            const user = { 
                access_token,
                refresh_token,
                display_name,
                email };
            userId = response.data.id;

            const userRef = firestore.doc(db, 'users', userId);
            await firestore.setDoc(userRef, user, { merge: true });            
            
            res.send(user)

        }).catch(err => {
            res.status(400).json({ status:400 , msg: 'Error' });
        })
            
    }).catch(err => {
        res.status(400).json({ status:400 , msg: 'Error' });
    })
    
  });


app.get('/top', async function(req, res) {


    customAxios.get('https://api.spotify.com/v1/me/top/tracks?'+ 
    querystring.stringify({
        time_range: 'long_term',
        limit: '50'
    })).then(response =>{

        let listOfSongs = []

        response.data.items.forEach((song)=>{
            const {name, popularity } = song;
            const artist = song.artists.map((_artist) => _artist.name).join(', ')
            const album = song.album.name
            const albumImageUrl = song.album.images[0].url
            const songUrl =  song.external_urls.spotify

            listOfSongs.push({name,
                artist,
                album,
                popularity,
                albumImageUrl,
                songUrl
            });
        });

        console.log(listOfSongs);
        res.json(listOfSongs);

    }).catch(err => {
        res.status(401).json({ status:401 , msg: 'Not logged in' });
    });
});

app.listen(PORT, () => {
    console.log(`Server started on ${PORT}`);
});