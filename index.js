const  { setUser }  = require('./database/database');
const { axios, accountsAxios, customAxios } = require('./axiosConfig');

const express = require('express');
const querystring = require('querystring');
const PORT = process.env.PORT || 8888;

const NODE_ENV = process.env.NODE_ENV || 'development';
require('dotenv').config({
    path: `.env.${NODE_ENV}`
});

const app = express();


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
            const userId = response.data.id;

            setUser(user, userId);        
            
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