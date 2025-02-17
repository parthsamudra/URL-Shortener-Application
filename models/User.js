const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");

// Database connection
const uri = "mongodb://localhost:27017"; // Update if using a different host
const client = new MongoClient(uri);
const db = client.db("urlShortener");
const usersCollection = db.collection("users");

// Function to create a new user with hashed password
async function createUser(username, email, password) {
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const result = await usersCollection.insertOne({
            username,
            email,
            password: hashedPassword
        });
        return result.insertedId;
    } catch (error) {
        throw new Error("Error creating user");
    }
}

// Function to find a user by username
async function getUserByUsername(username) {
    return await usersCollection.findOne({ username });
}

// Function to find a user by email
async function getUserByEmail(email) {
    return await usersCollection.findOne({ email });
}

// Function to compare password
async function comparePassword(candidatePassword, hashedPassword) {
    return await bcrypt.compare(candidatePassword, hashedPassword);
}

module.exports = {
    createUser,
    getUserByUsername,
    getUserByEmail,
    comparePassword
};
