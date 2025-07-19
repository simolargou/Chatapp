import React, { useEffect, useRef, useState } from 'react';
import { socket } from '../socket';

export default function CallHandler({ currentUser }) {
  const [incomingCall, setIncomingCall] = useState(null);
  const ringtoneRef = useRef();

  useEffect(() => {
    if (!currentUser) return;

    const handleIncomingCall = ({ from, offer }) => {
      if (from && offer) {
        setIncomingCall({ from, offer });
      }
    };

    socket.on('audio-call-offer', ({ from, offer }) => {
        if (from && offer) {
            setIncomingCall({ from, offer });
        }
        });
    return () => {
      socket.off('audio-call-offer', handleIncomingCall);
    };
  }, [currentUser]);

  useEffect(() => {
    if (!incomingCall || !ringtoneRef.current) return;

    const play = () => {
      const result = ringtoneRef.current.play();
      if (result instanceof Promise) {
        result.catch(err => console.warn("🔇 Autoplay blocked:", err));
      }
    };

    play();

    return () => {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    };
  }, [incomingCall]);

  const acceptCall = () => {
    window.location.href = `/chat/${incomingCall.from.username}`;
  };

  const declineCall = () => {
    socket.emit('audio-call-ended', {
      to: incomingCall.from.username,
      from: currentUser.username
    });
    setIncomingCall(null);
  };

  return (
    <>
      <audio ref={ringtoneRef} src="/ringtone.mp3" loop preload="auto" />
      {incomingCall && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg flex flex-col items-center animate-bounce">
            <img src={incomingCall.from.profilePic || '/default-avatar.png'} className="w-16 h-16 rounded-full mb-4" />
            <p className="mb-4 text-lg font-bold">
              📞 Incoming call from {incomingCall.from.username}
            </p>
            <button className="mb-2 px-4 py-2 bg-green-600 text-white rounded" onClick={acceptCall}>Accept</button>
            <button className="px-4 py-2 bg-red-500 text-white rounded" onClick={declineCall}>Decline</button>
          </div>
        </div>
      )}
    </>
  );
}
