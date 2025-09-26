import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import Editor from '@monaco-editor/react';
import { motion } from 'framer-motion';

const socket = io('http://localhost:5000');

function CodeEditor() {
  const { roomId } = useParams();
  const [html, setHtml] = useState('');
  const [css, setCss] = useState('');
  const [js, setJs] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [users, setUsers] = useState(1);
  const [connected, setConnected] = useState(false);
  const previewRef = useRef(null);

  useEffect(() => {
    socket.emit('join-room', roomId, socket.id);

    socket.on('room-joined', (data) => {
      setHtml(data.html || '');
      setCss(data.css || '');
      setJs(data.js || '');
      setUsers(data.users || 1);
      setConnected(true);
    });

    socket.on('user-joined', () => {
      setUsers(prev => prev + 1);
    });

    socket.on('user-count', (count) => {
      setUsers(count);
    });

    socket.on('code-update', (data) => {
      setHtml(data.html);
      setCss(data.css);
      setJs(data.js);
    });

    return () => {
      socket.off('room-joined');
      socket.off('user-joined');
      socket.off('user-count');
      socket.off('code-update');
    };
  }, [roomId]);

  const handleCodeChange = (type, value) => {
    if (type === 'html') setHtml(value);
    if (type === 'css') setCss(value);
    if (type === 'js') setJs(value);

    socket.emit('code-change', { roomId, html, css, js });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
    alert('Link copied!');
  };

  useEffect(() => {
    const preview = previewRef.current;
    if (preview) {
      preview.srcdoc = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>${css}</style>
          </head>
          <body>${html}
            <script>${js}<\/script>
          </body>
        </html>
      `;
    }
  }, [html, css, js]);

  return (
    <motion.div
      className="editor-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <header className="editor-header">
        <h2>Room: {roomId}</h2>
        <div className="status">
          <span className={`connection ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
          <span>Users: {users}</span>
          <button onClick={copyLink} className="btn">Copy Link</button>
        </div>
      </header>

      <div className="editors">
        <div className="editor-pane">
          <label>HTML</label>
          <Editor
            height="400px"
            language="html"
            value={html}
            onChange={(value) => handleCodeChange('html', value)}
            theme="vs-dark"
            options={{ minimap: { enabled: false } }}
          />
        </div>

        <div className="editor-pane">
          <label>CSS</label>
          <Editor
            height="400px"
            language="css"
            value={css}
            onChange={(value) => handleCodeChange('css', value)}
            theme="vs-dark"
            options={{ minimap: { enabled: false } }}
          />
        </div>

        <div className="editor-pane">
          <label>JavaScript</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            {/* Add more languages */}
          </select>
          <Editor
            height="400px"
            language={language}
            value={js}
            onChange={(value) => handleCodeChange('js', value)}
            theme="vs-dark"
            options={{ minimap: { enabled: false } }}
          />
        </div>
      </div>

      <div className="preview-pane">
        <label>Live Preview</label>
        <iframe ref={previewRef} title="preview" className="preview" />
      </div>

      {/* Future Features Placeholder */}
      <div className="future-features">
        <p>Coming soon: Chat with emojis/reactions, User accounts, Friend management</p>
      </div>
    </motion.div>
  );
}

export default CodeEditor;
