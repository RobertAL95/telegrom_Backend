const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true,
    refPath: "messages.senderModel" // Referencia dinámica interna
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
  // 🔥 CORRECCIÓN CRÍTICA:
  // Cambiamos 'participants' a un array simple de IDs para que coincida con tu Service.
  // Usamos refPath para que el populate sepa si buscar en 'User' o 'UserGuest'.
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'participantsModel' // <--- Mongoose mirará el array paralelo
  }],

  // Agregamos este campo que tu service.js YA estaba intentando guardar
  participantsModel: [{
    type: String,
    required: true,
    enum: ["User", "UserGuest"]
  }],
  
  messages: [MessageSchema],
  lastMessage: { type: String, default: "" },
}, { timestamps: true });

// Middleware para actualizar lastMessage automáticamente
ConversationSchema.pre("save", function(next) {
  if (this.messages && this.messages.length > 0) {
    this.lastMessage = this.messages[this.messages.length - 1].text;
  }
  next();
});

module.exports = mongoose.model("Conversation", ConversationSchema);