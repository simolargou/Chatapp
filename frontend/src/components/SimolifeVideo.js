import React, { useEffect, useRef } from "react";

export default function SimolifeVideo({ socket, currentUser, peer, onNext, onLeave }) {
  const myVideoRef = useRef(null);
  const peerVideoRef = useRef(null);
  const myStream = useRef(null);
  const peerConnection = useRef(null);

  useEffect(() => {
    if (!peer || !peer.socketId) return;

    let isActive = true;

    async function initConnection() {
      try {
        // Hole lokale Kamera/Mikrofon
        myStream.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = myStream.current;
        }

        if (!isActive) return;

        // Erstelle neue Peer-Verbindung
        peerConnection.current = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        // Lokale Tracks hinzufügen
        myStream.current.getTracks().forEach(track => {
          peerConnection.current.addTrack(track, myStream.current);
        });

        // Wenn Remote-Stream kommt, anzeigen
        peerConnection.current.ontrack = event => {
          if (peerVideoRef.current) {
            peerVideoRef.current.srcObject = event.streams[0];
          }
        };

        // ICE-Kandidaten senden
        peerConnection.current.onicecandidate = event => {
          if (event.candidate) {
            socket.emit("simolife-ice", { to: peer.socketId, candidate: event.candidate });
          }
        };

        // Signaling-Handler
        const handleOffer = async ({ from, offer }) => {
          if (from !== peer.socketId) return;
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await peerConnection.current.createAnswer();
          await peerConnection.current.setLocalDescription(answer);
          socket.emit("simolife-answer", { to: from, answer });
        };

        const handleAnswer = async ({ from, answer }) => {
          if (from !== peer.socketId) return;
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
        };

        const handleIce = async ({ from, candidate }) => {
          if (from !== peer.socketId || !candidate) return;
          try {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn("ICE Error:", err);
          }
        };

        // Events registrieren
        socket.on("simolife-offer", handleOffer);
        socket.on("simolife-answer", handleAnswer);
        socket.on("simolife-ice", handleIce);

        // Wer macht das Offer? (der mit kleinerer ID)
        if (socket.id < peer.socketId) {
          const offer = await peerConnection.current.createOffer();
          await peerConnection.current.setLocalDescription(offer);
          socket.emit("simolife-offer", { to: peer.socketId, offer });
        }

        // Aufräumen bei Disconnect
        return () => {
          socket.off("simolife-offer", handleOffer);
          socket.off("simolife-answer", handleAnswer);
          socket.off("simolife-ice", handleIce);
        };
      } catch (err) {
        alert("⚠️ Kamera/Mikrofon konnte nicht verwendet werden: " + err.message);
      }
    }

    initConnection();

    return () => {
      isActive = false;
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
      if (myStream.current) {
        myStream.current.getTracks().forEach(t => t.stop());
        myStream.current = null;
      }
    };
  }, [peer, socket]);

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex flex-col items-center justify-center">
      <div className="flex flex-col gap-6 items-center mb-6 w-full max-w-xl">
        {/* Eigene Kamera */}
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

        {/* Peer Kamera */}
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
