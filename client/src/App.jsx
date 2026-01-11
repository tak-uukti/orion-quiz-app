import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import Home from './pages/Home';
import HostDashboard from './pages/Host/Dashboard';
import HostGameRoom from './pages/Host/GameRoom';
import PlayerJoin from './pages/Player/Join';
import PlayerGameHelper from './pages/Player/GameHelper'; // Wrapper for game logic
import './App.css';

import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <SocketProvider>
      <Router>
        <div className="app-container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/host"
              element={
                <ProtectedRoute>
                  <HostDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/host/game/:roomId"
              element={
                <ProtectedRoute>
                  <HostGameRoom />
                </ProtectedRoute>
              }
            />
            <Route path="/join" element={<PlayerJoin />} />
            <Route path="/play" element={<PlayerGameHelper />} />
          </Routes>
        </div>
      </Router>
    </SocketProvider>
  );
}

export default App;
