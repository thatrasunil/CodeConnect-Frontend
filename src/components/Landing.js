import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';

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

  const copyLink = (id) => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${id}`);
  };

  // 3D Cube Component
  function Cube() {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="hotpink" />
      </mesh>
    );
  }

  return (
    <div className="landing">
      <motion.header
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1>CodeConnect</h1>
        <p>Real-time collaborative coding with friends</p>
      </motion.header>

      <motion.div
        className="hero"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="controls">
          <button onClick={createRoom} className="btn primary">
            Create Room
          </button>
          <input
            type="text"
            placeholder="Enter Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="input"
          />
          <button onClick={joinRoom} className="btn secondary">
            Join Room
          </button>
        </div>

        <div className="features">
          <motion.div
            className="feature"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <h3>Real-time Sync</h3>
            <p>Edit code together instantly</p>
          </motion.div>
          <motion.div
            className="feature"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <h3>Syntax Highlighting</h3>
            <p>Support for 50+ languages</p>
          </motion.div>
          <motion.div
            className="feature"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <h3>Share Links</h3>
            <p>Invite friends easily</p>
          </motion.div>
        </div>

        {/* 3D Modal/Background */}
        <div className="three-container">
          <Canvas>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <Cube />
          </Canvas>
        </div>
      </motion.div>

      <footer>
        <p>Future: Chat with emojis, user accounts, friend management</p>
      </footer>
    </div>
  );
}

export default Landing;
