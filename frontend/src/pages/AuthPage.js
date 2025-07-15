import React, { useState } from 'react';
import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL || '';

const Form = ({ isLogin, onToggle }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [profilePic, setProfilePic] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [message, setMessage] = useState({ text: '', isError: false });

    const handleProfilePicChange = (e) => {
        const file = e.target.files[0];
        setProfilePic(file);
        setPreviewUrl(file ? URL.createObjectURL(file) : null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

        try {
            let res;
            if (isLogin) {
                // Login: send as JSON
                res = await axios.post(`${API_URL}${endpoint}`, { username, password });
            } else {
                // Register: use FormData for file upload
                const formData = new FormData();
                formData.append('username', username);
                formData.append('password', password);
                if (profilePic) formData.append('profilePic', profilePic);

                res = await axios.post(`${API_URL}${endpoint}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            if (isLogin) {
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('user', JSON.stringify(res.data.user));
                window.location.href = '/chat';
            } else {
                setMessage({ text: 'Registration successful! Please login.', isError: false });
            }
        } catch (error) {
            setMessage({ text: error.response?.data?.msg || 'An error occurred.', isError: true });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 ">
            <h2 className="text-2xl font-bold text-lime text-center">{isLogin ? 'Login' : 'Register'}</h2>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required className="p-2 rounded bg-green border border-litegreen text-lime placeholder-lime focus:outline-none" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required className="p-2 rounded bg-green border border-litegreen text-lime placeholder-lime focus:outline-none" />

            {!isLogin && (
                <div className="flex flex-col items-center my-2">
                    <label htmlFor="profilePic" className="text-lime font-bold mb-1">
                    Profile Picture (optional)
                    </label>
                    <div className="flex items-center gap-4">
                    {/* Preview circle */}
                    <div className="w-16 h-16 rounded-full border-2 border-litegreen flex items-center justify-center bg-slate-800 overflow-hidden">
                        {previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                        <span className="text-xs text-gray-400"></span>
                        )}
                    </div>
                    {/* Upload button */}
                    <label className="bg-lime text-darkgreen px-3 py-1 rounded cursor-pointer font-bold hover:bg-litegreen transition">
                        Profil picture
                        <input
                        id="profilePic"
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePicChange}
                        className="hidden"
                        />
                    </label>
                    </div>
                </div>
                )}

            <button type="submit" className="bg-litegreen text-darkgreen font-bold p-2 rounded hover:bg-lime">{isLogin ? 'Login' : 'Register'}</button>
            {message.text && <p className={`text-center ${message.isError ? 'text-red-400' : 'text-lime'}`}>{message.text}</p>}
            <p className="text-lime text-center">
                {isLogin ? "No account?" : "Already have an account?"}{' '}
                <button type="button" onClick={onToggle} className="font-bold underline">
                    {isLogin ? "Register here" : "Login here"}
                </button>
            </p>
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
