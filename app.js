const express = require('express');
const path = require('path');
const querystring = require('querystring');
const axios = require('axios');
const SpotifyWebApi = require('spotify-web-api-node');
const { connectToDatabase, User } = require('./db'); // MongoDB connection and User model

const app = express();

const CLIENT_ID = '26c78bd719744c07afb6233ec0d26c02';
const CLIENT_SECRET = 'your-client-secret'; // Replace with your Spotify client secret
const REDIRECT_URI = 'http://localhost:4000/callback'; // Update this to your redirect URI

const spotifyApi = new SpotifyWebApi({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUri: REDIRECT_URI,
});

// Connect to MongoDB
connectToDatabase();

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve the login page (index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Step 1: Redirect user to Spotify authorization
app.get('/login', (req, res) => {
    const scope = 'user-read-playback-state user-read-currently-playing user-top-read user-library-read user-read-recently-played playlist-read-private';
    const authUrl = `https://accounts.spotify.com/authorize?${querystring.stringify({
        client_id: CLIENT_ID,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        scope,
    })}`;
    res.redirect(authUrl);
});

// Step 2: Handle callback and exchange authorization code for tokens
app.get('/callback', async (req, res) => {
    const code = req.query.code;

    try {
        const response = await axios.post('https://accounts.spotify.com/api/token', querystring.stringify({
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        const { access_token, refresh_token } = response.data;

        // Use the access token to get the user's Spotify ID
        spotifyApi.setAccessToken(access_token);
        const userResponse = await spotifyApi.getMe();
        const userId = userResponse.body.id;

        // Store the tokens in MongoDB
        await User.findOneAndUpdate(
            { spotifyId: userId },
            { spotifyId: userId, accessToken: access_token, refreshToken: refresh_token },
            { upsert: true, new: true }
        );

        // Redirect the user to the dashboard with their access token
        res.redirect(`/dashboard?access_token=${access_token}`);
    } catch (error) {
        console.error('Error exchanging authorization code for tokens:', error);
        res.status(500).send('Authentication failed');
    }
});

// Step 3: Refresh the access token
app.get('/refresh_token', async (req, res) => {
    const userId = req.query.user_id; // Pass the user ID as a query parameter

    try {
        const user = await User.findOne({ spotifyId: userId });
        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }

        const response = await axios.post('https://accounts.spotify.com/api/token', querystring.stringify({
            grant_type: 'refresh_token',
            refresh_token: user.refreshToken,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        const { access_token } = response.data;

        // Update the user's access token in MongoDB
        user.accessToken = access_token;
        await user.save();

        res.json({ access_token });
    } catch (error) {
        console.error('Error refreshing access token:', error);
        res.status(500).send('Failed to refresh access token');
    }
});

// Use process.env.PORT if it's set (e.g., for deployment)
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});