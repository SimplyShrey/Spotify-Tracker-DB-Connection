const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://localhost:27017/trackify'; // Replace with your MongoDB URI

const connectToDatabase = async () => {
    try {
        await mongoose.connect(MONGO_URI); // No need for deprecated options
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
};

const userSchema = new mongoose.Schema({
    spotifyId: { type: String, required: true, unique: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

module.exports = { connectToDatabase, User };