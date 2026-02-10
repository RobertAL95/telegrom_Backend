const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true,
    refPath: "messages.senderModel" 
  },
  senderModel: {
    type: String,
    required: true,
    enum: ["User", "UserGuest"],
  },
  // 👇 CAMBIO 1: Quitamos 'required: true' del texto, porque puede ser solo una foto
  text: { type: String, default: "" }, 
  
  // 👇 CAMBIO 2: Agregamos el campo 'media' para guardar la info de Cloudinary
  media: {
    url: { type: String },       // La URL de la imagen/video
    type: { type: String },      // 'image/png', 'video/mp4', etc.
    public_id: { type: String }  // ID de Cloudinary (para borrarla después si hace falta)
  },
  
  createdAt: { type: Date, default: Date.now }
});

const ConversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'participantsModel'
  }],

  participantsModel: [{
    type: String,
    required: true,
    enum: ["User", "UserGuest"]
  }],
  
  messages: [MessageSchema],
  lastMessage: { type: String, default: "" },
}, { timestamps: true });

// 👇 CAMBIO 3: Mejoramos la vista previa del último mensaje
ConversationSchema.pre("save", function(next) {
  if (this.messages && this.messages.length > 0) {
    const lastMsg = this.messages[this.messages.length - 1];
    
    // Si hay texto, mostramos el texto.
    if (lastMsg.text && lastMsg.text.trim().length > 0) {
        this.lastMessage = lastMsg.text;
    } 
    // Si no hay texto pero hay media, mostramos un indicador
    else if (lastMsg.media && lastMsg.media.url) {
        this.lastMessage = "📷 Multimedia";
    } 
    // Fallback
    else {
        this.lastMessage = "";
    }
  }
  next();
});

module.exports = mongoose.model("Conversation", ConversationSchema);