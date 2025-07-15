import React, { useEffect, useRef } from "react";

/**
 * SimolifeVideo component: vertical split (your video on top, peer below)
 * Props:
 *   - socket: the socket.io instance
 *   - currentUser: current user object
 *   - peer: peer user object (with .socketId)
 *   - onNext: callback for "Next" button
 *   - onLeave: callback for "Leave" button
 */
export default function SimolifeVideo({ socket, currentUser, peer, onNext, onLeave }) {
  const myVideoRef = useRef(null);
  const peerVideoRef = useRef(null);
  const myStream = useRef();
  const peerConnection = useRef();

  // Handle own webcam/mic access
  useEffect(() => {
    async function getMedia() {
      try {
        myStream.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = myStream.current;
        }

        // Setup WebRTC only if peer is present
        if (peer && peer.socketId) {
          startWebRTC(peer.socketId);
        }
      } catch (err) {
        alert("Failed to access camera/mic: " + err.message);
      }
    }
    getMedia();

    return () => {
      // Stop webcam on unmount
      if (myStream.current) {
        myStream.current.getTracks().forEach(t => t.stop());
      }
      if (peerConnection.current) {
        peerConnection.current.close();
      }
    };
    // eslint-disable-next-line
  }, [peer]);

  // --- Simple WebRTC logic for peer connection (SFU style) ---
  function startWebRTC(peerSocketId) {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    // Use STUN only (Google's default)
    peerConnection.current = new window.RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // Add local stream tracks to connection
    myStream.current?.getTracks().forEach(track => {
      peerConnection.current.addTrack(track, myStream.current);
    });

    // When remote stream arrives, show in peerVideoRef
    peerConnection.current.ontrack = event => {
      if (peerVideoRef.current) {
        peerVideoRef.current.srcObject = event.streams[0];
      }
    };

    // ICE candidates
    peerConnection.current.onicecandidate = event => {
      if (event.candidate && peerSocketId) {
        socket.emit("simolife-ice", { to: peerSocketId, candidate: event.candidate });
      }
    };

    // Offer/Answer logic
    if (currentUser.id < peer.id) {
      // Initiator: create offer
      peerConnection.current.createOffer()
        .then(offer => {
          peerConnection.current.setLocalDescription(offer);
          socket.emit("simolife-offer", { to: peerSocketId, offer });
        });
    }

    // Listen for signaling messages
    socket.on("simolife-offer", ({ from, offer }) => {
      if (from === peerSocketId) {
        peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
        peerConnection.current.createAnswer()
          .then(answer => {
            peerConnection.current.setLocalDescription(answer);
            socket.emit("simolife-answer", { to: peerSocketId, answer });
          });
      }
    });

    socket.on("simolife-answer", ({ from, answer }) => {
      if (from === peerSocketId) {
        peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on("simolife-ice", ({ from, candidate }) => {
      if (from === peerSocketId && candidate) {
        peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex flex-col items-center justify-center">
      {/* Stacked (vertical) videos */}
      <div className="flex flex-col gap-8 items-center mb-6 w-full max-w-xl">
        {/* Own video */}
        <div className="flex flex-col items-center w-full">
          <video
            ref={myVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-64 bg-gray-800 rounded-xl border-2 border-blue-600 shadow-lg"
          />
          <span className="text-white mt-1 font-bold text-lg">You</span>
        </div>
        {/* Peer video */}
        <div className="flex flex-col items-center w-full">
          <video
            ref={peerVideoRef}
            autoPlay
            playsInline
            className="w-full h-64 bg-gray-900 rounded-xl border-2 border-green-600 shadow-lg"
          />
          <span className="text-white mt-1 font-bold text-lg">Stranger</span>
        </div>
      </div>
      <div className="flex gap-4 mt-3">
        <button
          onClick={onNext}
          className="px-8 py-3 bg-blue-500 text-white text-lg rounded-xl font-bold shadow hover:bg-blue-600"
        >
          Next
        </button>
        <button
          onClick={onLeave}
          className="px-8 py-3 bg-red-500 text-white text-lg rounded-xl font-bold shadow hover:bg-red-600"
        >
          Leave
        </button>
      </div>
    </div>
  );
}
