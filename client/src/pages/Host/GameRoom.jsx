import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';

const HostGameRoom = () => {
    const { roomId } = useParams();
    const socket = useSocket();
    const [gameState, setGameState] = useState('WAITING'); // WAITING, COUNTDOWN, QUESTION, SHOWING_RESULTS, FINISHED
    const [players, setPlayers] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [timer, setTimer] = useState(0);
    const [leaderboard, setLeaderboard] = useState([]);
    const [resultStats, setResultStats] = useState(null);

    useEffect(() => {
        if (!socket) return;

        socket.emit('host_join', { roomId });

        socket.on('player_joined', (player) => {
            setPlayers(prev => [...prev, player]);
        });

        socket.on('error', ({ message }) => {
            alert(message);
            if (message.includes('Room')) {
                window.location.href = '/host';
            }
        });

        socket.on('player_left', ({ sid }) => {
            setPlayers(prev => prev.filter(p => p.sid !== sid));
        });

        socket.on('game_state', ({ status }) => {
            setGameState(status);
        });

        socket.on('new_question', (question) => {
            setGameState('QUESTION');
            setCurrentQuestion(question);
            setTimer(question.timeLimit);
            setResultStats(null);
        });

        socket.on('question_result', ({ correctOption, stats }) => {
            setGameState('SHOWING_RESULTS');
            setResultStats({ correctOption, stats }); // stats: {sid: answerIdx}
        });

        socket.on('game_over', ({ leaderboard }) => {
            setGameState('FINISHED');
            setLeaderboard(leaderboard);
        });

        return () => {
            socket.off('player_joined');
            socket.off('player_left');
            socket.off('game_state');
            socket.off('new_question');
            socket.off('question_result');
            socket.off('game_over');
        }
    }, [socket, roomId]);

    // Timer Countdown
    useEffect(() => {
        if (gameState === 'QUESTION' && timer > 0) {
            const interval = setInterval(() => {
                setTimer(t => t - 1);
            }, 1000);
            return () => clearInterval(interval);
        } else if (gameState === 'QUESTION' && timer === 0) {
            // Time's up, auto show results? Or wait for host?
            // Let's auto show results
            socket.emit('show_results', { roomId });
        }
    }, [gameState, timer, socket, roomId]);


    const startGame = () => {
        socket.emit('start_game', { roomId });
    };

    const showResults = () => {
        socket.emit('show_results', { roomId });
    };

    const nextQuestion = () => {
        socket.emit('next_question', { roomId });
    };

    const colors = ['var(--shape-red)', 'var(--shape-blue)', 'var(--shape-yellow)', 'var(--shape-green)'];

    if (gameState === 'WAITING') {
        return (
            <div className="fullscreen-center">
                <h1>Join at: game.live</h1>
                {/* In real app, put URL */}
                <div className="glass-panel">
                    <h2>Game PIN: <span style={{ fontSize: '4rem', color: 'var(--accent)' }}>{roomId}</span></h2>
                </div>
                <div style={{ marginTop: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
                    {players.map(p => (
                        <motion.div
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            key={p.sid}
                            style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.2)', borderRadius: '20px' }}
                        >
                            {p.name}
                        </motion.div>
                    ))}
                </div>
                <div style={{ marginTop: 'auto', padding: '2rem' }}>
                    <h3>{players.length} Players Waiting</h3>
                    <button className="btn btn-primary" onClick={startGame}>Start Game</button>
                </div>
            </div>
        );
    }

    if (gameState === 'COUNTDOWN') {
        return (
            <div className="fullscreen-center">
                <motion.h1
                    initial={{ scale: 0 }}
                    animate={{ scale: 2 }}
                    transition={{ duration: 0.5, repeat: 3, repeatType: "reverse" }}
                >
                    Get Ready!
                </motion.h1>
            </div>
        );
    }

    if (gameState === 'QUESTION' && currentQuestion) {
        return (
            <div className="fullscreen-center" style={{ justifyContent: 'flex-start', paddingTop: '2rem' }}>
                <div style={{ width: '100%', padding: '0 2rem', boxSizing: 'border-box', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{players.length} Answers</span>
                    <h1>{timer}</h1>
                    <button className="btn" onClick={showResults}>Skip</button>
                </div>

                <div className="glass-panel" style={{ width: '90%', margin: '1rem', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <h1 style={{ fontSize: '2.5rem' }}>{currentQuestion.title}</h1>
                </div>

                <div className="option-grid" style={{ height: 'calc(100vh - 400px)', padding: '1rem' }}>
                    {currentQuestion.options.map((opt, idx) => (
                        <div key={idx} className={`option-card opt-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {/* Shapes can be added here like Triangle, Circle etc */}
                            {opt}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (gameState === 'SHOWING_RESULTS' && resultStats && currentQuestion) {
        // Calculate counts
        const counts = [0, 0, 0, 0];
        Object.values(resultStats.stats).forEach(idx => {
            if (idx >= 0 && idx < 4) counts[idx]++;
        });

        return (
            <div className="fullscreen-center">
                <h2>{currentQuestion.title}</h2>
                <div style={{ display: 'flex', alignItems: 'flex-end', height: '400px', gap: '2rem', margin: '2rem' }}>
                    {currentQuestion.options.map((opt, idx) => (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ marginBottom: '1rem', fontWeight: 'bold' }}>{counts[idx]}</div>
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${(counts[idx] / (players.length || 1)) * 300}px` }}
                                style={{
                                    width: '100px',
                                    background: colors[idx],
                                    opacity: idx === resultStats.correctOption ? 1 : 0.3,
                                    borderRadius: '8px 8px 0 0',
                                    minHeight: '10px'
                                }}
                            />
                            {idx === resultStats.correctOption && <span style={{ marginTop: '0.5rem' }}>✅</span>}
                        </div>
                    ))}
                </div>
                <button className="btn btn-primary" onClick={nextQuestion}>Next</button>
            </div>
        );
    }

    if (gameState === 'FINISHED') {
        return (
            <div className="fullscreen-center">
                <h1>Podium</h1>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
                    {/* 2nd Place */}
                    {leaderboard[1] && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <h3>{leaderboard[1].name}</h3>
                            <div style={{ width: '100px', height: '150px', background: 'silver', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'black', fontWeight: 'bold' }}>
                                {leaderboard[1].score}
                            </div>
                        </div>
                    )}
                    {/* 1st Place */}
                    {leaderboard[0] && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <h2>{leaderboard[0].name}</h2>
                            <div style={{ width: '100px', height: '200px', background: 'gold', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'black', fontWeight: 'bold' }}>
                                {leaderboard[0].score}
                            </div>
                        </div>
                    )}
                    {/* 3rd Place */}
                    {leaderboard[2] && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <h3>{leaderboard[2].name}</h3>
                            <div style={{ width: '100px', height: '100px', background: '#cd7f32', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'black', fontWeight: 'bold' }}>
                                {leaderboard[2].score}
                            </div>
                        </div>
                    )}
                </div>
                <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-primary" onClick={() => window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/export/${roomId}`, '_blank')}>
                        Export CSV
                    </button>
                    <button className="btn btn-secondary" onClick={() => window.location.href = '/'}>
                        Home
                    </button>
                </div>
            </div>
        );
    }

    return <div>Loading...</div>;
};

export default HostGameRoom;
