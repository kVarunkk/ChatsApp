//server side code

const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// To get files from static folder
app.use(express.static(path.join(__dirname, "public")));

const botName = "ChatsApp";

// Run when client connects
io.on("connection", (socket) => {
  socket.on("joinRoom", ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    //to join a room
    socket.join(user.room);

    // send information only to user
    socket.emit("message", formatMessage(botName, "Welcome to ChatsApp!"));

    // send information to everyone except user
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        formatMessage(botName, `${user.username} has joined the chat`)
      );

    // send information to everyone including user in the room
    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });

  // Listen for chatMessage from server
  socket.on("chatMessage", (msg) => {
    const user = getCurrentUser(socket.id);

    //send message to everyone in the room execpt user
    socket.broadcast
      .to(user.room)
      .emit("message", formatMessage(user.username, msg));
  });

  //Listen to chatMessage from user
  socket.on("chatMessage", (msg) => {
    const user = getCurrentUser(socket.id);

    // send information only to user
    socket.emit("msg", formatMessage(user.username, msg));
  });

  // Runs when client disconnects
  socket.on("disconnect", () => {
    const user = userLeave(socket.id);

    if (user) {
      //send information to everyone
      io.to(user.room).emit(
        "message",
        formatMessage(botName, `${user.username} has left the chat`)
      );

      // Send information to everyone
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

const PORT = process.env.PORT || 3000;

// Using app.listen(3000) will not work here, as it creates a new HTTP server.
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
