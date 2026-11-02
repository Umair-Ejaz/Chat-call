
import { useContext } from 'react';
import { SocketContext } from '../context/SocketContext';

export default function AudioCall() {
  const {
    userAudio,
    call,
    callAccepted,
    callEnded,
    callError,
    answerCall,
    leaveCall,
  } = useContext(SocketContext);

  if (!call || callEnded) {
    return (
      <>
        {callError && (
          <div className="fixed bottom-4 left-1/2 z-[9999] -translate-x-1/2 rounded-xl bg-red-600 px-5 py-3 text-white shadow-xl">
            {callError}
          </div>
        )}
      </>
    );
  }

  const isIncoming = call.isReceivingCall;
  const targetId = isIncoming ? call.from : call.to;

  return (
    <>
      <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-7 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
            {isIncoming ? '📲' : '📞'}
          </div>

          <h2 className="text-xl font-bold text-gray-900">
            {isIncoming
              ? `${call.callerName || 'Someone'} is calling`
              : callAccepted
                ? `Connected to ${call.toName || 'User'}`
                : `Calling ${call.toName || 'User'}...`}
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            {callAccepted
              ? 'Audio call connected'
              : isIncoming
                ? 'Incoming audio call'
                : 'Waiting for answer...'}
          </p>

          {!callAccepted && isIncoming && (
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={answerCall}
                className="rounded-full bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
              >
                Accept
              </button>

              <button
                onClick={() => leaveCall(targetId)}
                className="rounded-full bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-700"
              >
                Decline
              </button>
            </div>
          )}

          {!isIncoming && !callAccepted && (
            <button
              onClick={() => leaveCall(targetId)}
              className="mt-6 rounded-full bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-700"
            >
              Cancel Call
            </button>
          )}

          {callAccepted && (
            <button
              onClick={() => leaveCall(targetId)}
              className="mt-6 rounded-full bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-700"
            >
              End Call
            </button>
          )}

          {callError && (
            <p className="mt-4 text-sm text-red-600">{callError}</p>
          )}
        </div>
      </div>

      <audio ref={userAudio} autoPlay playsInline />
    </>
  );
}
