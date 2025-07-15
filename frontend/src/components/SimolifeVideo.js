import React from "react";

export default function SimolifeVideo({
  socket,
  currentUser,
  peer,
  onNext,
  onLeave
}) {
  // WebRTC logic will be added later
  return (
    <div className="fixed z-40 inset-0 flex items-center justify-center bg-black/80">
      <div className="bg-darkgreen rounded-lg p-8 flex flex-col items-center w-[90vw] max-w-2xl border-4 border-lime shadow-2xl">
        <h2 className="text-lime text-2xl font-bold mb-4">Simolife Video Chat</h2>
        <div className="flex items-center gap-6 mb-4">
          <div className="flex flex-col items-center">
            <img src={currentUser.profilePic || "/default-avatar.png"} className="w-24 h-24 rounded-full border-2 border-litegreen mb-2" alt="Your profile" />
            <span className="text-lime font-bold">{currentUser.username} (You)</span>
          </div>
          <div className="flex flex-col items-center">
            <img src={peer?.profilePic || "/default-avatar.png"} className="w-24 h-24 rounded-full border-2 border-litegreen mb-2"  alt="Peer profile" />
            <span className="text-lime font-bold">{peer?.username || "Waiting..."}</span>
          </div>
        </div>
        <div className="flex gap-4 mt-2">
          <button onClick={onNext} className="bg-lime text-darkgreen px-6 py-2 rounded font-bold text-lg hover:bg-litegreen">
            Next
          </button>
          <button onClick={onLeave} className="bg-red-500 text-white px-6 py-2 rounded font-bold text-lg hover:bg-red-600">
            Leave
          </button>
        </div>
        <p className="mt-6 text-center text-white/60">Video and audio will appear here soon…</p>
      </div>
    </div>
  );
}
