const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  
  // 🔥 CORRECCIÓN: Password opcional para soportar OAuth
  password: { type: String, required: false }, 
  
  avatar: { type: String, default: null },
  status: {
    type: String,
    enum: ["online", "offline", "typing"],
    default: "offline"
  }
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);