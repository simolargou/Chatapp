

import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import Recorder from '../components/Recorder';
import AudioPlayer from '../components/AudioPlayer';

export default function PrivateChatPage() {
  const { username: toUsername } = useParams();
  const navigate = useNavigate();
  const [currentUser] = useState(() => JSON.parse(localStorage.getItem('user')));
  const [conversation, setConversation] = useState(null);
  const [currentMessage, setCurrentMessage] = useState('');
  const messagesEndRef = useRef(null);


  useEffect(() => {
    if (!currentUser?.id) return;

 
    socket.connect(currentUser);
    socket.emit('startPrivateChat', {
      fromUserId: currentUser.id,
      toUsername
    });

  
    const handleStarted = (convo) => {
      setConversation(convo);
    };
    const handleError = ({ error }) => {
      alert(error);
      navigate('/chat', { replace: true });
    };

    socket.on('privateChatStarted', handleStarted);
    socket.on('privateChatError',   handleError);

    return () => {
      socket.off('privateChatStarted', handleStarted);
      socket.off('privateChatError',   handleError);
    };
  }, [toUsername, currentUser, navigate]);


  useEffect(() => {
    const handlePm = ({ conversationId, message }) => {
      setConversation(prev => {
        if (!prev || prev._id !== conversationId) return prev;
        return {
          ...prev,
          messages: [...prev.messages, message]
        };
      });
    };
    socket.on('receivePrivateMessage', handlePm);
    return () => {
      socket.off('receivePrivateMessage', handlePm);
    };
  }, []);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);


  const sendMessage = ({ messageType, text, audioUrl }) => {
    if (!conversation) return;
    socket.emit('sendPrivateMessage', {
      conversationId: conversation._id,
      author:         currentUser.username,
      messageType,
      text,
      audioUrl
    });

    setConversation(prev => ({
      ...prev,
      messages: [
        ...prev.messages,
        { author: currentUser.username, messageType, text, audioUrl, timestamp: new Date().toISOString() }
      ]
    }));
  };

  const handleSendText = e => {
    e.preventDefault();
    if (!currentMessage.trim()) return;
    sendMessage({ messageType: 'text', text: currentMessage.trim(), audioUrl: null });
    setCurrentMessage('');
  };
  const handleSendAudio = audioUrl => sendMessage({ messageType: 'audio', text: null, audioUrl });


  if (!conversation) {
   return (
  <div className="flex items-center justify-center h-screen bg-gray-100">
    <div className="flex flex-col items-center space-y-4 p-6 bg-white rounded-2xl shadow-md animate-pulse">
      <div className="w-12 h-12 border-4 border-lime-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-lime-600 font-semibold text-lg">{toUsername} Loading...</p>
    </div>
  </div>
);

  }

  return (
    <div className="flex flex-col h-screen text-black bg-black ">
      <header className="p-4 bg-white flex items-center border-b-2 border-darkgreen">
        <Link to="/chat" className="p-2 mr-4 rounded-full hover:bg-red-500 cursor-pointer">←</Link>
        <h1 className="text-xl font-bold">Chat with {toUsername}</h1>
      </header>

      <div className="flex-grow p-4 overflow-y-auto">
        {conversation.messages.map((msg, idx) => (
          <div
            key={idx}
            className={`mb-2 p-2 rounded-lg max-w-lg border-b-2
              ${msg.author === currentUser.username
                ? ' text-life  ml-auto'
                : ' text-litegreen'}`}
          >
            <p className="font-bold">{msg.author}</p>
            {msg.messageType === 'audio'
              ? <AudioPlayer src={msg.audioUrl} />
              : <p className="break-words">{msg.text}</p>
            }
            <p className="text-xs text-right opacity-70 mt-1">
              {new Date(msg.timestamp).toLocaleTimeString([], {
                hour: '2-digit', minute: '2-digit'
              })}
            </p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSendText}
        className="p-4 bg-white flex items-center gap-2 border-t-2 border-darkgreen"
      >
        <input
          type="text"
          value={currentMessage}
          onChange={e => setCurrentMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-grow p-2 bg-black border text-white border-gray rounded focus:outline-none"
        />
        <button
          type="submit"
          className="bg-black text-white font-bold p-2 rounded-md hover:bg-lime"
        >
          Send
        </button>
        <Recorder onSendAudio={handleSendAudio} />
      </form>
    </div>
  );
}
