const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const users = [];

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.post("/signup", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }

  const trimmedUsername = username.trim();

  if (trimmedUsername.length < 3) {
    return res
      .status(400)
      .json({ message: "Username must be at least 3 characters" });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters" });
  }

  const existingUser = users.find(
    (user) => user.username.toLowerCase() === trimmedUsername.toLowerCase(),
  );

  if (existingUser) {
    return res.status(400).json({ message: "Username already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  users.push({
    username: trimmedUsername,
    password: hashedPassword,
  });

  res.status(201).json({
    message: "Signup successful",
    username: trimmedUsername,
  });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }

  const user = users.find(
    (savedUser) =>
      savedUser.username.toLowerCase() === username.trim().toLowerCase(),
  );

  if (!user) {
    return res.status(400).json({ message: "Invalid username or password" });
  }

  const isPasswordCorrect = await bcrypt.compare(password, user.password);

  if (!isPasswordCorrect) {
    return res.status(400).json({ message: "Invalid username or password" });
  }

  res.json({
    message: "Login successful",
    username: user.username,
  });
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("send_message", (data) => {
    console.log("Message received:", data);

    io.emit("receive_message", data);
  });
  socket.on("typing", (username) => {
    socket.broadcast.emit("user_typing", username);
  });

  socket.on("stop_typing", () => {
    socket.broadcast.emit("user_stop_typing");
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});

server.listen(3001, () => {
  console.log("Server is running on port 3001");
});
