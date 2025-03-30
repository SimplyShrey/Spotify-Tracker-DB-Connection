const spotifyApi = new SpotifyWebApi();
const spotifyLoginBtn = document.getElementById('spotify-login');

const greetingDiv = document.getElementById('greeting');
const usernameElem = document.getElementById('username');
const greetingTimeElem = document.getElementById('greeting-time');
const statsSection = document.getElementById('stats');
const statsContainer = document.querySelector('.stats-container');
const minutesSection = document.getElementById('minutes');
const minutesContainer = document.querySelector('.minutes-container');
const playlistsSection = document.getElementById('playlists');
const playlistsContainer = document.querySelector('.playlists-container');

const CLIENT_ID = '26c78bd719744c07afb6233ec0d26c02';
const REDIRECT_URI = 'http://localhost:4000/';
const AUTH_URL = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${REDIRECT_URI}&scope=user-top-read user-library-read user-read-recently-played user-read-playback-state user-read-currently-playing user-follow-read playlist-read-private`;

spotifyLoginBtn.addEventListener('click', () => {
    window.location.href = AUTH_URL;
});

function getAccessToken() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    return params.get('access_token');
}

async function refreshAccessToken(userId) {
    try {
        const response = await fetch(`http://localhost:4000/refresh_token?user_id=${userId}`);
        const data = await response.json();
        const newAccessToken = data.access_token;

        // Update the Spotify API client with the new access token
        spotifyApi.setAccessToken(newAccessToken);

        // Re-fetch data with the new token
        fetchCurrentlyPlaying(newAccessToken);
        fetchStats(newAccessToken);
        fetchMinutes(newAccessToken);
        fetchUserPlaylists(newAccessToken);
    } catch (error) {
        console.error('Error refreshing access token:', error);
    }
}

function init() {
    const accessToken = getAccessToken();

    if (accessToken) {
        fetchCurrentlyPlaying(accessToken);
        fetchStats(accessToken);
        fetchMinutes(accessToken);
        fetchUserPlaylists(accessToken);
        spotifyApi.getMe().then(user => displayGreeting(user.display_name));
    }
}

window.addEventListener('load', init);