import React, { useEffect, useRef, useState } from "react";

export default function SimolifeVideo({ socket, currentUser, peer, onNext, onLeave }) {
  const myVideoRef = useRef(null);
  const peerVideoRef = useRef(null);
  const myStream = useRef(null);
  const peerConnection = useRef(null);
  const [status, setStatus] = useState("🔍 Suche nach Partner...");

  // Kamera starten
 useEffect(() => {
  (async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      myStream.current = stream;
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = stream;
      }
      console.log("✅ Kamera/Mikrofon Zugriff erfolgreich");

      // 👉️ HIER emit hinzufügen!
      if (currentUser && socket) {
        socket.emit("simolife-join", currentUser);
        console.log("📡 simolife-join gesendet:", currentUser);
      }

    } catch (err) {
      console.error("❌ Kamera/Mikrofon Fehler:", err);
      alert("⚠️ Zugriff auf Kamera/Mikrofon nicht möglich: " + err.message);
    }
  })();

  return () => {
    if (myStream.current) {
      myStream.current.getTracks().forEach(t => t.stop());
      myStream.current = null;
    }
    if (myVideoRef.current) myVideoRef.current.srcObject = null;
  };
}, []);

  // userOnline + simolife-join senden
  useEffect(() => {
    if (!socket || !currentUser) return;
    socket.emit("userOnline", currentUser);

    const joinTimeout = setTimeout(() => {
      socket.emit("simolife-join", currentUser);
      setStatus("🔍 Suche nach Partner...");
    }, 500);

    return () => clearTimeout(joinTimeout);
  }, [socket, currentUser]);

  // Wenn Peer vorhanden ist → verbinden
  useEffect(() => {
    if (!peer || !peer.socketId || !myStream.current) return;

    setStatus("✅ Verbunden mit " + peer.username);

    peerConnection.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    myStream.current.getTracks().forEach(track => {
      peerConnection.current.addTrack(track, myStream.current);
    });

    peerConnection.current.ontrack = event => {
      if (peerVideoRef.current) {
        peerVideoRef.current.srcObject = event.streams[0];
      }
    };

    peerConnection.current.onicecandidate = event => {
      if (event.candidate) {
        socket.emit("simolife-ice", { to: peer, candidate: event.candidate });
      }
    };

    const handleOffer = async ({ from, offer }) => {
      if (from.id !== peer.id) return;
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      socket.emit("simolife-answer", { to: from, answer });
    };

    const handleAnswer = async ({ from, answer }) => {
      if (from.id !== peer.id) return;
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const handleIce = async ({ from, candidate }) => {
      if (from.id !== peer.id || !candidate) return;
      try {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("⚠️ ICE Fehler:", err);
      }
    };

    const handlePeerLeft = () => {
      setStatus("❌ Dein Partner hat die Verbindung verlassen");
      if (peerVideoRef.current) peerVideoRef.current.srcObject = null;
    };

    socket.on("simolife-offer", handleOffer);
    socket.on("simolife-answer", handleAnswer);
    socket.on("simolife-ice", handleIce);
    socket.on("simolife-peer-left", handlePeerLeft);

    if (socket.id < peer.socketId) {
      (async () => {
        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);
        socket.emit("simolife-offer", { to: peer, offer });
      })();
    }

    return () => {
      socket.off("simolife-offer", handleOffer);
      socket.off("simolife-answer", handleAnswer);
      socket.off("simolife-ice", handleIce);
      socket.off("simolife-peer-left", handlePeerLeft);
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
    };
  }, [peer, socket]);

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex flex-col items-center justify-center">
      {/* Statusanzeige */}
      <div className="mb-4 text-white text-lg font-semibold">{status}</div>

      <div className="flex flex-col gap-6 items-center mb-6 w-full max-w-xl">
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
          onClick={() => {
            setStatus("🔄 Suche neuen Partner...");
            onNext();
          }}
          className="px-8 py-3 bg-blue-500 text-white text-lg rounded-xl font-bold shadow hover:bg-blue-600"
        >
          Next
        </button>
        <button
          onClick={() => {
            setStatus("👋 Verbindung beendet");
            onLeave();
          }}
          className="px-8 py-3 bg-red-500 text-white text-lg rounded-xl font-bold shadow hover:bg-red-600"
        >
          Leave
        </button>
      </div>
    </div>
  );
}
