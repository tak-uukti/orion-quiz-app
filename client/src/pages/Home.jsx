import React from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
    const navigate = useNavigate();

    return (
        <div className="fullscreen-center">
            <h1 style={{ fontSize: '5rem', marginBottom: '3rem' }}>QUIZ LIVE</h1>

            <div style={{ display: 'flex', gap: '2rem' }}>
                <button
                    className="btn btn-primary"
                    style={{ fontSize: '2rem', padding: '2rem 4rem' }}
                    onClick={() => navigate('/join')}
                >
                    JOIN GAME
                </button>

                <button
                    className="btn btn-secondary"
                    style={{ fontSize: '1.5rem', padding: '2rem 3rem' }}
                    onClick={() => navigate('/host')}
                >
                    HOST QUIZ
                </button>
            </div>
        </div>
    );
};

export default Home;
