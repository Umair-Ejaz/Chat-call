
import { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';

import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';

import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import CallModal from '../components/CallModal';
import AudioCall from '../components/AudioCall';

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Detailed API error logging
function logApiError(label, error) {
  console.error(`❌ ${label}`);
  console.error('API Base URL:', API_URL);
  console.error('Request URL:', error.config?.url);
  console.error('Full Request URL:', error.config?.baseURL
    ? `${error.config.baseURL}${error.config.url || ''}`
    : 'Unavailable');
  console.error('Error Message:', error.message);
  console.error('HTTP Status:', error.response?.status ?? 'No response');
  console.error('Server Response:', error.response?.data ?? 'No response data');

  if (error.code) {
    console.error('Error Code:', error.code);
  }
}

export default function Dashboard() {
  const { user, token, logout } = useContext(AuthContext);
  const { socket, onlineUsers, callUser } = useContext(SocketContext);

  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);

  const [usersLoading, setUsersLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  // Fetch users
  const fetchUsers = useCallback(async () => {
    if (!token) {
      setUsers([]);
      return;
    }

    setUsersLoading(true);
    setApiError('');

    try {
      console.log('📡 Fetching users from:', `${API_URL}/api/auth/users`);

      const response = await api.get('/api/auth/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('✅ Users API status:', response.status);
      console.log('✅ Users API response:', response.data);

      // Supports either an array or { users: [...] } response.
      const responseUsers = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.users)
          ? response.data.users
          : Array.isArray(response.data?.data)
            ? response.data.data
            : [];

      setUsers(responseUsers);
    } catch (error) {
      logApiError('Fetching users failed', error);

      setApiError(
        error.response?.data?.message ||
        error.response?.data?.error ||
        (error.response
          ? `Users API failed with status ${error.response.status}.`
          : 'Cannot reach the backend. Check the IP, server, network and browser console.')
      );

      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setUsersLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Fetch chat history when the active user changes
  useEffect(() => {
    let cancelled = false;

    const fetchMessages = async () => {
      if (!activeUser?._id || !token) {
        setMessages([]);
        setMessagesLoading(false);
        return;
      }

      setMessages([]);
      setMessagesLoading(true);

      try {
        const endpoint = `/api/chat/${encodeURIComponent(activeUser._id)}`;

        console.log('📡 Fetching chat history:', `${API_URL}${endpoint}`);

        const response = await api.get(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log('✅ Chat history status:', response.status);
        console.log('✅ Chat history response:', response.data);

        if (!cancelled) {
          const responseMessages = Array.isArray(response.data)
            ? response.data
            : Array.isArray(response.data?.messages)
              ? response.data.messages
              : Array.isArray(response.data?.data)
                ? response.data.data
                : [];

          setMessages(responseMessages);
        }
      } catch (error) {
        logApiError('Fetching chat history failed', error);

        if (!cancelled) {
          setMessages([]);
        }
      } finally {
        if (!cancelled) {
          setMessagesLoading(false);
        }
      }
    };

    fetchMessages();

    return () => {
      cancelled = true;
    };
  }, [activeUser?._id, token]);

  // Listen for incoming socket messages
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (msg) => {
      if (!msg) return;

      const senderId = String(msg.senderId?._id || msg.senderId || '');
      const currentActiveUserId = String(activeUser?._id || '');

      if (senderId && senderId === currentActiveUserId) {
        setMessages((previousMessages) => [
          ...previousMessages,
          msg,
        ]);
      }
    };

    socket.on('receive_message', handleReceiveMessage);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [socket, activeUser?._id]);

  // Send message
  const handleSendMessage = async (text) => {
    if (!activeUser?._id || !token || !text?.trim()) {
      return;
    }

    const messageText = text.trim();

    try {
      console.log('📤 Sending message to:', activeUser._id);

      const response = await api.post(
        '/api/chat/send',
        {
          receiverId: activeUser._id,
          text: messageText,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('✅ Send message status:', response.status);

      const savedMessage = response.data?.message || response.data?.data || response.data;

      if (!savedMessage || typeof savedMessage !== 'object') {
        console.error('Unexpected message response:', response.data);
        return;
      }

      const messageData = {
        ...savedMessage,
        senderId: user?._id || user?.id,
        receiverId: activeUser._id,
      };

      setMessages((previousMessages) => [
        ...previousMessages,
        messageData,
      ]);

      if (socket?.connected) {
        socket.emit('send_message', messageData);
      } else {
        console.warn('⚠️ Socket is disconnected; message was saved via API.');
      }
    } catch (error) {
      logApiError('Sending message failed', error);
    }
  };

  const handleStartCall = () => {
    if (!activeUser?._id) {
      console.warn('Select a user before starting a call.');
      return;
    }

    if (!socket?.connected) {
      console.error('Cannot start call: Socket.IO is disconnected.');
      return;
    }

    console.log('📞 Starting audio call with:', activeUser._id);
    callUser(activeUser._id);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Sidebar
        users={users}
        activeUser={activeUser}
        setActiveUser={setActiveUser}
        onlineUsers={onlineUsers}
        currentUser={user}
        onLogout={logout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {apiError && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 border-b border-red-500/30 bg-red-950/60 px-4 py-3 text-sm text-red-200"
          >
            <span>{apiError}</span>

            <button
              type="button"
              onClick={fetchUsers}
              disabled={usersLoading}
              className="rounded-md border border-red-400/40 px-3 py-1.5 hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {usersLoading ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        )}

        {usersLoading && users.length === 0 && (
          <p className="px-4 py-2 text-sm text-slate-400">
            Connecting to server and loading users...
          </p>
        )}

        <ChatWindow
          activeUser={activeUser}
          messages={messages}
          onSendMessage={handleSendMessage}
          onStartCall={handleStartCall}
          currentUser={user}
        />

        {messagesLoading && activeUser && (
          <p className="px-4 py-2 text-xs text-slate-400">
            Loading chat history...
          </p>
        )}
      </div>

      <CallModal activeUser={activeUser} />
      <AudioCall />
    </div>
  );
}
