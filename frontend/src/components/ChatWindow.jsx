    import { useState, useRef } from 'react';
import { Phone, Send } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export default function ChatWindow({ activeUser, messages, onSendMessage, onStartCall, currentUser }) {
  const [text, setText] = useState('');
  const chatContainerRef = useRef(null);

  useGSAP(() => {
    if (messages.length > 0) {
      gsap.from('.chat-bubble:last-child', {
        y: 15,
        opacity: 0,
        duration: 0.25,
        ease: 'power2.out'
      });
    }
  }, { dependencies: [messages], scope: chatContainerRef });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text);
    setText('');
  };

  if (!activeUser) {
    return (
      <main className="flex-1 flex items-center justify-center bg-slate-950 text-slate-500">
        <p>Select a user to start chatting</p>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col justify-between bg-slate-950">
      <header className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold uppercase">
            {activeUser.username[0]}
          </div>
          <div>
            <h3 className="font-semibold text-sm">{activeUser.username}</h3>
          </div>
        </div>

        <button
          onClick={onStartCall}
          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition shadow-lg shadow-emerald-950"
        >
          <Phone className="w-4 h-4" />
          <span>Audio Call</span>
        </button>
      </header>

      <div ref={chatContainerRef} className="flex-1 p-6 overflow-y-auto space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={msg._id || idx}
            className={`chat-bubble flex ${
              (msg.sender === currentUser._id || msg.senderId === currentUser._id)
                ? 'justify-end'
                : 'justify-start'
            }`}
          >
            <div
              className={`max-w-xs md:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                (msg.sender === currentUser._id || msg.senderId === currentUser._id)
                  ? 'bg-emerald-600 text-white rounded-br-none'
                  : 'bg-slate-800 text-slate-200 rounded-bl-none'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-800 bg-slate-900 flex items-center space-x-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition text-slate-100"
        />
        <button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-xl transition"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </main>
  );
}