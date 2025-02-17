# URL Shortener

This is a simple URL shortening service built using Node.js, Express.js, and MongoDB. It allows users to shorten long URLs and track the number of clicks on each shortened link.  User authentication is included to allow users to manage their own shortened URLs.

## Features

* **URL Shortening:**  Users can submit long URLs and receive shortened links.
* **Click Tracking:** The service tracks the number of clicks on each shortened URL.
* **User Authentication:** Users can register and log in to manage their own set of shortened URLs.
* **URL Deletion:** Authenticated users can delete their shortened URLs.

## Technologies Used

* **Node.js:** Backend runtime environment.
* **Express.js:** Web framework for building the API and serving static files.
* **MongoDB:** Database for storing URLs and user data.
* **Mongoose:** ODM (Object Data Modeling) library for interacting with MongoDB.
* **EJS:** Templating engine for rendering HTML views.
* **Passport.js:** Authentication middleware.
* **Connect-Flash:** For displaying flash messages (e.g., login errors).

## Installation

1. **Clone the repository:**
   (https://github.com/parthsamudra/URL-Shortener-Application.git)

2. **Navigate to the project directory:**
   cd URL_Shortener  
  

3. **Install dependencies:**
   npm install

4. **Set up MongoDB:**
   * Make sure you have MongoDB installed and running.
   * Create a database named `urlShortener` (or whatever you prefer, and update the connection string in `server.js`).


## Usage

1. **Start the server:**
   node server.js

2. **Access the application:**
   Open your web browser and go to `http://localhost:5000` 

## Endpoints (Example)

* `POST /shortUrls`: Shorten a URL (requires authentication).
* `GET /:shortUrl`: Redirect to the original URL.
* `POST /delete/:id`: Delete a shortened URL (requires authentication).
* `POST /login`: Log in.
* `POST /register`: Register a new user.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
