import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';

const HostDashboard = () => {
    const socket = useSocket();
    const navigate = useNavigate();
    const [quizzes, setQuizzes] = useState([]);
    const [showCreate, setShowCreate] = useState(false);

    // New Quiz State
    const [newQuizTitle, setNewQuizTitle] = useState('');
    const [questions, setQuestions] = useState([
        { title: '', options: ['', '', '', ''], correctOption: 0, timeLimit: 20 }
    ]);

    useEffect(() => {
        const saved = localStorage.getItem('quizzes');
        if (saved) {
            setQuizzes(JSON.parse(saved));
        } else {
            // Default Sample Quiz
            const sample = {
                id: Date.now(),
                title: 'General Knowledge',
                questions: [
                    { title: 'What is the capital of France?', options: ['London', 'Berlin', 'Paris', 'Madrid'], correctOption: 2, timeLimit: 20 },
                    { title: 'Which planet is known as the Red Planet?', options: ['Mars', 'Venus', 'Jupiter', 'Saturn'], correctOption: 0, timeLimit: 20 }
                ]
            };
            setQuizzes([sample]);
            localStorage.setItem('quizzes', JSON.stringify([sample]));
        }

        // Listen for game created event
        if (socket) {
            socket.on('game_created', ({ roomId }) => {
                navigate(`/host/game/${roomId}`);
            });
        }

        return () => {
            if (socket) socket.off('game_created');
        }
    }, [socket, navigate]);

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

    const saveQuiz = () => {
        const quiz = {
            id: Date.now(),
            title: newQuizTitle,
            questions: questions
        };
        const updated = [...quizzes, quiz];
        setQuizzes(updated);
        localStorage.setItem('quizzes', JSON.stringify(updated));
        setShowCreate(false);
        setNewQuizTitle('');
        setQuestions([{ title: '', options: ['', '', '', ''], correctOption: 0, timeLimit: 20 }]);
    };

    const startQuiz = (quiz) => {
        if (socket) {
            socket.emit('create_game', { quizData: quiz });
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
