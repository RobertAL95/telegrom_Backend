const mongoose = require("mongoose");

const GuestSchema = new mongoose.Schema({
  name: { type: String, required: true },

  chatId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Conversation", 
    required: true 
  },

  inviterId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },

  avatar: { type: String, default: null },

  isGuest: { type: Boolean, default: true },

  // TTL INDEX — expira en 12 horas
  createdAt: { 
    type: Date, 
    default: Date.now, 
    expires: 60 * 60 * 12   // 12h
  }
});

module.exports = mongoose.model("UserGuest", GuestSchema);
