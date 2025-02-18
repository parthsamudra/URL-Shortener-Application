const { MongoClient, ObjectId } = require("mongodb");

// Database connection
const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);
const db = client.db("urlShortener");
const urlsCollection = db.collection("urls");

// Function to create a new short URL
async function createShortUrl(full, short, user) {
    const result = await urlsCollection.insertOne({
        full,
        short,
        clicks: 0,
        user: new ObjectId(user)
    });
    return result.insertedId;
}

// Function to find a short URL by its short code
async function getShortUrl(short) {
    return await urlsCollection.findOne({ short });
}

module.exports = {
    createShortUrl,
    getShortUrl
};
