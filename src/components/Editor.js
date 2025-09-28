import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import io from 'socket.io-client';
import Editor from '@monaco-editor/react';
import { motion } from 'framer-motion';

const backendURL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
const socket = io(backendURL);

function CodeEditor() {
  const { roomId } = useParams();
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [users, setUsers] = useState(1);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [typingUsers, setTypingUsers] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [messageReactions, setMessageReactions] = useState({});
  const [theme, setTheme] = useState('vs-dark');
  const [cursors, setCursors] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [roomEnded, setRoomEnded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const startTimeRef = useRef(0);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const editorRef = useRef(null);
  const decorationsRef = useRef([]);
  const monacoRef = useRef(null);

  useEffect(() => {
    // Load from localStorage as fallback
    const savedCode = localStorage.getItem(`code-${roomId}`);
    if (savedCode) setCode(savedCode);
    const savedMessages = localStorage.getItem(`messages-${roomId}`);
    if (savedMessages) setMessages(JSON.parse(savedMessages));

    // Fetch initial room data on mount for persistence as fallback
    fetch(`${backendURL}/api/room/${roomId}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.code !== undefined) {
          setCode(data.code || '');
          setLanguage(data.language || 'javascript');
          setMessages(data.messages || []);
          setIsLoading(false);
        }
      })
      .catch(err => console.error('Failed to fetch room data:', err));

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Emit join-room after a short delay to ensure connection
    const joinTimeout = setTimeout(() => {
      if (socket.connected) {
        socket.emit('join-room', roomId, socket.id);
      } else {
        console.log("Socket not connected, can't join room yet.");
      }
    }, 500);


    socket.on('room-joined', (data) => {
      setCode(data.code || '');
      setLanguage(data.language || 'javascript');
      setMessages(data.messages || []);
      setUsers(data.users || 1);
      setParticipants(data.participants || [socket.id]);
      if (isLoading) setIsLoading(false);
    });

    socket.on('user-joined', (userId) => {
      setUsers(prev => prev + 1);
      setParticipants(prev => [...prev, userId]);
    });

    socket.on('user-left', (userId) => {
      setUsers(prev => prev - 1);
      setParticipants(prev => prev.filter(id => id !== userId));
    });

    socket.on('user-count', (count) => {
      setUsers(count);
    });

    socket.on('code-update', (data) => {
      setCode(data.code);
      setLanguage(data.language);
    });

    socket.on('new-message', (message) => {
      if (message.userId !== (socket.id ? socket.id.substring(0, 6) : 'Guest')) {
        setMessages(prev => [...prev, message]);
      }
    });

    socket.on('user-typing', (data) => {
      const { userId, isTyping } = data;
      setTypingUsers(prev => {
        if (isTyping) {
          return [...prev.filter(u => u !== userId), userId];
        } else {
          return prev.filter(u => u !== userId);
        }
      });
    });

    socket.on('cursor-update', (data) => {
      const { userId, line, column } = data;
      setCursors(prev => new Map(prev.set(userId, { line, column })));
    });

    socket.on('cursor-leave', (userId) => {
      setCursors(prev => {
        const newCursors = new Map(prev);
        newCursors.delete(userId);
        return newCursors;
      });
    });

    socket.on('room-ended', (data) => {
      setRoomEnded(true);
      // Clear localStorage
      localStorage.removeItem(`code-${roomId}`);
      localStorage.removeItem(`messages-${roomId}`);
    });

    return () => {
      clearTimeout(joinTimeout);
      socket.off('room-joined');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('user-count');
      socket.off('code-update');
      socket.off('new-message');
      socket.off('user-typing');
      socket.off('cursor-update');
      socket.off('cursor-leave');
      socket.off('room-ended');
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [roomId, isLoading]);

  const handleCodeChange = (value) => {
    setCode(value);
    socket.emit('code-change', { roomId, code: value, language });
  };

  // Save code to localStorage
  useEffect(() => {
    localStorage.setItem(`code-${roomId}`, code);
  }, [code, roomId]);

  // Save messages to localStorage
  useEffect(() => {
    localStorage.setItem(`messages-${roomId}`, JSON.stringify(messages));
  }, [messages, roomId]);

  const runCode = () => {
    // For now, just show a notification
    console.log('Code execution feature coming soon!');
  };

  const saveCode = () => {
    // For now, just show a notification
    console.log('Code saved locally!');
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'vs-dark' ? 'light' : 'vs-dark');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
    console.log('Link copied to clipboard!');
  };

  const endRoom = () => {
    socket.emit('end-room', roomId, socket.id);
  };

  const sendMessage = () => {
    if (!messageText.trim()) return;
    const userId = socket.id ? socket.id.substring(0, 6) : 'Guest';
    const message = {
      id: Date.now() + Math.random(),
      userId,
      content: messageText,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, message]); // Add locally for instant feedback
    socket.emit('send-message', { roomId, id: message.id, content: messageText, userId });
    socket.emit('typing', { roomId, userId: socket.id || 'Guest', isTyping: false });
    setMessageText('');
  };

  const handleInputChange = (e) => {
    setMessageText(e.target.value);
    const safeUserId = socket.id ? socket.id.substring(0, 6) : 'Guest';
    socket.emit('typing', { roomId, userId: safeUserId, isTyping: true });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { roomId, userId: safeUserId, isTyping: false });
    }, 1000);
  };

  const addEmoji = (emoji) => {
    setMessageText(prev => prev + emoji);
  };

  const addReaction = (messageId, emoji) => {
    setMessageReactions(prev => ({
      ...prev,
      [messageId]: {
        ...prev[messageId],
        [emoji]: (prev[messageId]?.[emoji] || 0) + 1
      }
    }));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      recordedChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        sendVoiceMessage(url, blob.size);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendVoiceMessage = (fileUrl, duration) => {
    const userId = socket.id ? socket.id.substring(0, 6) : 'Guest';
    const message = {
      id: Date.now() + Math.random(),
      userId,
      content: 'Voice message',
      type: 'voice',
      fileUrl,
      duration,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, message]);
    socket.emit('send-message', { roomId, id: message.id, content: message.content, userId, type: 'voice', fileUrl, duration });
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(`${backendURL}/api/upload-file`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      sendFileMessage(data.fileUrl, file.name);
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const sendFileMessage = (fileUrl, content) => {
    const userId = socket.id ? socket.id.substring(0, 6) : 'Guest';
    const message = {
      id: Date.now() + Math.random(),
      userId,
      content,
      type: 'file',
      fileUrl,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, message]);
    socket.emit('send-message', { roomId, id: message.id, content, userId, type: 'file', fileUrl });
  };

  const toggleChat = () => {
    setIsChatOpen(prev => !prev);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update cursor decorations
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      const monaco = monacoRef.current;
      const decorations = [];
      cursors.forEach((cursor, userId) => {
        if (userId !== socket.id) {
          decorations.push({
            range: new monaco.Range(cursor.line + 1, cursor.column + 1, cursor.line + 1, cursor.column + 1),
            options: {
              className: 'other-user-cursor',
              stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
              afterContentClassName: `cursor-label cursor-${userId.substring(0, 6)}`
            }
          });
        }
      });
      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, decorations);
    }
  }, [cursors]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.onDidChangeCursorPosition((e) => {
      const position = e.position;
      socket.emit('cursor-update', {
        roomId,
        userId: socket.id,
        line: position.lineNumber - 1,
        column: position.column - 1
      });
    });

    // Emit cursor leave when focus is lost
    editor.onDidBlurEditorText(() => {
      socket.emit('cursor-leave', socket.id);
    });
  };

  const formatMessage = (msg) => {
    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let content;
    if (msg.type === 'voice') {
      content = <audio controls src={msg.fileUrl} />;
    } else if (msg.type === 'file') {
      const isImage = msg.fileUrl.match(/\.(jpeg|jpg|gif|png)$/i);
      content = isImage ? <img src={msg.fileUrl} alt={msg.content} style={{ maxWidth: '200px' }} /> : <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">{msg.content}</a>;
    } else {
      content = <span className="message-text">{msg.content}</span>;
    }
    return (
      <motion.div
        key={msg.timestamp}
        className="message"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <span className="user-name">{msg.userId}:</span>
        {content}
        <span className="message-time">{time}</span>
        <div className="message-reactions">
          <button onClick={() => addReaction(msg.timestamp, '👍')}>👍</button>
          <button onClick={() => addReaction(msg.timestamp, '❤️')}>❤️</button>
          <button onClick={() => addReaction(msg.timestamp, '😂')}>😂</button>
        </div>
        {messageReactions[msg.timestamp] && (
          <div className="reactions-display">
            {Object.entries(messageReactions[msg.timestamp]).map(([emoji, count]) => (
              <span key={emoji} className="reaction">{emoji} {count}</span>
            ))}
          </div>
        )}
      </motion.div>
    );
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.4 }
    }
  };

  const chatVariants = {
    open: { width: '300px', opacity: 1 },
    closed: { width: 0, opacity: 0, transition: { duration: 0.3 } }
  };

  if (isLoading) {
    return (
      <div className="loading-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'linear-gradient(135deg, #0a0a0a 0%, #1e293b 100%)', color: '#fff' }}>
        <div className="loading-spinner"></div>
        <h2 style={{ marginTop: '1rem' }}>Loading Room: {roomId}...</h2>
        <p>Connecting to the collaborative editor...</p>
      </div>
    );
  }

  return (
    <motion.div
      className="editor-container"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.header
        className="editor-header"
        variants={itemVariants}
        whileHover={{ scale: 1.02 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/" className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>← Back</Link>
          <h2>Room: {roomId}</h2>
        </div>
        <div className="status">
          <motion.span
            className={`connection ${connected ? 'connected' : 'disconnected'}`}
            animate={{ scale: connected ? 1 : [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            {connected ? '🟢 Connected' : '🔴 Disconnected'}
          </motion.span>
          <span>👥 {users} users</span>
          <button onClick={copyLink} className="btn">📋 Copy Link</button>
          {!roomEnded && <button onClick={endRoom} className="btn end-room-btn" style={{backgroundColor: '#ff4444', color: 'white'}}>End Room</button>}
        </div>
      </motion.header>

      {roomEnded && (
        <div className="room-ended-overlay">
          <div className="room-ended-message">
            <h2>Room Ended</h2>
            <p>The room has been ended by a participant.</p>
            <Link to="/" className="btn">Back to Home</Link>
          </div>
        </div>
      )}

      <div className="main-layout">
        <motion.div className="participants-pane" variants={itemVariants}>
          <h4>👥 Participants ({participants.length})</h4>
          <ul>
            {participants.map(participant => (
              <motion.li
                key={participant}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="participant-avatar">
                  {participant.substring(0, 2).toUpperCase()}
                </div>
                <span>{participant.substring(0, 6)}</span>
                <span className="online-indicator">●</span>
                {typingUsers.includes(participant) && <span className="typing-status">Typing...</span>}
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <motion.div className="code-editor-section" variants={itemVariants}>
          <div className="editor-toolbar">
            <button onClick={runCode} className="toolbar-btn run-btn">▶ Run</button>
            <button onClick={saveCode} className="toolbar-btn save-btn">💾 Save</button>
            <button onClick={toggleTheme} className="toolbar-btn theme-btn">🌙 Theme</button>
            <button onClick={toggleChat} className="toolbar-btn chat-btn">💬 Chat</button>
          </div>
          <div className="editor-container-wrapper">
            <Editor
              height="100%"
              language={language}
              value={code}
              onChange={handleCodeChange}
              onMount={handleEditorDidMount}
              theme={theme}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true
              }}
            />
          </div>
          <div className="description-bar">
            This editor supports multiple programming languages. Write, edit, and collaborate in real-time.
          </div>
        </motion.div>

        <motion.div
          className={`chat-pane ${isChatOpen ? 'open' : 'closed'}`}
          variants={chatVariants}
          initial={false}
          animate={isChatOpen ? "open" : "closed"}
        >
          <div className="chat-header">
            <h3>💬 Chat ({users} online)</h3>
            <button onClick={toggleChat} className="toggle-chat-btn">
              {isChatOpen ? '−' : '+'}
            </button>
          </div>
          <div className="chat-messages">
            {messages.map(formatMessage)}
            {typingUsers.length > 0 && (
              <div className="typing-indicator">
                {typingUsers.map(user => user.substring(0, 6)).join(', ')} is typing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input-container">
            <input
              type="text"
              value={messageText}
              onChange={handleInputChange}
              placeholder="Type a message..."
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <div className="emoji-picker">
              <button onClick={() => addEmoji('😊')}>😊</button>
              <button onClick={() => addEmoji('👍')}>👍</button>
              <button onClick={() => addEmoji('🚀')}>🚀</button>
              <button onClick={() => addEmoji('💡')}>💡</button>
            </div>
            <button onClick={() => setMessageText(prev => prev + `\`\`\`\n${code}\n\`\`\``)} className="code-snippet-btn">📄 Code Snippet</button>
            <button onClick={isRecording ? stopRecording : startRecording} className="voice-btn">{isRecording ? '⏹️ Stop' : '🎤 Voice'}</button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current.click()} className="file-btn">📎 File</button>
            <button onClick={sendMessage} className="send-btn">📤 Send</button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default CodeEditor;
