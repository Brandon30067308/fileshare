const express = require("express");
const http = require("http");
const path = require("path");
const app = express();
const server = http.createServer(app);
const cors = require("cors");
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});

const port = process.env.PORT || 5000;

const rooms = {};
const socketToRoom = {};
const sockets = [];

app.use(cors());

app.use(express.static(path.resolve(__dirname, "./client/build")));

app.get("/api/rooms", (_, res) => {
  res.json(rooms);
});

app.use((_, res) => {
  res.sendFile(path.resolve(__dirname, "./client/build/index.html"));
});

io.on("connection", (socket) => {
  console.log("connection established...");
  socket.on("join-room", ({ roomID }) => {
    // join room
    socket.join(roomID);
    socketToRoom[socket.id] = roomID;
    sockets.push(socket);

    rooms[roomID] = rooms[roomID] ? [...rooms[roomID], socket.id] : [socket.id];

    if (rooms[roomID].length > 1) {
      // send all users to new user
      const usersInRoom = rooms[roomID].filter((id) => id !== socket.id);
      socket.emit("all-users", usersInRoom);
    }

    /* emit total users in room to all users */
    io.in(roomID).emit("total-users", rooms[roomID].length);
  });

  socket.on("sending-signal", ({ userToSignal, callerID, signal }) => {
    io.to(userToSignal).emit("user-joined", {
      signal,
      callerID,
      id: socket.id,
    });
  });

  socket.on("returning-signal", ({ signal, callerID }) => {
    io.to(callerID).emit("recieving-signal", { signal, id: socket.id });
  });

  socket.on("file-recieved", (senderId) => {
    io.to(senderId).emit("file-recieved", socket.id);
  });

  socket.on("connect_error", (err) => {
    console.log("connect error: ", err.message);
  });

  socket.on("disconnect", () => {
    console.log("disconnecting: ", socket.id);
    sockets.filter(({ id }) => id !== socket.id);

    const roomID = socketToRoom[socket.id];
    let socketRoom = rooms[roomID];
    if (socketRoom) {
      rooms[roomID] = socketRoom.filter((id) => id !== socket.id);
      io.in(roomID).emit("user-left", socket.id);
    }
  });
});

server.listen(port, () => {
  console.log(`app running on port ${port}`);
});
