import React, { useEffect, useRef } from "react";

export default function SimolifeVideo({ socket, currentUser, peer, onNext, onLeave }) {
  const myVideoRef = useRef(null);
  const peerVideoRef = useRef(null);
  const myStream = useRef(null);
  const peerConnection = useRef(null);

  useEffect(() => {
    if (!peer || !peer.socketId) return;

    let isActive = true;

    const initConnection = async () => {
      try {
        // Anfrage Kamera/Mikrofon
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        myStream.current = stream;
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
        }

        // Peer-Verbindung einrichten
        peerConnection.current = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        // Tracks zur Verbindung hinzufügen
        stream.getTracks().forEach(track => {
          peerConnection.current.addTrack(track, stream);
        });

        // Remote-Stream anzeigen
        peerConnection.current.ontrack = event => {
          const remoteStream = event.streams[0];
          if (peerVideoRef.current && remoteStream) {
            peerVideoRef.current.srcObject = remoteStream;
          }
        };

        // ICE-Kandidaten senden
        peerConnection.current.onicecandidate = event => {
          if (event.candidate) {
            socket.emit("simolife-ice", { to: peer.socketId, candidate: event.candidate });
          }
        };

        // Signaling: Event-Handler
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
            console.warn("⚠️ ICE-Kandidat konnte nicht hinzugefügt werden:", err);
          }
        };

        // Events abonnieren
        socket.on("simolife-offer", handleOffer);
        socket.on("simolife-answer", handleAnswer);
        socket.on("simolife-ice", handleIce);

        // Der mit kleinerer socketId startet die Verbindung
        if (socket.id < peer.socketId) {
          const offer = await peerConnection.current.createOffer();
          await peerConnection.current.setLocalDescription(offer);
          socket.emit("simolife-offer", { to: peer.socketId, offer });
        }

        // Cleanup-Handler speichern
        return () => {
          socket.off("simolife-offer", handleOffer);
          socket.off("simolife-answer", handleAnswer);
          socket.off("simolife-ice", handleIce);
        };
      } catch (err) {
        console.error("Kamera/Mikrofon Zugriff fehlgeschlagen:", err);
        alert("⚠️ Kamera/Mikrofon konnte nicht verwendet werden: " + err.message);
      }
    };

    initConnection();

    return () => {
      isActive = false;

      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }

      if (myStream.current) {
        myStream.current.getTracks().forEach(track => track.stop());
        myStream.current = null;
      }

      // Videos zurücksetzen
      if (myVideoRef.current) myVideoRef.current.srcObject = null;
      if (peerVideoRef.current) peerVideoRef.current.srcObject = null;
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
