const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true,
    refPath: "messages.senderModel" // ⚠️ Ojo al path relativo
  },
  senderModel: {
    type: String,
    required: true,
    enum: ["User", "UserGuest"],
  },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const ConversationSchema = new mongoose.Schema({
  // 🔥 CORRECCIÓN: Estructura unificada para Polymorphism
  participants: [
    {
      _id: false, // Evitamos crear sub-ids innecesarios
      data: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "participants.model" // Referencia dinámica
      },
      model: {
        type: String,
        required: true,
        enum: ["User", "UserGuest"]
      }
    }
  ],
  
  messages: [MessageSchema],
  lastMessage: { type: String, default: "" },
}, { timestamps: true });

// Middleware para lastMessage
ConversationSchema.pre("save", function(next) {
  if (this.messages && this.messages.length > 0) {
    this.lastMessage = this.messages[this.messages.length - 1].text;
  }
  next();
});

module.exports = mongoose.model("Conversation", ConversationSchema);