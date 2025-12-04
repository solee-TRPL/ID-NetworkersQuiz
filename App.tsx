import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import HostDashboard from './pages/HostDashboard';
import CreateQuiz from './pages/CreateQuiz';
import HostLobby from './pages/HostLobby';
import GameHost from './pages/GameHost';
import PlayerLobby from './pages/PlayerLobby';
import GamePlayer from './pages/GamePlayer';
import ProtectedRoute from './components/ProtectedRoute';

const App: React.FC = () => {
  return (
    <Router>
      <div className="h-full flex flex-col selection:bg-primary/20">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          
          {/* Player Routes */}
          <Route path="/play/:code?" element={<PlayerLobby />} />
          <Route path="/game/:playerId" element={<GamePlayer />} />

          {/* Host Routes (Protected) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/host/dashboard" element={<HostDashboard />} />
            <Route path="/host/create" element={<CreateQuiz />} />
            <Route path="/host/edit/:quizId" element={<CreateQuiz />} />
            <Route path="/host/lobby/:roomId" element={<HostLobby />} />
            <Route path="/host/game/:roomId" element={<GameHost />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
};

export default App;