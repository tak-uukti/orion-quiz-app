import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';

const HostDashboard = () => {
    const socket = useSocket();
    const navigate = useNavigate();
    const [quizzes, setQuizzes] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    // New Quiz State
    const [newQuizTitle, setNewQuizTitle] = useState('');
    const [questions, setQuestions] = useState([
        { title: '', options: ['', '', '', ''], correctOption: 0, timeLimit: 20 }
    ]);

    useEffect(() => {
        fetchQuizzes();

        // Listen for game created event
        if (socket) {
            socket.on('game_created', ({ roomId }) => {
                navigate(`/host/game/${roomId}`);
            });

            socket.on('error', ({ message }) => {
                alert(message);
            });
        }

        return () => {
            if (socket) {
                socket.off('game_created');
                socket.off('error');
            }
        }
    }, [socket, navigate]);

    const fetchQuizzes = async () => {
        try {
            const res = await fetch(`${API_URL}/api/quizzes`);
            if (res.ok) {
                const data = await res.json();
                setQuizzes(data);
            }
        } catch (err) {
            console.error("Failed to fetch quizzes", err);
        }
    };

    const handleAddQuestion = () => {
        setQuestions([...questions, { title: '', options: ['', '', '', ''], correctOption: 0, timeLimit: 20 }]);
    };

    const handleQuestionChange = (idx, field, value) => {
        const newQ = [...questions];
        newQ[idx][field] = value;
        setQuestions(newQ);
    };

    const handleOptionChange = (qIdx, oIdx, value) => {
        const newQ = [...questions];
        newQ[qIdx].options[oIdx] = value;
        setQuestions(newQ);
    };

    const saveQuiz = async () => {
        if (!newQuizTitle.trim()) {
            alert("Please enter a quiz title");
            return;
        }

        const quizData = {
            title: newQuizTitle,
            questions: questions
        };

        try {
            const res = await fetch(`${API_URL}/api/quizzes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(quizData)
            });

            if (res.ok) {
                await fetchQuizzes();
                setShowCreate(false);
                setNewQuizTitle('');
                setQuestions([{ title: '', options: ['', '', '', ''], correctOption: 0, timeLimit: 20 }]);
            } else {
                alert("Failed to save quiz");
            }
        } catch (err) {
            console.error("Error saving quiz:", err);
            alert("Error saving quiz");
        }
    };

    const startQuiz = (quiz) => {
        if (socket) {
            socket.emit('create_game', { quizId: quiz.id });
        }
    };

    return (
        <div className="glass-panel" style={{ width: '80%', maxWidth: '1000px', margin: '2rem auto' }}>
            <h1>Host Dashboard</h1>

            {!showCreate ? (
                <div>
                    <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ marginBottom: '2rem' }}>
                        + Create New Quiz
                    </button>

                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {quizzes.length === 0 && <p>No quizzes found. Create one to get started!</p>}
                        {quizzes.map(q => (
                            <div key={q.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3>{q.title}</h3>
                                    <p>{q.questions.length} Questions</p>
                                </div>
                                <button className="btn btn-accent" onClick={() => startQuiz(q)}>Start</button>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div>
                    <input
                        placeholder="Quiz Title"
                        value={newQuizTitle}
                        onChange={e => setNewQuizTitle(e.target.value)}
                        style={{ fontSize: '1.5rem' }}
                    />

                    {questions.map((q, qIdx) => (
                        <div key={qIdx} style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <h3>Question {qIdx + 1}</h3>
                            <input
                                placeholder="Question Title"
                                value={q.title}
                                onChange={e => handleQuestionChange(qIdx, 'title', e.target.value)}
                            />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                {q.options.map((opt, oIdx) => (
                                    <div key={oIdx} style={{ display: 'flex', alignItems: 'center' }}>
                                        <input
                                            placeholder={`Option ${oIdx + 1}`}
                                            value={opt}
                                            onChange={e => handleOptionChange(qIdx, oIdx, e.target.value)}
                                        />
                                        <input
                                            type="radio"
                                            name={`correct-${qIdx}`}
                                            checked={q.correctOption === oIdx}
                                            onChange={() => handleQuestionChange(qIdx, 'correctOption', oIdx)}
                                            style={{ width: '30px', marginLeft: '10px', height: '30px' }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    <button className="btn btn-secondary" onClick={handleAddQuestion} style={{ marginRight: '1rem' }}>Add Question</button>
                    <button className="btn btn-primary" onClick={saveQuiz}>Save Quiz</button>
                    <button className="btn" onClick={() => setShowCreate(false)} style={{ marginLeft: '1rem' }}>Cancel</button>
                </div>
            )}
        </div>
    );
};

export default HostDashboard;
