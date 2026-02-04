import express from "express";
import {
  saveMessage,
  getMessages,
} from "../controllers/messageController.js";
import Message from "../models/message.js"; 

const router = express.Router();

// Fetch all chat history
router.get("/", getMessages);

// Save new message
router.post("/", saveMessage);

router.get("/:chatId", async (req, res) => {
    const messages= await Message.find({
        chatId: req.params.chatId,
    }).sort({createdAt:1})
    res.json(messages)
});

router.get("/last/:chatId", async (req, res) => {
  const lastMsg = await Message.findOne({
    chatId: req.params.chatId,
  }).sort({ createdAt: -1 });

  res.json(lastMsg);
});


export default router;
