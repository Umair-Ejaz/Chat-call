
import {
  useState,
  useEffect,
  useRef,
  useContext,
  useCallback,
} from 'react';

import io from 'socket.io-client';
import Peer from 'simple-peer';

import { AuthContext } from './AuthContext';
import { SocketContext } from './SocketContext';

const SOCKET_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
];

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);

  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [call, setCall] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [callError, setCallError] = useState('');
  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const socketRef = useRef(null);
  const streamRef = useRef(null);
  const connectionRef = useRef(null);
  const userAudio = useRef(null);
  const callRef = useRef(null);
  const acceptedSignalHandlerRef = useRef(null);
  const userIdRef = useRef(user?._id);
  const usernameRef = useRef(user?.username);
  const endingRef = useRef(false);

  useEffect(() => {
    userIdRef.current = user?._id;
    usernameRef.current = user?.username;
  }, [user?._id, user?.username]);

  const updateCall = useCallback((nextCall) => {
    callRef.current = nextCall;
    setCall(nextCall);
  }, []);

  const cleanupMedia = useCallback(() => {
    if (acceptedSignalHandlerRef.current && socketRef.current) {
      socketRef.current.off(
        'call_accepted',
        acceptedSignalHandlerRef.current
      );
      acceptedSignalHandlerRef.current = null;
    }

    if (connectionRef.current) {
      const peer = connectionRef.current;
      connectionRef.current = null;

      peer.removeAllListeners();
      if (!peer.destroyed) peer.destroy();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (userAudio.current) {
      userAudio.current.srcObject = null;
    }

    setStream(null);
    setRemoteStream(null);
    setCallAccepted(false);
  }, []);

  const handleCallTeardown = useCallback(() => {
    endingRef.current = true;
    cleanupMedia();
    updateCall(null);
    setCallEnded(true);
    endingRef.current = false;
  }, [cleanupMedia, updateCall]);

  // Connect the authenticated user to Socket.IO.
  useEffect(() => {
    const currentUserId = user?._id;

    if (!currentUserId) {
      setSocket(null);
      setOnlineUsers([]);
      return;
    }

    const socketInstance = io(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socketRef.current = socketInstance;

    const onConnect = () => {
      console.log('Socket connected:', socketInstance.id);
      setSocket(socketInstance);
      socketInstance.emit('user_connected', String(currentUserId));
    };

    const onConnectError = (error) => {
      console.error('Socket connection error:', error.message);
    };

    const onDisconnect = (reason) => {
      console.log('Socket disconnected:', reason);
      setSocket(null);
    };

    const onOnlineUsers = (users) => {
      setOnlineUsers(Array.isArray(users) ? users : []);
    };

    const onIncomingCall = (payload) => {
      console.log('Incoming call payload:', payload);

      if (!payload?.from || !payload?.signal) {
        console.error('Incoming call payload is incomplete.');
        return;
      }

      if (callRef.current) {
        console.warn('Already handling a call; ignoring new incoming call.');
        return;
      }

      setCallError('');
      setCallEnded(false);

      updateCall({
        isReceivingCall: true,
        from: String(payload.from),
        callerName: payload.callerName || 'Unknown caller',
        signal: payload.signal,
      });
    };

    const onCallEnded = () => {
      console.log('Remote user ended the call.');
      handleCallTeardown();
    };

    const onCallUnavailable = (payload) => {
      console.error('Call unavailable:', payload);
      setCallError('User is offline or unavailable.');
      handleCallTeardown();
    };

    socketInstance.on('connect', onConnect);
    socketInstance.on('connect_error', onConnectError);
    socketInstance.on('disconnect', onDisconnect);
    socketInstance.on('get_online_users', onOnlineUsers);
    socketInstance.on('incoming_call', onIncomingCall);
    socketInstance.on('call_ended', onCallEnded);
    socketInstance.on('call_unavailable', onCallUnavailable);

    return () => {
      socketInstance.removeAllListeners();
      socketInstance.disconnect();

      if (socketRef.current === socketInstance) {
        socketRef.current = null;
      }

      setSocket(null);
    };
  }, [user?._id, handleCallTeardown, updateCall]);

  // Display the other user's audio.
  useEffect(() => {
    const audio = userAudio.current;

    if (!audio || !remoteStream) return;

    audio.srcObject = remoteStream;

    audio.play().catch((error) => {
      console.warn('Remote audio playback failed:', error);
    });

    return () => {
      if (audio.srcObject === remoteStream) {
        audio.srcObject = null;
      }
    };
  }, [remoteStream]);

  // Create and attach a peer for the outgoing call.
  const callUser = useCallback(async (idToCall, receiverName = 'User') => {
    const activeSocket = socketRef.current;

    if (!activeSocket?.connected) {
      setCallError('Socket server se connection nahi hai.');
      return;
    }

    if (connectionRef.current || callRef.current) {
      setCallError('A call is already active.');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCallError('Microphone API unavailable. HTTPS is required on LAN.');
      return;
    }

    setCallError('');
    setCallEnded(false);

    updateCall({
      isReceivingCall: false,
      to: String(idToCall),
      toName: receiverName,
      callerName: usernameRef.current || 'You',
    });

    try {
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      if (!activeSocket.connected) {
        localStream.getTracks().forEach((track) => track.stop());
        throw new Error('Socket disconnected while starting the call.');
      }

      streamRef.current = localStream;
      setStream(localStream);

      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: localStream,
        config: { iceServers: ICE_SERVERS },
      });

      connectionRef.current = peer;

      peer.on('signal', (signalData) => {
        console.log('Sending outgoing call offer.');
        activeSocket.emit('call_user', {
          userToCall: String(idToCall),
          signalData,
          from: String(userIdRef.current),
          callerName: usernameRef.current || 'User',
        });
      });

      peer.on('stream', (incomingStream) => {
        console.log('Caller received remote audio stream.');
        setRemoteStream(incomingStream);
      });

      peer.on('connect', () => {
        console.log('Caller WebRTC connection established.');
        setCallAccepted(true);
        setCallError('');
      });

      peer.on('error', (error) => {
        console.error('Caller peer error:', error);
        setCallError(`Caller peer error: ${error.message}`);
      });

      const onAccepted = (answerSignal) => {
        console.log('Received call_accepted from receiver.');

        if (connectionRef.current !== peer || peer.destroyed) return;

        try {
          peer.signal(answerSignal);
        } catch (error) {
          console.error('Applying answer signal failed:', error);
          setCallError(`Answer signal error: ${error.message}`);
        }
      };

      acceptedSignalHandlerRef.current = onAccepted;
      activeSocket.on('call_accepted', onAccepted);
    } catch (error) {
      console.error('Outgoing call setup failed:', error.name, error.message);
      setCallError(`${error.name || 'Call error'}: ${error.message}`);
      handleCallTeardown();
    }
  }, [handleCallTeardown, updateCall]);

  // Accept an incoming call and send the WebRTC answer.
  const answerCall = useCallback(async () => {
    const activeSocket = socketRef.current;
    const currentCall = callRef.current;

    if (!activeSocket?.connected || !currentCall?.isReceivingCall) {
      setCallError('Incoming call ya socket connection available nahi hai.');
      return;
    }

    if (connectionRef.current) {
      setCallError('A peer connection already exists.');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCallError('Microphone API unavailable. Use HTTPS on the other laptop.');
      return;
    }

    setCallError('');

    try {
      console.log('Receiver requesting microphone permission.');

      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      streamRef.current = localStream;
      setStream(localStream);

      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: localStream,
        config: { iceServers: ICE_SERVERS },
      });

      connectionRef.current = peer;

      peer.on('signal', (answerSignal) => {
        console.log('Receiver sending answer signal.');

        activeSocket.emit('answer_call', {
          signal: answerSignal,
          to: String(currentCall.from),
        });
      });

      peer.on('stream', (incomingStream) => {
        console.log('Receiver received remote audio stream.');
        setRemoteStream(incomingStream);
      });

      peer.on('connect', () => {
        console.log('Receiver WebRTC connection established.');
        setCallAccepted(true);
        setCallError('');
      });

      peer.on('error', (error) => {
        console.error('Receiver peer error:', error);
        setCallError(`Receiver peer error: ${error.message}`);
      });

      peer.signal(currentCall.signal);
    } catch (error) {
      console.error('Receiver call setup failed:', error.name, error.message);
      setCallError(`${error.name || 'Call error'}: ${error.message}`);
      cleanupMedia();
    }
  }, [cleanupMedia]);

  // End or decline the call.
  const leaveCall = useCallback((targetUserId) => {
    const activeSocket = socketRef.current;
    const currentCall = callRef.current;

    const recipientId =
      targetUserId ||
      (currentCall?.isReceivingCall ? currentCall.from : currentCall?.to);

    if (activeSocket?.connected && recipientId) {
      activeSocket.emit('end_call', { to: String(recipientId) });
    }

    handleCallTeardown();
  }, [handleCallTeardown]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineUsers,
        call,
        callAccepted,
        callEnded,
        callError,
        userAudio,
        stream,
        remoteStream,
        callUser,
        answerCall,
        leaveCall,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
