import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import { useNavigate } from 'react-router-dom';
import defaultAvatar from '../assets/avatar.png'; 

export default function CallHandler({ currentUser }) {
  const [incomingCall, setIncomingCall] = useState(null);
  const ringtoneRef = useRef();
  const navigate = useNavigate();

useEffect(() => {
  socket.on('audio-call-offer', ({ from, offer }) => {
    setIncomingCall({ from, offer });
  });

  return () => socket.off('audio-call-offer');
}, []);


 useEffect(() => {
  if (incomingCall) {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate([300, 100, 300, 100]);
    }
    ringtoneRef.current?.play().catch(err =>
      console.warn("🔇 Autoplay blockiert:", err)
    );
  } else {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(0);
    }
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-pastelblau bg-opacity-70">
          <div className="bg-white p-8 rounded-lg shadow-xl flex flex-col items-center ">
            <img
              src={getProfilePic(incomingCall.from.profilePic)}
              alt="Caller"
              className="w-40 h-40  border-4  mb-4 object-cover shadow-md"
            />
            <p className="mb-4 text-lg font-bold">
              📞 Incoming call from <strong>{incomingCall.from.username}</strong>
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
