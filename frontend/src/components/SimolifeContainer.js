import React, { useEffect, useState } from "react";
import SimolifeVideo from "./SimolifeVideo";
import { socket } from "../socket";

export default function SimolifeContainer({ currentUser, onClose }) {
  const [peer, setPeer] = useState(null);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    socket.connect(currentUser);

    socket.on("simolife-matched", ({ peer }) => {
      console.log("🎯 simolife-matched empfangen:", peer);
      setPeer(peer);
      setShowVideo(true);
    });

    socket.on("simolife-peer-left", () => {
      console.log("👋 Peer hat verlassen");
      setPeer(null);
    });

    socket.emit("simolife-join", currentUser);
    console.log("📡 simolife-join gesendet:", currentUser);

    return () => {
      socket.emit("simolife-leave");
      socket.off("simolife-matched");
      socket.off("simolife-peer-left");
    };
  }, [currentUser]);

  const handleNext = () => {
    setPeer(null);
    socket.emit("simolife-next", currentUser);
  };

  const handleLeave = () => {
    setPeer(null);
    socket.emit("simolife-leave");
    setShowVideo(false);
    onClose();
  };

  return (
    <>
      {showVideo && peer && (
        <SimolifeVideo
          socket={socket.socket}
          currentUser={currentUser}
          peer={peer}
          onNext={handleNext}
          onLeave={handleLeave}
        />
      )}
    </>
  );
}
