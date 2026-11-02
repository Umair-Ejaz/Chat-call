import { useContext, useRef, useState } from 'react';
import { SocketContext } from '../context/SocketContext';
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export default function CallModal({ activeUser }) {
  const { call, callAccepted, answerCall, leaveCall, stream } = useContext(SocketContext);
  const [isMuted, setIsMuted] = useState(false);
  const modalRef = useRef(null);

  useGSAP(() => {
    if (call?.isReceivingCall || callAccepted) {
      gsap.from(modalRef.current, {
        scale: 0.8,
        opacity: 0,
        duration: 0.4,
        ease: 'back.out(1.7)'
      });
    }
  }, { scope: modalRef, dependencies: [call, callAccepted] });

  // Toggle Microphone Mute/Unmute
  const toggleMute = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  if (!call?.isReceivingCall && !callAccepted) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div ref={modalRef} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-80 text-center shadow-2xl">
        <div className="w-20 h-20 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          {call?.callerName ? call.callerName[0].toUpperCase() : 'C'}
        </div>

        <h3 className="text-lg font-semibold mb-1">
          {callAccepted ? 'In Call' : 'Incoming Call...'}
        </h3>
        <p className="text-slate-400 text-sm mb-6">
          {callAccepted ? activeUser?.username || 'Active Call' : `${call?.callerName} is calling you`}
        </p>

        <div className="flex justify-center items-center space-x-4">
          {/* Answer Call Button (Only shown on incoming calls) */}
          {call?.isReceivingCall && !callAccepted && (
            <button
              onClick={answerCall}
              className="bg-emerald-600 hover:bg-emerald-500 p-4 rounded-full text-white shadow-lg shadow-emerald-950 transition"
            >
              <Phone className="w-6 h-6" />
            </button>
          )}

          {/* Mute/Unmute Toggle Button (Only active when in a call) */}
          {callAccepted && (
            <button
              onClick={toggleMute}
              className={`p-4 rounded-full text-white shadow-lg transition ${
                isMuted 
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-950' 
                  : 'bg-slate-800 hover:bg-slate-700 shadow-slate-950'
              }`}
            >
              {isMuted ? <MicOff className="w-6 h-6 text-rose-400" /> : <Mic className="w-6 h-6" />}
            </button>
          )}

          {/* End/Reject Call Button */}
          <button
            onClick={() => leaveCall(call?.from || activeUser?._id)}
            className="bg-rose-600 hover:bg-rose-500 p-4 rounded-full text-white shadow-lg shadow-rose-950 transition"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}