const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

//Port from environment variable or default - 5000
const port = process.env.PORT || 5000;

//Setting up express and adding socketIo middleware
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const path = require('path');

const uri = process.env.MONGODB_URI;

const Message = require('./Message');
const mongoose = require('mongoose');

mongoose.connect(uri, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
});

app.use(express.static(path.join(__dirname, '..', 'client', 'build')));

//Setting up a socket with the namespace "connection" for new sockets
io.on('connection', (socket) => {
    console.log("New client connection");

    // Get the last 10 messages from the database.
    Message.find().sort({ createdAt: -1 }).limit(10).exec((err, messages) => {
        if (err) return console.error(err);

        // Send the last messages to the user.
        socket.emit('init', messages);
    });

    //Here we listen on a new namespace called "incoming message"
    socket.on('message', (msg) => {
        // Create a message with the content and the name of the socket/user.
        const message = new Message({
            content: msg.content,
            name: msg.name,
        });

        // Save the message to the database.
        message.save((err) => {
            if (err) return console.error(err);
        });

        // Notify all other sockets/users about a new message EXCLUDING the socket/user which sent us the message.
        socket.broadcast.emit('push', msg);
    });

    //A special namespace "disconnect" for when a client disconnects
    socket.on("disconnect", () => console.log("Client disconnected"));
});

server.listen(port, () => console.log(`listening on *:' + port`));