import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { socket } from './socket';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';
import PrivateChatPage from './pages/PrivateChatPage';


function App() {
  
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

 
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

 
  useEffect(() => {
    if (!token || !user) return;

    socket.connect(user);
    socket.on('getOnlineUsers', setOnlineUsers);

    return () => {
      socket.off('getOnlineUsers', setOnlineUsers);
      socket.disconnect();
    };
  }, [token, user]);

  return (
    <div className="bg-darkgreen min-h-screen">
      
      <Routes>
        <Route path="/auth" element={!token ? <AuthPage /> : <Navigate to="/chat" />} />
        <Route path="/chat" element={token ? <ChatPage onlineUsers={onlineUsers} /> : <Navigate to="/auth" />} />
        <Route path="/chat/:username" element={token ? <PrivateChatPage /> : <Navigate to="/auth" />} />
        <Route path="*" element={<Navigate to={token ? "/chat" : "/auth"} />} />
      </Routes>
    </div>
  );
}

export default App;
