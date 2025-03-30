import mongoose from "mongoose";

const SongSchema = new mongoose.Schema({
    SongName: {
        type: String,
        required: true
    },
    AlbumName: {
        type: String,
        required: true,
        unique: false
    },
    ArtistName: {
        type: String,
        required: true,
        unique: false
    },
    SongDuration: {
        type: Number,
        required: true,
        unique: false
    },
    SongCover: {
        type: String,
        required: true
    }    
});

const User = mongoose.model('Song', SongSchema);

export default User;
