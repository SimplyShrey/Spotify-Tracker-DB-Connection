import axios from "axios";
import mongoose from "mongoose"
import User from "./model.js";

export const GetSongs = async(req, rec) => {
    const user = res.body;
    
    const response = await axios.get("https://api.spotify.com/v1/me/tracks", {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    const songs = response.data.items.map((item) => ({
        SongName: item.track.name,
        AlbumName: item.track.album.name,
        ArtistName: item.track.artists.map(artist => artist.name).join(", "),
        SongDuration: item.track.duration_ms,
        SongCover: item.track.album.images[0]?.url || "",
    }));
    console.log(response);
}
