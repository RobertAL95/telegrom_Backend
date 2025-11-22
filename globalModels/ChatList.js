// globalsModels/ChatList.js
const mongoose = require("mongoose");

const ChatListSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "userModel",
  },

  userModel: {
    type: String,
    required: true,
    enum: ["User", "UserGuest"],
  },

  contacts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "contactsModel",
    }
  ],

  contactsModel: [
    {
      type: String,
      enum: ["User", "UserGuest"],
    }
  ]

}, { timestamps: true });

module.exports = mongoose.model("ChatList", ChatListSchema);
