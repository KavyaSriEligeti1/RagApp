import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MessageSquare,
    Plus,
    Send,
    Mic,
    Paperclip,
    Image as ImageIcon,
    ArrowLeft,
    Bot,
    User,
    ChevronDown
} from 'lucide-react';

export default function ChatInterface() {
    const navigate = useNavigate();
    const [messages, setMessages] = useState([
        { id: 1, role: 'assistant', content: 'Hello! I am your RAG assistant. Please select a dataset above and ask me anything about it!' }
    ]);
    const [input, setInput] = useState('');
    const [datasets, setDatasets] = useState([]);
    const [selectedDatasetId, setSelectedDatasetId] = useState('');
    const [sessions, setSessions] = useState([]);
    const [selectedSessionId, setSelectedSessionId] = useState('new');
    const [isThinking, setIsThinking] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [attachedFile, setAttachedFile] = useState(null);

    const checkAuth = () => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/auth');
            return null;
        }
        return token;
    };

    useEffect(() => {
        const fetchDatasets = async () => {
            const token = checkAuth();
            if (!token) return;

            try {
                const response = await fetch('http://localhost:8000/datasets', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setDatasets(data);
                    if (data.length > 0) {
                        setSelectedDatasetId(data[0].id.toString());
                    }
                }
            } catch (err) {
                console.error("Failed to fetch datasets", err);
            }
        };

        fetchDatasets();
    }, []);

    const fetchSessions = async (datasetId) => {
        const token = checkAuth();
        if (!token) return;
        try {
            const response = await fetch(`http://localhost:8000/sessions?dataset_id=${datasetId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setSessions(data);
                if (data.length > 0) {
                    loadSession(data[0].id.toString());
                } else {
                    handleNewChat();
                }
            }
        } catch (err) {
            console.error("Failed to fetch sessions", err);
        }
    };

    const loadSession = async (sessionId) => {
        setSelectedSessionId(sessionId);
        const token = checkAuth();
        if (!token) return;
        
        try {
            const response = await fetch(`http://localhost:8000/sessions/${sessionId}/messages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.length === 0) {
                     setMessages([{ id: 1, role: 'assistant', content: 'Hello! I am your RAG assistant. Please ask me anything about this dataset!' }]);
                } else {
                    setMessages(data.map(m => ({ id: m.id, role: m.role, content: m.content, sources: [] })));
                }
            }
        } catch (err) {
            console.error("Failed to load messages", err);
        }
    };

    useEffect(() => {
        if (selectedDatasetId) {
            fetchSessions(selectedDatasetId);
        }
    }, [selectedDatasetId]);

    const handleSend = async (e) => {
        e?.preventDefault();
        if (!input.trim()) return;

        if (!selectedDatasetId) {
            // Give user feedback why nothing is happening
            setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: input }]);
            setInput('');
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    id: Date.now() + 1,
                    role: 'assistant',
                    content: 'Please select a dataset from the "Select Context" dropdown in the sidebar first! I need to know which documents to search.'
                }]);
            }, 400);
            return;
        }

        const token = checkAuth();
        if (!token) return;

        let currentSessionId = selectedSessionId;
        const currentDatasetId = selectedDatasetId; // Capture before async calls
        const userQuery = input;

        // If it's a new chat, create a session first
        if (currentSessionId === 'new') {
            try {
                const res = await fetch('http://localhost:8000/sessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ name: userQuery.substring(0, 30) || (attachedFile ? attachedFile.name : 'New Chat'), dataset_id: parseInt(currentDatasetId, 10) })
                });
                if (res.ok) {
                    const sessionData = await res.json();
                    currentSessionId = sessionData.id.toString();
                    setSelectedSessionId(currentSessionId);
                    setSessions(prev => [sessionData, ...prev]);
                }
            } catch (err) {
                console.error("Failed to create session", err);
                return;
            }
        }

        // If there's an attached file, upload it *before* sending the query
        if (attachedFile) {
            const formData = new FormData();
            formData.append('file', attachedFile);
            formData.append('dataset_id', currentDatasetId);

            try {
                setMessages(prev => [...prev, {
                    id: Date.now() - 1,
                    role: 'assistant',
                    content: `Uploading attached document ${attachedFile.name}...`
                }]);

                const uploadRes = await fetch('http://localhost:8000/upload', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                if (!uploadRes.ok) throw new Error('Failed to upload the attached document');
                
                setMessages(prev => [...prev, {
                    id: Date.now() - 2,
                    role: 'assistant',
                    content: `Success! ${attachedFile.name} was attached and uploaded. Note: You still need to manually Parse it in the Dataset Details view for me to answer questions about it.`
                }]);

            } catch (err) {
                setMessages(prev => [...prev, {
                    id: Date.now() - 3,
                    role: 'assistant',
                    content: `Attachment failed: ${err.message}`
                }]);
                return; // Stop execution if upload failed
            } finally {
                setAttachedFile(null); // Always clear attaching status
            }
        }

        // Add user message
        const newMsg = { id: Date.now(), role: 'user', content: userQuery };
        setMessages(prev => [...prev, newMsg]);
        setInput('');
        setIsThinking(true);

        // Finally, send the chat message
        try {
            const response = await fetch('http://localhost:8000/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    query: userQuery,
                    dataset_id: parseInt(selectedDatasetId, 10),
                    session_id: parseInt(currentSessionId, 10)
                })
            });

            if (!response.ok) {
                throw new Error('Failed to get an answer');
            }

            const msgId = Date.now() + 1;
            setMessages(prev => [...prev, {
                id: msgId,
                role: 'assistant',
                content: '',
                sources: []
            }]);
            setIsThinking(false); // Stop thinking animation as soon as the stream connects

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let done = false;
            let buffer = '';

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    buffer += decoder.decode(value, { stream: true });
                    let prevIndex = 0;

                    while (true) {
                        const newlineIndex = buffer.indexOf('\n\n', prevIndex);
                        if (newlineIndex === -1) break;

                        const chunk = buffer.slice(prevIndex, newlineIndex).trim();
                        prevIndex = newlineIndex + 2;

                        if (chunk.startsWith('data: ')) {
                            const dataStr = chunk.substring(6);
                            if (dataStr === '[DONE]') continue;

                            try {
                                const parsed = JSON.parse(dataStr);
                                if (parsed.type === 'sources') {
                                    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, sources: parsed.data } : m));
                                } else if (parsed.type === 'token') {
                                    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: m.content + parsed.data } : m));
                                } else if (parsed.type === 'done') {
                                    // Finished
                                }
                            } catch (e) {
                                console.error("Parse error on chunk:", dataStr, e);
                            }
                        }
                    }
                    buffer = buffer.slice(prevIndex);
                }
            }

        } catch (err) {
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'assistant',
                content: `Error: ${err.message}. Ensure you have parsed documents in this dataset.`
            }]);
            setIsThinking(false);
        }
    };

    const handleNewChat = () => {
        setSelectedSessionId('new');
        setMessages([
            { id: Date.now(), role: 'assistant', content: 'Starting a fresh conversation. How can I help?' }
        ]);
        setInput('');
        setAttachedFile(null);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!selectedDatasetId) {
            setMessages(prev => [...prev, {
                id: Date.now(),
                role: 'assistant',
                content: 'Please select a context dataset first before attaching a document!'
            }]);
            return;
        }

        // Just attach it to state so the user can preview it before sending
        setAttachedFile(file);
        
        // Reset file input value so the same file could be selected again if removed
        e.target.value = null;
    };

    return (
        <div className="chat-layout">
            {/* Sidebar */}
            <aside className="chat-sidebar">
                <div style={{ padding: '1rem' }}>
                    <div className="brand-logo" style={{ cursor: 'pointer', marginBottom: '2rem' }} onClick={() => navigate('/')}>
                        <ArrowLeft className="text-accent-primary" size={20} color="#3b82f6" />
                        <span style={{ fontSize: '1.2rem' }}>Back to Datasets</span>
                    </div>

                    <button className="btn btn-secondary w-full new-chat-btn" onClick={handleNewChat}>
                        <Plus size={18} />
                        New Chat
                    </button>
                </div>

                <div className="chat-history">
                    <p style={{ padding: '0 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Select Context</p>

                    <div style={{ padding: '0 1rem', marginBottom: '1rem' }}>
                        <div style={{ position: 'relative' }}>
                            <div
                                className="form-input"
                                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            >
                                <span>
                                    {datasets.find(d => d.id.toString() === selectedDatasetId)?.name || '-- Select a Dataset --'}
                                </span>
                                <ChevronDown size={16} color="var(--text-secondary)" />
                            </div>

                            {isDropdownOpen && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    background: '#1e293b',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    marginTop: '4px',
                                    zIndex: 9999,
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)'
                                }}>
                                    {datasets.length === 0 ? (
                                        <div style={{ padding: '1rem', textAlign: 'center' }}>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                                No datasets available
                                            </div>
                                            <button
                                                className="btn btn-secondary"
                                                style={{ width: '100%', fontSize: '0.8rem', padding: '0.4rem' }}
                                                onClick={() => navigate('/')}
                                            >
                                                Go to Dashboard to Create
                                            </button>
                                        </div>
                                    ) : (
                                        datasets.map(ds => (
                                            <div
                                                key={ds.id}
                                                style={{
                                                    padding: '0.75rem 1rem',
                                                    cursor: 'pointer',
                                                    transition: 'background 0.2s',
                                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                    color: ds.id.toString() === selectedDatasetId ? 'var(--accent-primary)' : '#f8fafc',
                                                    fontWeight: ds.id.toString() === selectedDatasetId ? '600' : '400'
                                                }}
                                                onClick={() => {
                                                    setSelectedDatasetId(ds.id.toString());
                                                    setIsDropdownOpen(false);
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                {ds.name}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <p style={{ padding: '0 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', marginTop: '1rem' }}>History</p>
                    <div className="sessions-list" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 250px)' }}>
                        {sessions.map(sess => (
                            <button 
                                key={sess.id}
                                className={`chat-history-item ${selectedSessionId === sess.id.toString() ? 'active' : ''}`}
                                onClick={() => loadSession(sess.id.toString())}
                            >
                                <MessageSquare size={16} />
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sess.name}</span>
                            </button>
                        ))}
                        {selectedSessionId === 'new' && (
                            <button className="chat-history-item active">
                                <MessageSquare size={16} />
                                <span>New Chat</span>
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Chat Area */}
            <main className="chat-main">
                <div className="messages-container">
                    {messages.length === 0 ? (
                        <div className="empty-chat">
                            <Bot size={48} color="var(--text-secondary)" />
                            <h2>How can I help you today?</h2>
                        </div>
                    ) : (
                        messages.map(msg => (
                            <div key={msg.id} className={`message-wrapper ${msg.role}`}>
                                <div className="message-content">
                                    <div className="message-avatar">
                                        {msg.role === 'assistant' ? <Bot size={20} /> : <User size={20} />}
                                    </div>
                                    <div className="message-text">
                                        {msg.content}
                                        {msg.sources && msg.sources.length > 0 && (
                                            <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '6px' }}>
                                                <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Sources utilized:</strong>
                                                <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
                                                    {msg.sources.map((source, idx) => (
                                                        <li key={idx} style={{ marginBottom: '0.1rem' }}>{source.filename} (Page {source.page})</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    {isThinking && (
                        <div className="message-wrapper assistant">
                            <div className="message-content">
                                <div className="message-avatar">
                                    <Bot size={20} />
                                </div>
                                <div className="message-text" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span className="blob"></span> Thinking...
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="chat-input-container">
                    {attachedFile && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '8px',
                            marginBottom: '0.75rem',
                            maxWidth: 'fit-content'
                        }}>
                            {attachedFile.type.startsWith('image/') ? <ImageIcon size={16} className="text-accent-primary" /> : <Paperclip size={16} className="text-accent-primary" />}
                            <span style={{ fontSize: '0.85rem', color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                                {attachedFile.name}
                            </span>
                            <button 
                                type="button" 
                                onClick={() => setAttachedFile(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    padding: '2px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginLeft: '0.25rem'
                                }}
                                aria-label="Remove attachment"
                            >
                                <Plus size={16} style={{ transform: 'rotate(45deg)' }} />
                            </button>
                        </div>
                    )}
                    <form onSubmit={handleSend} className="chat-input-wrapper">
                        <div className="chat-input-actions-left">
                            <label className="icon-btn" title="Upload Document">
                                <Paperclip size={20} />
                                <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} accept=".txt,.pdf" />
                            </label>
                            <label className="icon-btn" title="Upload Image (Coming soon)">
                                <ImageIcon size={20} />
                                <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} accept="image/*" />
                            </label>
                        </div>

                        <input
                            type="text"
                            className="chat-input"
                            placeholder="Message RAG Assistant..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                        />

                        <div className="chat-input-actions-right">
                            {input.trim() ? (
                                <button type="submit" className="icon-btn send-btn active" title="Send Message">
                                    <Send size={20} />
                                </button>
                            ) : (
                                <button type="button" className="icon-btn" title="Voice Input">
                                    <Mic size={20} />
                                </button>
                            )}
                        </div>
                    </form>
                    <p className="chat-disclaimer">
                        RAG Assistant can make mistakes. Consider verifying important information.
                    </p>
                </div>
            </main>
        </div>
    );
}
