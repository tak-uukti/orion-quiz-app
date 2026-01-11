import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';

const PlayerGameHelper = () => {
    const socket = useSocket();
    const location = useLocation();
    const navigate = useNavigate();
    const { roomId, name } = location.state || {}; // Expect passed from Join

    const [gameState, setGameState] = useState('WAITING');
    const [submitted, setSubmitted] = useState(false);
    const [result, setResult] = useState(null); // Correct/Incorrect feedback
    const [myScore, setMyScore] = useState(0);

    useEffect(() => {
        if (!socket || !roomId) {
            navigate('/join');
            return;
        }

        socket.on('game_state', ({ status }) => {
            setGameState(status);
            if (status === 'COUNTDOWN') {
                setSubmitted(false);
                setResult(null);
            }
        });

        socket.on('new_question', () => {
            setGameState('QUESTION');
            setSubmitted(false);
            setResult(null);
        });

        socket.on('answer_received', () => {
            setSubmitted(true);
        });

        socket.on('question_result', ({ correctOption, stats }) => {
            setGameState('SHOWING_RESULTS');
            // Check if we were correct? 
            // We need to know what we answered. 
            // Ideally server tells us individually "You were correct +1000"
            // For now, simpler: we just show "Look at screen" or wait for leaderboard
            // But user wants "student device see options only". 
            // We can infer result if we tracked our answer locally, but let's assume we wait for score update?
            // Simplest for now: "Time's up!"
        });

        socket.on('game_over', () => {
            setGameState('FINISHED');
        });

        // Listen for individual score updates if we implemented them?
        // Let's assume server doesn't send individual score updates yet in main.py

        return () => {
            socket.off('game_state');
            socket.off('new_question');
            socket.off('answer_received');
            socket.off('question_result');
            socket.off('game_over');
        }
    }, [socket, roomId, navigate]);

    const sendAnswer = (idx) => {
        if (!submitted && gameState === 'QUESTION') {
            socket.emit('submit_answer', { roomId, answerIndex: idx });
            // Ideally track what we sent to compare later
        }
    };

    if (gameState === 'WAITING') {
        return (
            <div className="fullscreen-center" style={{ background: '#46178f' }}>
                <h1>You're in!</h1>
                <p>See your nickname on screen?</p>
                <div className="glass-panel">
                    <h2>{name}</h2>
                </div>
            </div>
        );
    }

    if (gameState === 'COUNTDOWN') {
        return <div className="fullscreen-center"><h1>Get Ready!</h1></div>;
    }

    if (gameState === 'QUESTION') {
        if (submitted) {
            return (
                <div className="fullscreen-center">
                    <h1>Answer Sent!</h1>
                    <div className="loader"></div>
                </div>
            );
        }
        return (
            <div className="option-grid" style={{ height: '100vh', padding: '1rem', boxSizing: 'border-box' }}>
                <button className="option-card opt-0" onClick={() => sendAnswer(0)}>▲</button>
                <button className="option-card opt-1" onClick={() => sendAnswer(1)}>◆</button>
                <button className="option-card opt-2" onClick={() => sendAnswer(2)}>●</button>
                <button className="option-card opt-3" onClick={() => sendAnswer(3)}>■</button>
            </div>
        );
    }

    if (gameState === 'SHOWING_RESULTS') {
        return (
            <div className="fullscreen-center">
                {/* Ideally show Correct/Incorrect here */}
                <h1>Time's Up!</h1>
                <p>Look at the host screen for results.</p>
            </div>
        );
    }

    if (gameState === 'FINISHED') {
        return (
            <div className="fullscreen-center">
                <h1>Game Over</h1>
                <button className="btn" onClick={() => navigate('/')}>Exit</button>
            </div>
        );
    }

    return <div>Loading...</div>;
};

export default PlayerGameHelper;
