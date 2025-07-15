import React, { useEffect, useRef } from "react";

export default function SimolifeVideo({ socket, currentUser, peer, onNext, onLeave }) {
  const myVideoRef = useRef(null);
  const peerVideoRef = useRef(null);
  const myStream = useRef(null);

  useEffect(() => {
    console.log("SimolifeVideo mounted!");
    // Request camera/mic
    async function getMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        myStream.current = stream;
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
          myVideoRef.current.play();
        }
        console.log("Camera/Mic access granted");
      } catch (err) {
        alert("Failed to access camera/mic: " + err.message);
        console.error("getUserMedia error:", err);
      }
    }
    getMedia();
    return () => {
      // Clean up: stop camera/mic when component unmounts
      if (myStream.current) {
        myStream.current.getTracks().forEach((track) => track.stop());
        myStream.current = null;
      }
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = null;
      }
      if (peerVideoRef.current) {
        peerVideoRef.current.srcObject = null;
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col items-center justify-center">
      <div className="flex flex-row gap-6">
        {/* Your video */}
        <div className="flex flex-col items-center">
          <video
            ref={myVideoRef}
            autoPlay
            muted
            playsInline
            className="w-72 h-56 bg-gray-700 rounded-lg mb-2 border-4 border-lime-400 shadow"
            style={{ background: "#111" }}
          />
          <span className="text-lime-300 font-bold">You</span>
        </div>
        {/* Peer video (empty until WebRTC signaling is implemented) */}
        <div className="flex flex-col items-center">
          <video
            ref={peerVideoRef}
            autoPlay
            playsInline
            className="w-72 h-56 bg-gray-900 rounded-lg mb-2 border-4 border-sky-400 shadow"
            style={{ background: "#111" }}
          />
          <span className="text-sky-300 font-bold">Stranger</span>
        </div>
      </div>
      <div className="flex gap-4 mt-6">
        <button onClick={onNext} className="px-6 py-2 bg-blue-500 text-white rounded-lg font-bold shadow hover:bg-blue-700">
          Next
        </button>
        <button onClick={onLeave} className="px-6 py-2 bg-red-500 text-white rounded-lg font-bold shadow hover:bg-red-700">
          Leave
        </button>
      </div>
    </div>
  );
}