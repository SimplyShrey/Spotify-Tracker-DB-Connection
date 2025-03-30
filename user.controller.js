import mongoose from "mongoose";
import cookieparser from "cookie-parser";
import jwt from "jsonwebtoken";
import User from "./model.js";
import Product from "./model.js";
import bcrypt from "bcrypt";
import axios from "axios";

// This function creates a new user and returns a token
export const createUser = async (req, res) => {
    const user = req.body;
    const captchaToken = req.body.captchaToken;
    const secretKey = process.env.CAPTCHA_SECRET_KEY;
    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`;

    console.log(user)

    if (!user.firstName || !user.lastName || !user.password || !user.contact || !user.email || !user.age) {
        return res.status(400).json({ success: false, message: "Please provide all fields" });
    }

    try {
        const existingUser = await User.findOne({ email: user.email });

        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email is already in use" });
        }

        const response = await axios.post(verificationUrl);
        if (!response.data.success) {
            return res.status(400).json({ success: false, message: "CAPTCHA validation failed" });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);

        const newUser = new User(user);

        await newUser.save();

        const accessToken = jwt.sign(
            { ID: newUser._id },
            process.env.ACCESS_TOKEN_SECRET,
            // { expiresIn: '10m' }
        );

        const refreshToken = jwt.sign(
            { ID: newUser._id },
            process.env.REFRESH_TOKEN_SECRET
        );

        res.cookie('jwt', refreshToken, {
            httpOnly: true,
            sameSite: 'None',
        });

        res.status(201).json({ success: true, accessToken });
    } catch (error) {
        console.error("Error in Create user:", error.message);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// This function verifies a user and returns a token
export const verifyUser = async (req, res) => {
    const { email, password, remember } = req.body;
    const captchaToken = req.body.captchaToken;
    const secretKey = process.env.CAPTCHA_SECRET_KEY;
    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const response = await axios.post(verificationUrl);
        if (!response.data.success) {
            return res.status(400).json({ success: false, message: "CAPTCHA validation failed" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const accessToken = jwt.sign(
            { ID: user._id },
            process.env.ACCESS_TOKEN_SECRET,
        );

        const refreshToken = jwt.sign(
            { ID: user._id },
            process.env.REFRESH_TOKEN_SECRET
        );

        res.cookie('jwt', refreshToken, {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
        });

        res.status(200).json({ success: true, accessToken });
    } catch (error) {
        console.error("Error in Verify User:", error.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// This function logs a user out
export const logoutUser = (req, res) => {
    try {
        res.clearCookie('jwt', {
            httpOnly: true,
            sameSite: 'None',
            secure: true,
        });
        res.status(200).json({ success: true, message: "Logged out successfully" });
    }
    catch (error) {
        console.error("Error: ", error.message);
        res.status(403).json({ success: false, message: "Failed to delete token" });
    }
};

// This function updates the cart of the user and adds or removes an element
export const updateUserCart = async (req, res) => {
    try {
        const accessToken = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
        const { productID, state } = req.body;

        if (!mongoose.Types.ObjectId.isValid(decoded.ID)) {
            return res.status(404).json({ success: false, message: "Invalid User Id" });
        }

        const user = await User.findById(decoded.ID);
        const update = state ? { $addToSet: { cart: productID } } : { $pull: { cart: productID } };

        const result = await User.findByIdAndUpdate(decoded.ID, update, { new: true });

        return res.status(200).json({ success: true, message: "Cart Updated Successfully" });
    } catch (error) {
        console.error("Update cart:", error.message);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// This function returns user details
export const whoAmI = async (req, res) => {
    try {
        const accessToken = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

        if (!mongoose.Types.ObjectId.isValid(decoded.ID)) {
            return res.status(404).json({ success: false, message: "Invalid User Id" });
        }

        const user = await User.findById(decoded.ID);
        return res.status(200).json({ success: true, data: user });
    } catch (error) {
        console.error("Error in Who Am I:", error.message);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// This function updates user details
export const updateUser = async (req, res) => {
    try {
        const accessToken = req.headers.authorization?.split(' ')[1];
        if (!accessToken) {
            return res.status(401).json({ success: false, message: 'Authentication token is required.' });
        }

        const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
        const userId = decoded.ID;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const { firstName, lastName, age, email, contact } = req.body;

        if (firstName !== undefined && firstName.trim() !== '') user.firstName = firstName;
        if (lastName !== undefined && lastName.trim() !== '') user.lastName = lastName;
        if (age !== undefined && age !== '') user.age = age;
        if (contact !== undefined && contact !== '') user.contact = contact;
        if (email !== undefined && email.trim() !== '' && email !== user.email) {
            const existingUser = await User.findOne({ email: email });

            if (existingUser) {
                return res.status(400).json({ success: false, message: "Email is already in use" });
            }

            user.email = email;
        }

        const updatedUser = await user.save();

        res.status(200).json({
            success: true,
            message: 'User details updated successfully.',
            data: updatedUser,
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ success: false, message: 'Failed to update user.' });
    }
};

// This function fetches the users cart
export const fetchUserCart = async (req, res) => {
    try {
        const accessToken = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

        if (!mongoose.Types.ObjectId.isValid(decoded.ID)) {
            return res.status(404).json({ success: false, message: "Invalid User Id" });
        }

        const user = await User.findById(decoded.ID);
        return res.status(200).json({ success: true, data: user.cart, userID: user._id });
    } catch (error) {
        console.error("Error in Fetch Cart:", error.message);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// This function clears the users cart
export const clearUserCart = async (req, res) => {
    try {
        const accessToken = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

        if (!mongoose.Types.ObjectId.isValid(decoded.ID)) {
            return res.status(404).json({ success: false, message: "Invalid User Id" });
        }

        const user = await User.findById(decoded.ID);
        user.cart = [];
        await user.save();

        return res.status(200).json({ success: true, message: "Cart Cleared Successfully" });
    } catch (error) {
        console.error("Error in Clear Cart:", error.message);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// This function adds a review to a seller
export const addReview = async (req, res) => {
    try {
        const accessToken = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

        if (!mongoose.Types.ObjectId.isValid(decoded.ID)) {
            return res.status(404).json({ success: false, message: "Invalid User Id" });
        }

        const { sellerID, rating, reviewText } = req.body;

        const user = await User.findById(decoded.ID);
        const seller = await User.findById(sellerID);

        if (!seller) {
            return res.status(404).json({ success: false, message: "Seller not found" });
        }

        const review = {
            userID: decoded.ID,
            rating,
            reviewText,
        };

        seller.reviews.push(review);
        await seller.save();

        return res.status(200).json({ success: true, message: "Review added successfully" });
    } catch (error) {
        console.error("Error in Add Review:", error.message);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};