import React from 'react';
const API_URL = process.env.REACT_APP_API_URL;

const AudioPlayer = ({ src }) => {
    if (!src) return null;
    const fullSrc = src.startsWith('http') ? src : `${API_URL}${src}`;
    return (<audio controls src={fullSrc} className="w-full h-12 mt-2">Your browser does not support audio.</audio>);
};
export default AudioPlayer;