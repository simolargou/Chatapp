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

 
  const [callState, setCallState] = useState("idle"); 
  const [incomingCaller, setIncomingCaller] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
 
  useEffect(() => {
    if (!currentUser?.id) return;

    socket.connect(currentUser);
     socket.onceConnected(() => {
        socket.emit('startPrivateChat', {
          fromUserId: currentUser.id,
          toUsername
        });
     });

    const handleStarted = (convo) => {
      setConversation(convo);
    };
    const handleError = ({ error }) => {
      alert(error);
      navigate('/chat', { replace: true });
    };

    socket.on('privateChatStarted', handleStarted);
    socket.on('privateChatError', handleError);

  
    socket.on('audio-call-offer', async ({ from, offer }) => {
      setIncomingCaller(from);
      setCallState("ringing");
      window.offerData = offer; 
    });

   
    socket.on('audio-call-answer', async ({ answer }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(answer);
        setCallState("in-call");
      }
    });

 
    socket.on('audio-call-ice', async ({ candidate }) => {
      if (peerConnectionRef.current && candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(candidate);
        } catch (err) {
 
        }
      }
    });

 
    socket.on('audio-call-ended', () => {
      cleanupCall();
    });

    return () => {
      socket.off('privateChatStarted', handleStarted);
      socket.off('privateChatError', handleError);
      socket.off('audio-call-offer');
      socket.off('audio-call-answer');
      socket.off('audio-call-ice');
      socket.off('audio-call-ended');
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

  
  const startCall = async () => {
    setCallState("calling");
   
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;

 
    const pc = createPeerConnection();
    peerConnectionRef.current = pc;

    
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

   
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

 
    socket.emit('audio-call-offer', {
      to: toUsername,
      offer,
      from: currentUser.username
    });
  };

  
  const acceptCall = async () => {
    setCallState("in-call");
 
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;

    
    const pc = createPeerConnection();
    peerConnectionRef.current = pc;

    
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    
    await pc.setRemoteDescription(window.offerData);

    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

   
    socket.emit('audio-call-answer', {
      to: incomingCaller,
      answer,
      from: currentUser.username
    });
    setIncomingCaller(null);
  };

  
  const declineCall = () => {
    setCallState("idle");
    setIncomingCaller(null);
    window.offerData = null;
    socket.emit('audio-call-ended', { to: incomingCaller, from: currentUser.username });
  };

  
  const endCall = () => {
    cleanupCall();
    
    socket.emit('audio-call-ended', { to: toUsername, from: currentUser.username });
  };

  
  function createPeerConnection() {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });
    pc.onicecandidate = event => {
      if (event.candidate) {
        socket.emit('audio-call-ice', {
          to: callState === 'calling' ? toUsername : incomingCaller,
          candidate: event.candidate,
          from: currentUser.username
        });
      }
    };
    pc.ontrack = event => {
      setRemoteStream(event.streams[0]);
    };
    return pc;
  }

  
  function cleanupCall() {
    setCallState("idle");
    setRemoteStream(null);
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setIncomingCaller(null);
    window.offerData = null;
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="flex flex-col items-center space-y-4 p-6 bg-white rounded-2xl shadow-md animate-pulse">
          <div className="w-12 h-12 border-4 border-litest-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-litest-600 font-semibold text-lg">{toUsername} Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen text-black bg-black">
      <header className="p-4 bg-white flex items-center border-b-2 border-darkest">
        <Link to="/chat" className="p-2 mr-4 rounded-full hover:bg-black cursor-pointer">←</Link>
        <h1 className="text-xl font-bold">Chat with {toUsername}</h1>
        {callState === "idle" && (
          <button
            className="ml-auto px-3 py-1  text-white rounded "
            onClick={startCall}
          >
            📞 
          </button>
        )}
        {callState === "calling" && (
          <span className="ml-auto text-blue-red-800">Calling...</span>
        )}
        {callState === "in-call" && (
          <button
            className="ml-auto px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={endCall}
          >
            🔴 End Call
          </button>
        )}
      </header>

      {/* Incoming Call UI */}
      {callState === "ringing" && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg flex flex-col items-center animate-bounce">
            <p className="mb-4 text-lg font-bold">Incoming call from {incomingCaller}</p>
            <button className="mb-2 px-4 py-2 bg-life text-white rounded" onClick={acceptCall}>Accept</button>
            <button className="px-4 py-2 bg-red-500 text-white rounded" onClick={declineCall}>Decline</button>
          </div>
        </div>
      )}

      {/* In-call audio element */}
      {callState === "in-call" && remoteStream && (
        <audio
          autoPlay
          ref={audio => {
            if (audio && remoteStream) audio.srcObject = remoteStream;
          }}
        />
      )}

      <div className="flex-grow p-4 overflow-y-auto">
        {conversation.messages.map((msg, idx) => (
          <div
            key={idx}
            className={`mb-2 p-2 rounded-lg max-w-lg border-b-2
              ${msg.author === currentUser.username
                ? ' text-life  ml-auto'
                : ' text-lite'}`}
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
        className="p-4 bg-white flex items-center gap-2 border-t-2 border-darkest"
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
          className="bg-black text-white font-bold p-2 rounded-md hover:bg-litest"
        >
          Send
        </button>
        <Recorder onSendAudio={handleSendAudio} />
      </form>
    </div>
  );
}
