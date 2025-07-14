import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { socket } from '../socket';
import Recorder from '../components/Recorder';
import AudioPlayer from '../components/AudioPlayer';

export default function ChatPage() {
  const [messages, setMessages]             = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [onlineUsers, setOnlineUsers]       = useState([]);
  const [currentUser] = useState(() => JSON.parse(localStorage.getItem('user')));
  const endRef      = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!currentUser?.id) return;

    socket.connect(currentUser);
    socket.emit('userOnline', currentUser);

    socket.emit('loadPublicHistory');
    socket.on('publicHistory', history => {
      setMessages(history);
    });

    socket.on('getOnlineUsers', users => {
      console.log('Online users:', users);
      setOnlineUsers(users);
    });

    const handleNew = msg => {
      setMessages(prev => {
        if (prev.some(m => m._id === msg._id)) return prev;

  
        if (msg.author?._id !== currentUser.id) {
          audioRef.current?.play().catch(err => {
            console.warn("Sound error:", err);
          });
        }

        return [...prev, msg];
      });
    };
    socket.on('receivePublicMessage', handleNew);

    return () => {
      socket.off('publicHistory');
      socket.off('getOnlineUsers');
      socket.off('receivePublicMessage', handleNew);
    };
  }, [currentUser]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendText = e => {
    e.preventDefault();
    const text = currentMessage.trim();
    if (!text) return;
    socket.emit('sendPublicMessage', {
      messageType: 'text',
      text,
      audioUrl: null
    });
    setCurrentMessage('');
  };

  const sendAudio = url => {
    socket.emit('sendPublicMessage', {
      messageType: 'audio',
      text: null,
      audioUrl: url
    });
  };

  const logout = () => {
    socket.disconnect();
    localStorage.clear();
    window.location.href = '/auth';
  };

  return (
    <div className="flex h-screen bg-darkgreen text-lime ">


      <audio ref={audioRef} src="/sounds/notification.mp3" preload="auto" />


      <aside className={`
        fixed inset-y-0 left-0 z-20 w-72 bg-black p-4 flex flex-col 
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:flex-shrink-0
      `}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl ">Now Online ({onlineUsers.length})</h2>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden border-2 rounded-full p-2 ml-2 mt-2">✕</button>
        </div>

        <ul className="flex-grow overflow-y-auto space-y-2 border-t border-litegreen pt-4">
          {onlineUsers.filter(u => u.id !== currentUser.id).length === 0 && (
            <li className="text-center text-gray-400 ">No users online.</li>
          )}
          {onlineUsers
            .filter(u => u.id !== currentUser.id)
            .map(u => (
              <li key={u.id}>
                <Link
                  to={`/chat/${u.username}`}
                  className="block w-full text-center text-xl rounded-full text-white font-bold hover:bg-life mb-2  bg-darkgreen animate-glow"
                >
                  {u.username}
                </Link>
              </li>
            ))
          }
        </ul>
        <div className='flex-row flex'>
          <h1 className='w-1/2 cursor-pointer underline'>Log out</h1>
          <button onClick={logout}
                  className="w-1/2 p-2 bg-orange-500 text-white font-bold py-2 rounded-full hover:bg-red-600">
            Out
          </button>
        </div>
      </aside>

  
      <main className="flex flex-1 flex-col bg-lime ">


        <div className="md:hidden h-1/8 flex items-center p-2 bg-green border-b-2 border-darkgreen">
          <div className='border-2 flex items-center'>
            <button onClick={() => setSidebarOpen(true)} className="mr-2">☰</button>
          </div>
          <div className=''>
             <h1 className="text-5xl font-bold cursor-pointer">XChat</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {messages.map(msg => (
            <div
              key={msg._id}
              className={`flex w-full mb-2 
                ${msg.author?._id === currentUser.id ? 'justify-end' : 'justify-start'}
              `}
            >
              <div className={`p-3 rounded-lg break-words
                ${msg.author?._id === currentUser.id
                  ? 'bg-litegreen text-darkgreen text-right rounded-br-none'
                  : 'bg-green text-lime text-left rounded-bl-none'}
                max-w-[70%] w-fit
              `}>
                <p className="font-bold">{msg.author?.username || 'Unknown'}</p>
                {msg.messageType === 'audio'
                  ? <AudioPlayer src={msg.audioUrl} />
                  : <p>{msg.text}</p>}
                <p className="mt-1 text-xs opacity-70">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>


        <form onSubmit={sendText}
              className="flex items-center gap-2 p-4 bg-green border-t-2 border-darkgreen">
          <input
            type="text"
            value={currentMessage}
            onChange={e => setCurrentMessage(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 p-2 bg-darkgreen border border-litegreen rounded focus:outline-none"
          />
          <button type="submit"
                  className="px-4 py-2 bg-darkgreen text-white rounded hover:bg-life">
            Send
          </button>
          <Recorder onSendAudio={sendAudio} />
        </form>
      </main>
    </div>
  );
}
