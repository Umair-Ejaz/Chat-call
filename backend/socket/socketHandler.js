
const onlineUsers = new Map();

export default function socketHandler(io) {
  io.on('connection', (socket) => {
    console.log('🟢 Socket connected:', socket.id);

    // Register logged-in user
    socket.on('user_connected', (userId) => {
      if (!userId) {
        console.warn('❌ user_connected: missing userId');
        return;
      }

      const normalizedUserId = String(userId);

      // Remove previous mapping for this user if reconnecting
      const previousSocketId = onlineUsers.get(normalizedUserId);

      if (previousSocketId && previousSocketId !== socket.id) {
        console.log(
          '🔄 Updating socket for user:',
          normalizedUserId
        );
      }

      socket.data.userId = normalizedUserId;
      onlineUsers.set(normalizedUserId, socket.id);

      console.log(
        '✅ User online:',
        normalizedUserId,
        '| Socket:',
        socket.id
      );

      io.emit('get_online_users', [...onlineUsers.keys()]);
    });

    // Relay chat messages
    socket.on('send_message', (data) => {
      if (!data?.receiverId) {
        console.warn('❌ Message missing receiverId');
        return;
      }

      const recipientSocketId = onlineUsers.get(
        String(data.receiverId)
      );

      if (!recipientSocketId) {
        console.log(
          '⚠️ Message recipient is offline:',
          data.receiverId
        );
        return;
      }

      io.to(recipientSocketId).emit('receive_message', data);
    });

    // Caller sends WebRTC offer
    socket.on('call_user', (data = {}) => {
      const { userToCall, signalData, from, callerName } = data;

      console.log('📞 call_user received:', {
        from,
        userToCall,
        hasSignal: Boolean(signalData),
      });

      if (!userToCall || !signalData || !from) {
        console.warn('❌ Invalid call_user payload');
        return;
      }

      const normalizedReceiverId = String(userToCall);
      const recipientSocketId = onlineUsers.get(
        normalizedReceiverId
      );

      if (!recipientSocketId) {
        console.warn(
          '⚠️ Call recipient is offline:',
          normalizedReceiverId
        );

        socket.emit('call_unavailable', {
          userId: normalizedReceiverId,
        });

        return;
      }

      console.log(
        `📤 Sending incoming_call to user ${normalizedReceiverId}`
      );

      io.to(recipientSocketId).emit('incoming_call', {
        signal: signalData,
        from: String(from),
        callerName: callerName || 'Unknown user',
      });
    });

    // Receiver sends WebRTC answer
    socket.on('answer_call', (data = {}) => {
      const { signal, to } = data;

      console.log('📥 answer_call received:', {
        receiver: socket.data.userId,
        to,
        hasSignal: Boolean(signal),
      });

      if (!signal || !to) {
        console.warn('❌ Invalid answer_call payload');
        return;
      }

      const callerSocketId = onlineUsers.get(String(to));

      if (!callerSocketId) {
        console.error(
          '❌ Original caller is offline:',
          to
        );

        socket.emit('call_unavailable', {
          userId: String(to),
        });

        return;
      }

      console.log(
        '📤 Sending call_accepted to caller socket:',
        callerSocketId
      );

      io.to(callerSocketId).emit('call_accepted', signal);
    });

    // Cancel, decline or end call
    socket.on('end_call', ({ to } = {}) => {
      if (!to) {
        console.warn('⚠️ end_call: missing recipient ID');
        return;
      }

      const targetSocketId = onlineUsers.get(String(to));

      console.log('📴 end_call:', {
        from: socket.data.userId,
        to: String(to),
        targetFound: Boolean(targetSocketId),
      });

      if (targetSocketId) {
        io.to(targetSocketId).emit('call_ended');
      }
    });

    // Disconnect cleanup
    socket.on('disconnect', (reason) => {
      const userId = socket.data.userId;

      // Avoid removing a newer socket mapping after reconnect.
      if (
        userId &&
        onlineUsers.get(userId) === socket.id
      ) {
        onlineUsers.delete(userId);

        console.log('🔴 User offline:', userId);
      }

      console.log(
        '🔌 Socket disconnected:',
        socket.id,
        reason
      );

      io.emit('get_online_users', [...onlineUsers.keys()]);
    });
  });
}
