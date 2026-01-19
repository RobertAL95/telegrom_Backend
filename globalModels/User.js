const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { 
      type: String, 
      required: true,
      trim: true 
  },
  email: { 
      type: String, 
      required: true, 
      unique: true,
      trim: true, 
      lowercase: true 
  },
  password: { 
      type: String, 
      required: false // Asumo false para soportar OAuth en el futuro
  }, 

  // ✨ EL NUEVO CAMPO ID CORTO
  friendId: {
        type: String,
        unique: true,
        required: true, // ¡OJO! Esto obliga a que el Service lo genere
    },
  
  avatar: { 
      type: String, 
      default: null 
  },

  // ✨ STATUS (Unificado)
  status: {
    type: String,
    enum: ["online", "offline", "typing"], // Solo permite estos valores
    default: "online" // Al registrarse, nacen "online"
  }
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);