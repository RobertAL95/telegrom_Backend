const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { 
      type: String, 
      required: true,
      trim: true // 👈 Elimina espacios al inicio/final
  },
  email: { 
      type: String, 
      required: true, 
      unique: true,
      trim: true, // 👈 Elimina espacios
      lowercase: true // 👈 Fuerza minúsculas siempre
  },
  
  password: { type: String, required: false }, 
  
  avatar: { type: String, default: null },
  status: {
    type: String,
    enum: ["online", "offline", "typing"],
    default: "offline"
  }
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);