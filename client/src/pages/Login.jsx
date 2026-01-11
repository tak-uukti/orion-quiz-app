import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        // Check credentials from env
        const adminUser = import.meta.env.VITE_ADMIN_USER;
        const adminPass = import.meta.env.VITE_ADMIN_PASS;

        if (username === adminUser && password === adminPass) {
            localStorage.setItem('isAdmin', 'true');
            navigate('/host');
        } else {
            setError('Invalid credentials');
        }
    };

    return (
        <div className="fullscreen-center">
            <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '3rem',
                borderRadius: '15px',
                backdropFilter: 'blur(10px)',
                width: '100%',
                maxWidth: '400px',
                textAlign: 'center'
            }}>
                <h2 style={{ marginBottom: '2rem' }}>Admin Login</h2>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="input-field"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-field"
                    />
                    {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}
                    <button type="submit" className="btn btn-primary">Login</button>
                </form>
                <div style={{ marginTop: '1rem' }}>
                    <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                        <a href="/" style={{ color: 'white', textDecoration: 'none' }}>← Back to Home</a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
