import React from "react";

export default function SimolifeModal({ open, onAccept, onDecline }) {
  if (!open) return null;
  return (
    <div className="fixed z-50 inset-0 bg-black/70 flex items-center justify-center">
      <div className="bg-white p-4 rounded-lg border-2 border-litest flex flex-col items-center shadow-xl max-w-sm w-full">
        <h2 className="text-2xl font-bold text-black mb-2">X Video Chat</h2>
        <p className="text-lg text-black mb-6 text-center">
          you ll be connected with a random user:
        </p>
        <div className="flex gap-4">
          <button
            className="bg-blau text-white px-5 py-2 rounded font-bold text-lg hover:bg-darke"
            onClick={onAccept}
          >
            Yes
          </button>
          <button
            className="bg-red-400 text-white px-5 py-2 rounded font-bold text-lg hover:bg-red-600"
            onClick={onDecline}
          >
            No
          </button>
        </div>
      </div>
    </div>
  );
}
