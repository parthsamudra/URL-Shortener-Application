const { MongoClient, ObjectId } = require("mongodb");

// Database connection
const uri = "mongodb://localhost:27017"; // Update if using a different host
const client = new MongoClient(uri);
const db = client.db("urlShortener");
const urlsCollection = db.collection("urls");

// Function to create a new short URL
async function createShortUrl(full, short, user) {
    const result = await urlsCollection.insertOne({
        full,
        short,
        clicks: 0,
        user: new ObjectId(user) // Convert user ID to ObjectId
    });
    return result.insertedId;
}

// Function to find a short URL by its short code
async function getShortUrl(short) {
    return await urlsCollection.findOne({ short });
}

// Function to update click count
async function incrementClick(short) {
    await urlsCollection.updateOne(
        { short },
        { $inc: { clicks: 1 } }
    );
}

// Function to delete a short URL
async function deleteShortUrl(short) {
    await urlsCollection.deleteOne({ short });
}

module.exports = {
    createShortUrl,
    getShortUrl,
    incrementClick,
    deleteShortUrl
};