import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, LogOut, Code, Plus, RefreshCw, Folder, MessageSquare } from 'lucide-react';

export default function Dashboard() {
    const navigate = useNavigate();
    const [datasets, setDatasets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [newDatasetName, setNewDatasetName] = useState('');
    const [newDatasetDesc, setNewDatasetDesc] = useState('');
    const [creating, setCreating] = useState(false);

    const checkAuth = () => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/auth');
            return null;
        }
        return token;
    };

    const fetchDatasets = async () => {
        const token = checkAuth();
        if (!token) return;

        try {
            const response = await fetch('http://localhost:8000/datasets', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401) {
                handleLogout();
                return;
            }

            if (!response.ok) throw new Error('Failed to fetch datasets');

            const data = await response.json();
            setDatasets(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDatasets();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/auth');
    };

    const handleCreateDataset = async (e) => {
        e.preventDefault();
        const token = checkAuth();
        if (!token) return;

        if (!newDatasetName.trim()) return;

        setCreating(true);
        setError('');

        try {
            const response = await fetch('http://localhost:8000/datasets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newDatasetName,
                    description: newDatasetDesc
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Failed to create dataset');
            }

            // Close modal, reset form, and refresh
            setShowModal(false);
            setNewDatasetName('');
            setNewDatasetDesc('');
            await fetchDatasets();

        } catch (err) {
            setError(err.message);
        } finally {
            setCreating(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="dashboard-container">
            <nav className="dashboard-nav">
                <div className="brand-logo">
                    <Code className="text-accent-primary" size={28} color="#3b82f6" />
                    <span>RAG App</span>
                </div>
                <div className="nav-actions">
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/chat')}
                    >
                        <MessageSquare size={18} />
                        Chat
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowModal(true)}
                    >
                        <Plus size={18} />
                        Create Dataset
                    </button>
                    <button
                        className="btn btn-danger"
                        onClick={handleLogout}
                    >
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>
            </nav>

            <main className="dashboard-content">
                <div className="welcome-section">
                    <h1 className="welcome-title">Manage your knowledge bases and datasets</h1>
                    <p className="welcome-subtitle">
                        Organize your documents into isolated folders before uploading.
                    </p>
                </div>

                {error && <div className="error-message" style={{ marginBottom: '2rem' }}>{error}</div>}

                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Database size={24} color="#8b5cf6" />
                            Total Datasets: {datasets.length}
                        </h2>
                    </div>

                    {isLoading ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                            <RefreshCw size={32} className="spin" style={{ marginBottom: '1rem' }} />
                            <p>Loading your datasets...</p>
                        </div>
                    ) : datasets.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                            <Folder size={48} color="var(--text-secondary)" style={{ opacity: 0.5, marginBottom: '1rem' }} />
                            <h3 style={{ marginBottom: '0.5rem' }}>No datasets yet</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>Click 'Create Dataset' to create your first folder.</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--accent-primary)' }}>
                                        <th style={{ padding: '1rem', fontWeight: 600 }}>Name</th>
                                        <th style={{ padding: '1rem', fontWeight: 600 }}>Description</th>
                                        <th style={{ padding: '1rem', fontWeight: 600 }}>Created</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {datasets.map((ds) => (
                                        <tr
                                            key={ds.id}
                                            onClick={() => navigate(`/dataset/${ds.id}`)}
                                            style={{
                                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                cursor: 'pointer',
                                                transition: 'background 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 500, color: '#f8fafc' }}>
                                                <Database size={18} color="#f59e0b" />
                                                {ds.name}
                                            </td>
                                            <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                                                {ds.description || '-'}
                                            </td>
                                            <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                {formatDate(ds.created_at)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* Modal for Creating Dataset */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content glass-panel">
                        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Create New Dataset</h2>
                        <form onSubmit={handleCreateDataset}>
                            <div className="input-group">
                                <label>Dataset Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. HR Documents"
                                    value={newDatasetName}
                                    onChange={(e) => setNewDatasetName(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="input-group">
                                <label>Description (Optional)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Brief description of contents..."
                                    value={newDatasetDesc}
                                    onChange={(e) => setNewDatasetDesc(e.target.value)}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                                <button
                                    type="button"
                                    className="btn"
                                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }}
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={creating}
                                >
                                    {creating ? 'Creating...' : 'Create Dataset'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
