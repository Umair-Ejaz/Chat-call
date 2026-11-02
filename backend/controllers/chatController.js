import Message from '../models/Message.js';

export const getMessages = async (req, res) => {
  try {
    const { userToChatId } = req.params;
    const myId = req.user.id;

    const messages = await Message.find({
      $or: [
        { sender: myId, receiver: userToChatId },
        { sender: userToChatId, receiver: myId }
      ]
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { receiverId, text } = req.body;
    const senderId = req.user.id;

    const newMessage = await Message.create({
      sender: senderId,
      receiver: receiverId,
      text
    });

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};