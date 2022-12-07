const express = require('express');
var request = require('request');
var querystring = require('querystring');

const app = express();

const client_id = '49ce1785bb8b4745b1a51581d9d6e204'; // Your client id
const client_secret = '5185a0f060914413a2765700d9f49455'; // Your secret
const redirect_uri = 'http://localhost:8888/top'; //

app.get('/', function(req, res) {

    var scope = 'user-read-private user-read-email user-top-read';
    res.redirect('https://accounts.spotify.com/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri
      }));
  });


app.get('/top', function(req, res) {
    var code = req.query.code || null;

    var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
    },
    headers: {
        'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
    },
    json: true
    };

    request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            var access_token = body.access_token;

            var options = {
                url: 'https://api.spotify.com/v1/me/top/tracks?'+ 
                querystring.stringify({
                    time_range: 'long_term',
                    limit: '1'
                }),
                headers: { 'Authorization': 'Bearer ' + access_token },
                json: true
              };
        
              // use the access token to access the Spotify Web API
              request.get(options, function(error, response, body) {

                const title = body.items[0].name
                const artist = body.items[0].artists.map((_artist) => _artist.name).join(', ')
                const album = body.items[0].album.name
                const popularity = body.items[0].popularity
                const albumImageUrl = body.items[0].album.images[0].url
                const songUrl =  body.items[0].external_urls.spotify
                res.json({title,
                artist,
                album,
                popularity,
                albumImageUrl,
                songUrl
                });
              });
        }
        else{ 
            res.status(400);
        }
    });


});

const port = 8888;
app.listen(port, () => {
    console.log(`Server started on ${port}`);
});