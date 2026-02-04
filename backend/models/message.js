import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    chatId: { type: String, required: true },
    sender: { type: String, required: true }, 
    text: { type: String, default: "" },
    fileUrl: { type: String, default: null },
    fileType: { type: String, default: null },
    fileName: { type: String, default: null },


  },
  { timestamps: true } 
);

export default mongoose.model("Message", messageSchema);
