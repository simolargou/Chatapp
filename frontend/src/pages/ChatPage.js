import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { socket } from '../socket';
import Recorder from '../components/Recorder';
import AudioPlayer from '../components/AudioPlayer';
import logo from '../assets/logo.png';
import defaultAvatar from '../assets/avatar.png';
import SimolifeModal from "../components/SimolifeModal";
import SimolifeVideo from "../components/SimolifeVideo";


export default function ChatPage() {
  const [messages, setMessages]             = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [onlineUsers, setOnlineUsers]       = useState([]);
  const [currentUser] = useState(() => JSON.parse(localStorage.getItem('user')));
  const endRef      = useRef(null);
  const audioRef = useRef(null);
  const [showSimolifeModal, setShowSimolifeModal] = useState(false);
  const [simolifeActive, setSimolifeActive] = useState(false);
  const [simolifePeer, setSimolifePeer] = useState(null);


  useEffect(() => {
    if (!currentUser?.id) return;

    socket.connect(currentUser);
    socket.emit('userOnline', currentUser);

    socket.emit('loadPublicHistory');
    socket.on('publicHistory', history => {
      setMessages(history);
    });

    socket.on('getOnlineUsers', users => {
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

    socket.on('messageDeleted', messageId => {
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
    });

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
      socket.on("simolife-matched", ({ peer }) => setSimolifePeer(peer));
      return () => socket.off("simolife-matched");
    }, []);

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
  const handleSimolifeAccept = () => {
      setShowSimolifeModal(false);
      setSimolifeActive(true);
      socket.emit("simolife-join", currentUser);
    };
    const handleSimolifeDecline = () => setShowSimolifeModal(false);
    const handleSimolifeNext = () => {
      socket.emit("simolife-next", currentUser);
      setSimolifePeer(null);
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

  // Helper for profile pics
  const getProfilePic = (profilePic) =>
    profilePic ? profilePic : defaultAvatar;

  return (
    <div className="flex h-screen bg-darkgreen text-lime ">
      <audio ref={audioRef} src="/sounds/notification.mp3" preload="auto" />

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-20 w-72 bg-black p-2 flex flex-col 
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:flex-shrink-0
      `}>
        {/* Own Profile Pic at top like Facebook */}
        <div className="flex flex-col items-center  pb-4 border-b border-litegreen">
          <img
            src={getProfilePic(currentUser?.profilePic)}
            alt="My Profile"
            className="w-20 h-20 rounded-md border-2 border-lime object-cover shadow "
          />
          <div className="text-center">
            <h2 className="text-xl font-bold">{currentUser?.username}</h2>
            <p className="text-xs text-lime">You</p>
          </div>
        </div>
        <div className="flex justify-between items-center text-center mb-2">
          <h2 className="text-lg ">Now Online ({onlineUsers.length})</h2>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden border-2 rounded-full p-2 ml-2 mt-2">✕</button>
        </div>
        {/* Online Users */}
        <ul className="flex-grow overflow-y-auto space-y-2 border-t border-litegreen pt-4">
          {onlineUsers.filter(u => u.id !== currentUser.id).length === 0 && (
            <li className="text-center text-gray-400 ">No users online.</li>
          )}
          {onlineUsers
            .filter(u => u.id !== currentUser.id)
            .map(u => (
              <li key={u.id} className="flex items-center gap-3 mb-2">
                <img
                  src={getProfilePic(u.profilePic)}
                  alt="User"
                  className="w-10 h-10 rounded-full border-2 border-litegreen object-cover"
                />
                <Link
                  to={`/chat/${u.username}`}
                  className="flex-1 block text-lg rounded-md text-white text-center hover:bg-life  animate-glow"
                >
                  {u.username}
                </Link>
              </li>
            ))
          }
        </ul>
        <div className='flex-row flex mt-4'>
          <h1 className='w-1/2 cursor-pointer '>Sign out</h1>
          <button onClick={logout}
                  className="w-1/2 p-2 bg-red-700 text-white font-bold py-2 rounded-full hover:bg-red-600">
            Out
          </button>
        </div>
      </aside>
      <SimolifeModal
          open={showSimolifeModal}
          onAccept={handleSimolifeAccept}
          onDecline={handleSimolifeDecline}
        />
        {simolifeActive && (
          <SimolifeVideo
            socket={socket}
            currentUser={currentUser}
            peer={simolifePeer}
            onNext={handleSimolifeNext}
            onLeave={handleSimolifeLeave}
          />
        )}

      {/* Chat Main */}
      <main className="flex flex-1 flex-col bg-lime ">
        <div className="md:hidden h-20 flex items-center p-2 bg-green border-b-2 border-darkgreen relative">
          {/* Sidebar-Button immer ganz links */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center">
            <button onClick={() => setSidebarOpen(true)} className="mr-2 text-2xl">☰</button>
          </div>
          {/* Das Logo exakt mittig */}
          <div className="flex-1 flex justify-center items-center">
            <img src={logo} alt="XChat Logo" width={100} height={100} />
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
              {/* User avatar */}
              {msg.author?._id !== currentUser.id && (
                <img
                  src={getProfilePic(msg.author?.profilePic)}
                  alt="Avatar"
                  className="w-9 h-9 rounded-full border-2 border-litegreen object-cover mr-2 self-end"
                />
              )}
              <div className={`p-3 rounded-lg break-words
                ${msg.author?._id === currentUser.id
                  ? 'bg-litegreen text-darkgreen text-right rounded-br-none'
                  : 'bg-green text-lime text-left rounded-bl-none'}
                max-w-[70%] w-fit
              `}>
                <p className="font-bold flex items-center gap-2">
                  {msg.author?.username || 'Unknown'}
                  {msg.author?._id === currentUser.id && (
                    <img
                      src={getProfilePic(currentUser?.profilePic)}
                      alt="Me"
                      className="w-7 h-7 rounded-full border border-litegreen object-cover ml-1 inline"
                    />
                  )}
                </p>
                {msg.messageType === 'audio'
                  ? <AudioPlayer src={msg.audioUrl} />
                  : <p>{msg.text}</p>}
                <div className="flex items-center justify-between">
                  <p className="mt-1 text-xs opacity-70">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                  {msg.author?._id === currentUser.id && (
                    <button
                      className="ml-2 text-red-500 hover:text-red-700 text-xs"
                      onClick={() => handleDeleteMessage(msg._id)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
              {/* Your avatar on own messages (optional, Facebook-style) */}
              {msg.author?._id === currentUser.id && (
                <img
                  src={getProfilePic(currentUser?.profilePic)}
                  alt="Me"
                  className="w-9 h-9 rounded-full border-2 border-litegreen object-cover ml-2 self-end"
                />
              )}
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
