import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL ;

const MicIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="white"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>);

const Recorder = ({ onSendAudio }) => {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const audioChunks = useRef([]);

    useEffect(() => {
        return () => { if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop()) };
    }, []);

    const uploadAudio = async (audioBlob) => {
        const formData = new FormData();
        formData.append('audio', audioBlob, `voice-memo-${Date.now()}.webm`);
        try {
            const response = await axios.post(`${API_URL}/api/upload/audio`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            if (response.data.audioUrl) onSendAudio(response.data.audioUrl);
        } catch (error) { alert('Failed to upload audio.'); }
    };

    const handleRecord = async () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = recorder;
            audioChunks.current = [];
            recorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunks.current.push(event.data) };
            recorder.onstop = () => {
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
                uploadAudio(audioBlob);
                stream.getTracks().forEach((track) => track.stop());
                setIsRecording(false);
            };
            recorder.start();
            setIsRecording(true);
        } catch (error) { alert("Could not access microphone. Please grant permission."); }
    };

    return (
        <button type="button" onClick={handleRecord}
            className={`p-2 rounded-full transition-colors ${isRecording ? 'bg-red-400 animate-pulse' : 'bg-gray'} text-lime`}>
            <MicIcon />
        </button>
    );
};
export default Recorder;