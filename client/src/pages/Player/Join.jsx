import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';

const PlayerJoin = () => {
    const socket = useSocket();
    const navigate = useNavigate();
    const [pin, setPin] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!socket) return;

        socket.on('game_joined', ({ roomId, name }) => {
            // Save to state/context or pass via state
            // For now, we can just navigate and component will check socket state?
            // Or better, navigate with state
            navigate('/play', { state: { roomId, name } });
        });

        socket.on('error', ({ message }) => {
            setError(message);
        });

        return () => {
            socket.off('game_joined');
            socket.off('error');
        }
    }, [socket, navigate]);

    const handleJoin = () => {
        if (socket && pin && name) {
            socket.emit('join_game', { roomId: pin, name });
        }
    };

    return (
        <div className="fullscreen-center">
            <div className="glass-panel" style={{ width: '90%', maxWidth: '400px' }}>
                <h1>Join Game</h1>
                {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
                <input
                    placeholder="Game PIN"
                    value={pin} onChange={e => setPin(e.target.value)}
                    style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}
                />
                <input
                    placeholder="Nickname"
                    value={name} onChange={e => setName(e.target.value)}
                    style={{ textAlign: 'center' }}
                />
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleJoin}>
                    Enter
                </button>
            </div>
        </div>
    );
};

export default PlayerJoin;
