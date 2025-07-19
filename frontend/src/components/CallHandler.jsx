import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import { useNavigate } from 'react-router-dom';
import defaultAvatar from '../assets/avatar.png'; // ✅ fallback

export default function CallHandler({ currentUser }) {
  const [incomingCall, setIncomingCall] = useState(null);
  const ringtoneRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) return;

    socket.on('audio-call-offer', ({ from, offer }) => {
      setIncomingCall({ from, offer });
      window.offerData = offer;
    });

    return () => {
      socket.off('audio-call-offer');
    };
  }, [currentUser]);

  useEffect(() => {
    if (incomingCall) {
      ringtoneRef.current?.play().catch(err => console.warn("🔇 Autoplay blockiert:", err));
    } else {
      ringtoneRef.current?.pause();
      ringtoneRef.current.currentTime = 0;
    }
  }, [incomingCall]);

  const acceptCall = () => {
    navigate(`/chat/${incomingCall.from.username}`);
  };

  const declineCall = () => {
    socket.emit('audio-call-ended', { to: incomingCall.from.username, from: currentUser.username });
    setIncomingCall(null);
  };

  const getProfilePic = (pic) => pic || defaultAvatar;

  return (
    <>
      <audio ref={ringtoneRef} src="/ringtone.mp3" loop preload="auto" />
      {incomingCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-white p-8 rounded-lg shadow-lg flex flex-col items-center animate-bounce">
            <img
              src={getProfilePic(incomingCall.from.profilePic)}
              alt="Caller"
              className="w-20 h-20 rounded-full border-4 border-green-400 mb-4 object-cover shadow-md"
            />
            <p className="mb-4 text-lg font-bold">
              📞 Incoming call from {incomingCall.from.username}
            </p>
            <button className="mb-2 px-4 py-2 bg-green-600 text-white rounded" onClick={acceptCall}>
              Accept
            </button>
            <button className="px-4 py-2 bg-red-500 text-white rounded" onClick={declineCall}>
              Decline
            </button>
          </div>
        </div>
      )}
    </>
  );
}
