import React, { useEffect, useRef } from "react";

export default function SimolifeVideo({ socket, currentUser, peer, onNext, onLeave }) {
  const myVideoRef = useRef(null);
  const peerVideoRef = useRef(null);
  const myStream = useRef(null);
  const pcRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        myStream.current = stream;
        if (myVideoRef.current && stream) {
          myVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera error:", err);
      }
    })();

    return () => {
      myStream.current?.getTracks().forEach(t => t.stop());
      if (myVideoRef.current) myVideoRef.current.srcObject = null;
    };
  }, []);

  useEffect(() => {
    if (!peer || !peer.id || !myStream.current) return;

    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pcRef.current = pc;

    myStream.current.getTracks().forEach(track => pc.addTrack(track, myStream.current));

    pc.ontrack = e => {
      console.log("📹 Received remote track:", e.streams);
      if (peerVideoRef.current && e.streams[0]) {
        peerVideoRef.current.srcObject = e.streams[0];
      }
    };

    pc.onicecandidate = e => {
      if (e.candidate) {
        console.log("📡 Sending ICE candidate:", e.candidate);
        socket.emit("simolife-ice", { to: { id: peer.id }, candidate: e.candidate });
      }
    };

    const handleOffer = async ({ from, offer }) => {
      if (from.id !== peer.id) return;
      console.log("📥 Received offer from", from.id);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("simolife-answer", { to: { id: from.id }, answer });
      console.log("📤 Sent answer to", from.id);
    };

    const handleAnswer = async ({ from, answer }) => {
      if (from.id !== peer.id) return;
      console.log("📥 Received answer from", from.id);
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const handleIce = async ({ from, candidate }) => {
      if (from.id !== peer.id || !candidate) return;
      try {
        console.log("📥 Received ICE from", from.id);
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("ICE Error:", err);
      }
    };

    socket.on("simolife-offer", handleOffer);
    socket.on("simolife-answer", handleAnswer);
    socket.on("simolife-ice", handleIce);

    const isInitiator = currentUser.id < peer.id;
    if (isInitiator) {
      (async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("simolife-offer", { to: { id: peer.id }, offer });
        console.log("📤 Sending offer to", peer.id);
      })();
    }

    return () => {
      socket.off("simolife-offer", handleOffer);
      socket.off("simolife-answer", handleAnswer);
      socket.off("simolife-ice", handleIce);
      pc.close();
      pcRef.current = null;
      if (peerVideoRef.current) peerVideoRef.current.srcObject = null;
    };
  }, [peer, currentUser.id, socket]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center z-50">
      <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl">
        <div className="flex flex-col items-center w-full">
          <video ref={myVideoRef} autoPlay muted playsInline className="w-full h-64 rounded-xl border-2 border-blue-600 bg-black" />
          <span className="text-white mt-1 font-semibold">You</span>
        </div>
        <div className="flex flex-col items-center w-full">
          <video ref={peerVideoRef} autoPlay playsInline className="w-full h-64 rounded-xl border-2 border-green-600 bg-black" />
          <span className="text-white mt-1 font-semibold">Stranger</span>
        </div>
      </div>
      <div className="mt-6 flex gap-4">
        <button onClick={onNext} className="px-6 py-2 rounded-xl bg-life text-white font-bold">Next</button>
        <button onClick={onLeave} className="px-6 py-2 rounded-xl bg-red-400 text-white font-bold">Leave</button>
      </div>
    </div>
  );
}
