import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import Message from "./models/message.js";

let onlineUsers = new Map();

dotenv.config();


const app = express();
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://chat-applicationn-rho.vercel.app",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(express.json());


connectDB();

app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);


app.get("/", (_req, res) => {
  res.send("Backend Running Successfully!");
});

// Create http server 
const httpServer = http.createServer(app)

// Socket.io setup 
const io = new Server(httpServer, {
  cors: {
   origin: [
      "http://localhost:5173",
      "https://chat-applicationn-rho.vercel.app",
    ],
    methods: ["GET", "POST"],
  },
});

// socket events 
io.on("connection", (socket) => {
  console.log("User connected: ", socket.id);

  // User Online Event
  socket.on("userOnline", (username) => {
    onlineUsers.set(socket.id, username);

    io.emit(
      "onlineUsers",
      [...new Set(onlineUsers.values())] // no duplicates
    );
  });

  socket.on("sendMessage", async (msgData) => {
    try {
    //  Prevent empty message with no file
    if (!msgData.text?.trim() && !msgData.fileUrl) {
      return;
    }
    // save in mongodb and send msg to specific user
    const newMessage = await Message.create({
      chatId: msgData.chatId,
      sender: msgData.sender,
      text: msgData.text?.trim() || "",
      fileUrl: msgData.fileUrl || null,
      fileType: msgData.fileType || null,
      fileName: msgData.fileName,

    });
    io.to(msgData.chatId).emit("receiveMessage", newMessage);
  }
  catch (error) {
    console.log("Message Save Error:", error.message);
  }
  });

  // Join Room for Private Chat 
  socket.on("joinRoom", (chatId) => {
    socket.join(chatId);
    console.log("Joined Room:", chatId);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
    onlineUsers.delete(socket.id);
    io.emit("onlineUsers", [...new Set(onlineUsers.values())]);
  });

socket.on("typing", ({ chatId, user }) => {
  socket.to(chatId).emit("showTyping", user);
});

socket.on("stopTyping", (chatId) => {
  socket.to(chatId).emit("hideTyping");
});


});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`✅ Server started on http://localhost:${PORT}`);
});
