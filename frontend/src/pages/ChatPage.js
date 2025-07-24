import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { socket } from '../socket';
import Recorder from '../components/Recorder';
import AudioPlayer from '../components/AudioPlayer';
import logo from '../assets/logo.png';
import defaultAvatar from '../assets/avatar.png';
import SimolifeModal from "../components/SimolifeModal";
import SimolifeVideo from "../components/SimolifeVideo";
import { useNavigate, useLocation } from 'react-router-dom';
import CallHandler from '../components/CallHandler';

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [currentUser] = useState(() => JSON.parse(localStorage.getItem('user')));
  const endRef = useRef(null);
  const audioRef = useRef(null);
  const [showSimolifeModal, setShowSimolifeModal] = useState(false);
  const [simolifeActive, setSimolifeActive] = useState(false);
  const [simolifePeer, setSimolifePeer] = useState(null);
  const [notification, setNotification] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const sidebarRef = useRef(null);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
useEffect(() => {
  const handleOutsideClick = (e) => {
    if (
      sidebarOpen &&
      sidebarRef.current &&
      !sidebarRef.current.contains(e.target)
    ) {
      setSidebarOpen(false);
    }
  };

  document.addEventListener('mousedown', handleOutsideClick);
  return () => document.removeEventListener('mousedown', handleOutsideClick);
}, [sidebarOpen]);

  
 useEffect(() => {
  socket.on('receivePrivateMessage', ({ conversationId, message }) => {
    const currentChatUser = location.pathname.split('/')[2]; 
    if (message.author !== currentChatUser) {
      setNotification({
        from: message.author,
        text: message.text,
        conversationId,
      });

      
      setTimeout(() => setNotification(null), 5000);
    }
  });

  return () => socket.off('receivePrivateMessage');
}, [location.pathname]);
  useEffect(() => {
    if (!currentUser?.id) return;

    socket.connect(currentUser);
    socket.emit('userOnline', currentUser);

    socket.emit('loadPublicHistory');
    socket.on('publicHistory', history => setMessages(history));
    socket.on('getOnlineUsers', users => setOnlineUsers(users));

    const handleNew = msg => {
      setMessages(prev => {
        if (prev.some(m => m._id === msg._id)) return prev;
        if (msg.author?._id !== currentUser.id) {
          audioRef.current?.play().catch(console.warn);
        }
        return [...prev, msg];
      });
    };

    socket.on('receivePublicMessage', handleNew);
    socket.on('messageDeleted', id => setMessages(prev => prev.filter(m => m._id !== id)));

    return () => {
      socket.off('publicHistory');
      socket.off('getOnlineUsers');
      socket.off('receivePublicMessage', handleNew);
      socket.off('messageDeleted');
    };
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) setShowSimolifeModal(true);
  }, [currentUser]);

  useEffect(() => {
    const handleMatched = ({ peer }) => {
      console.log("👥 Gematcht mit:", peer?.username || "❌ niemand");
      setSimolifePeer(null);        
      setTimeout(() => setSimolifePeer(peer), 100); 
    };

    socket.on("simolife-matched", handleMatched);
    return () => socket.off("simolife-matched", handleMatched);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendText = e => {
    e.preventDefault();
    const text = currentMessage.trim();
    if (!text) return;
    socket.emit('sendPublicMessage', { messageType: 'text', text, audioUrl: null });
    setCurrentMessage('');
  };

  const sendAudio = url => {
    socket.emit('sendPublicMessage', { messageType: 'audio', text: null, audioUrl: url });
  };

  const handleSimolifeAccept = () => {
    setShowSimolifeModal(false);
    setSimolifeActive(true);
    socket.emit("simolife-join", currentUser);
  };

  const handleSimolifeDecline = () => setShowSimolifeModal(false);

  const handleSimolifeNext = () => {
      socket.emit("simolife-leave");   
      setSimolifePeer(null);
      setSimolifeActive(false);        

      setTimeout(() => {
        socket.emit("simolife-join", currentUser);  
        setSimolifeActive(true);
      }, 500);  
    };


  const handleSimolifeLeave = () => {
    socket.emit("simolife-leave");
    setSimolifeActive(false);
    setSimolifePeer(null);
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
      });
      if (res.ok) {
        setMessages(prev => prev.filter(msg => msg._id !== messageId));
      } else {
        alert('Delete failed!');
      }
    } catch (err) {
      alert('Network error!');
    }
  };

  const logout = () => {
    socket.disconnect();
    localStorage.clear();
    window.location.href = '/auth';
  };

const getProfilePic = (profilePic) =>
  profilePic ? `${API_URL}${profilePic}` : defaultAvatar;

  return (
    <div className="flex h-screen text-white ">
     {onlineUsers && <CallHandler currentUser={onlineUsers} />}
     {notification && (
          <div className="fixed bottom-6 right-6 bg-white text-black p-4 shadow-lg rounded-lg z-50 border-l-4 border-blau animate-slide-in">
            <p className="font-bold">New message from {notification.from}</p>
            <p className="text-sm mb-2">{notification.text}</p>
            <button
              className="text-darkest underline text-sm"
              onClick={() => navigate(`/chat/${notification.from}`)}
            >
              Open 
            </button>
          </div>
        )}
      <audio ref={audioRef} src="/sounds/notification.mp3" preload="auto" />
{selectedImage && (
  <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center">
    <div className="relative max-w-full max-h-full">
      <button
        onClick={() => setSelectedImage(null)}
        className="absolute top-2 right-2 text-white text-3xl font-bold hover:text-red-400"
      >
        ×
      </button>
      <img
        src={selectedImage}
        alt="Profile"
        className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-xl border-4 border-white object-contain"
      />
    </div>
  </div>
)}

      <aside 
       ref={sidebarRef}
       className={`fixed text-gray inset-y-0 left-0 z-20 w-72 bg-litest p-2 flex flex-col transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 md:flex-shrink-0`}>
        <div className="flex flex-col items-center pb-4 border-b border-lite">
          <img
  src={getProfilePic(currentUser?.profilePic)}
  alt="My Profile"
  onClick={() => setSelectedImage(getProfilePic(currentUser?.profilePic))}
  className="cursor-pointer w-20 h-20 rounded-md   object-cover shadow hover:scale-105 transition-transform"
/>

          <div className="text-center">
            <h2 className="text-xl font-bold text-black">{currentUser?.username}</h2>
            <p className="text-xs text-black">You</p>
          </div>
        </div>
        <div className="flex justify-between items-center text-center mb-2">
          <h2 className="text-lg">Now Online ({onlineUsers.length})</h2>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden  hover:bg-pastelblau  p-2 ml-2 mt-2 ">← Back</button>
        </div>
        <ul className="flex-grow overflow-y-auto space-y-2 border-t border-lite pt-4">
          {onlineUsers.filter(u => u.id !== currentUser.id).length === 0 && (
            <li className="text-center text-gray-400">No users online.</li>
          )}
          {onlineUsers.filter(u => u.id !== currentUser.id).map(u => (
            <li key={u.id} className="flex items-center gap-3 mb-2">
              <img
                src={getProfilePic(u.profilePic)}
                alt="User"
                onClick={() => setSelectedImage(getProfilePic(u.profilePic))}
                className="w-10 h-10 rounded-full object-cover cursor-pointer hover:scale-110 transition-transform"
              />

               {notification && (<div className='bg-life rounded-full w-2 h-2'></div> )}
              <Link to={`/chat/${u.username}`} className="flex-1 block text-lg bg-pastelblau rounded-md text-white text-center hover:bg-blau animate-glow">
                {u.username}
              </Link>
            </li>
          ))}
        </ul>
        <div className=' flex mt-4 border-t-2 p-2 items-center justify-center'>
          
          <button onClick={logout} className="w-1/2 p-4 bg-red-400 text-white font-bold py-2 rounded-full hover:bg-red-600">
            Out
          </button>
        </div>
      </aside>

      <SimolifeModal open={showSimolifeModal} onAccept={handleSimolifeAccept} onDecline={handleSimolifeDecline} />
      {simolifeActive && (
        <SimolifeVideo socket={socket} currentUser={currentUser} peer={simolifePeer} onNext={handleSimolifeNext} onLeave={handleSimolifeLeave} />
      )}

      <main className="flex flex-1 flex-col bg-gradient-to-r from-gray-50 to-slate-300">
        <div className="md:hidden h-20 flex items-center p-2 bg-litest  relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center">
            <button onClick={() => setSidebarOpen(true)} className="mr-2 text-2xl text-pastelblau">☰</button>
          </div>
          <div className="flex-1 flex justify-center items-center">
            <img src={logo} alt="XChat Logo" width={100} height={100} />
          </div>
        </div>

        <div className="flex-1 font-mono  overflow-y-auto p-2 bg-gradient-to-r from-litest to-white">
          {messages.map(msg => (
            <div key={msg._id} className={`flex w-full mb-2 ${msg.author?._id === currentUser.id ? 'justify-end' : 'justify-start'}`}>
              {msg.author?._id !== currentUser.id && (
                <img src={getProfilePic(msg.author?.profilePic)} alt="Avatar" className="w-9 h-9 rounded-full border-2 border-lite object-cover mr-2 self-end" />
              )}
              <div className={`p-3 rounded-lg break-words ${msg.author?._id === currentUser.id ? 'bg-lite text-black text-right rounded-br-none' : 'bg-white text-black text-left rounded-bl-none'} max-w-[70%] w-fit`}>
                <p className="font-bold flex items-center gap-2">
                  {msg.author?.username || 'Unknown'}
                  {msg.author?._id === currentUser.id && (
                    <img src={getProfilePic(currentUser?.profilePic)} alt="Me" className="w-7 h-7 rounded-full border border-lite object-cover ml-1 inline" />
                  )}
                </p>
                {msg.messageType === 'audio' ? <AudioPlayer src={msg.audioUrl} /> : <p>{msg.text}</p>}
                <div className="flex items-center justify-between">
                  <p className="mt-1 text-xs opacity-70">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {msg.author?._id === currentUser.id && (
                    <button className="ml-2 text-red-500 hover:text-red-700 text-xs" onClick={() => handleDeleteMessage(msg._id)} title="Delete">🗑️</button>
                  )}
                </div>
              </div>
              {msg.author?._id === currentUser.id && (
                <img src={getProfilePic(currentUser?.profilePic)} alt="Me" className="w-9 h-9 rounded-full border-2 border-lite object-cover ml-2 self-end" />
              )}
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <form onSubmit={sendText} className="flex items-center text-gray gap-2 p-4 bg-litest ">
          <input type="text" value={currentMessage} onChange={e => setCurrentMessage(e.target.value)} placeholder="Type a message…" className="flex-1 p-2 bg-white   rounded focus:outline-none" />
          <button type="submit" className="px-4 py-2 bg-gray text-white rounded hover:bg-blau">Send</button>
          <Recorder onSendAudio={sendAudio} />
        </form>
      </main>
    </div>
  );
}
