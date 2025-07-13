import React, { useState } from 'react';
import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL ;

const Form = ({ isLogin, onToggle }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState({ text: '', isError: false });

    const handleSubmit = async (e) => {
        e.preventDefault();
        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        try {
            const res = await axios.post(`${API_URL}${endpoint}`, { username, password });
            if (isLogin) {
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('user', JSON.stringify(res.data.user));
                window.location.href = '/chat';
            } else {
                setMessage({ text: 'Registration successful! Please login.', isError: false });
            }
        } catch (error) { setMessage({ text: error.response?.data?.msg || 'An error occurred.', isError: true }); }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 font-tektur">
            <h2 className="text-2xl font-bold text-lime text-center">{isLogin ? 'Login' : 'Register'}</h2>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required className="p-2 rounded bg-green border border-litegreen text-lime placeholder-lime focus:outline-none" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required className="p-2 rounded bg-green border border-litegreen text-lime placeholder-lime focus:outline-none" />
            <button type="submit" className="bg-litegreen text-darkgreen font-bold p-2 rounded hover:bg-lime">{isLogin ? 'Login' : 'Register'}</button>
            {message.text && <p className={`text-center ${message.isError ? 'text-red-400' : 'text-lime'}`}>{message.text}</p>}
            <p className="text-lime text-center">{isLogin ? "No account?" : "Already have an account?"}{' '}<button type="button" onClick={onToggle} className="font-bold underline">{isLogin ? "Register here" : "Login here"}</button></p>
        </form>
    );
};

const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-600 via-gray-950 to-slate-900">
            <div className="w-full max-w-md p-8 space-y-8  rounded-lg shadow-lg border-2 border-green">
                <Form isLogin={isLogin} onToggle={() => setIsLogin(!isLogin)} />
            </div>
        </div>
    );
};
export default AuthPage;