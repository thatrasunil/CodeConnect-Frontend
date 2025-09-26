import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

function Landing() {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const createRoom = () => {
    const id = Math.random().toString(36).substring(2, 8).toUpperCase();
    navigate(`/room/${id}`);
  };

  const joinRoom = () => {
    if (roomId) {
      navigate(`/room/${roomId}`);
    }
  };

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="logo">CodeConnect</div>
      </header>

      <main className="landing-main">
        <motion.div
          className="title-section"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="main-title">
            <span className="purple-text">Code Together,</span>
            <br />
            <span className="white-text">Create Magic</span>
          </h1>
          <p className="subtitle">
            Real-time collaborative code editing with instant sharing. Write, debug, and build amazing projects with your team.
          </p>
        </motion.div>

        <div className="cards-container">
          <motion.div
            className="card create-card"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            whileHover={{ scale: 1.02 }}
          >
            <h3>Start Coding</h3>
            <p>Create new room instantly</p>
            <button onClick={createRoom} className="btn create-btn">
              Create Room
            </button>
          </motion.div>

          <motion.div
            className="card join-card"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            whileHover={{ scale: 1.02 }}
          >
            <h3>Join Room</h3>
            <p>Enter room ID to join your team</p>
            <input
              type="text"
              placeholder="Enter room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="room-input"
            />
            <button onClick={joinRoom} className="btn join-btn">
              Join Room
            </button>
          </motion.div>
        </div>
      </main>

      <footer className="landing-footer">
        <p></p>
      </footer>
    </div>
  );
}

export default Landing;
