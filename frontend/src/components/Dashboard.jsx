import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, LogOut, Code, Plus, RefreshCw, Folder, MessageSquare } from 'lucide-react';

export default function Dashboard() {
    const navigate = useNavigate();
    const [datasets, setDatasets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Modal state for Create
    const [showModal, setShowModal] = useState(false);
    const [newDatasetName, setNewDatasetName] = useState('');
    const [newDatasetDesc, setNewDatasetDesc] = useState('');
    const [creating, setCreating] = useState(false);

    // Modal state for Rename
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [renameDatasetId, setRenameDatasetId] = useState(null);
    const [renameName, setRenameName] = useState('');
    const [renameDesc, setRenameDesc] = useState('');
    const [renaming, setRenaming] = useState(false);

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

            if (response.status === 401) {
                handleLogout();
                return;
            }

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

    const openRenameModal = (dataset, e) => {
        e.stopPropagation();
        setRenameDatasetId(dataset.id);
        setRenameName(dataset.name);
        setRenameDesc(dataset.description || '');
        setShowRenameModal(true);
    };

    const handleRenameDataset = async (e) => {
        e.preventDefault();
        const token = checkAuth();
        if (!token) return;

        if (!renameName.trim()) return;

        setRenaming(true);
        setError('');

        try {
            const response = await fetch(`http://localhost:8000/datasets/${renameDatasetId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: renameName,
                    description: renameDesc
                })
            });

            if (response.status === 401) {
                handleLogout();
                return;
            }

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Failed to update dataset');
            }

            setShowRenameModal(false);
            await fetchDatasets();
        } catch (err) {
            setError(err.message);
        } finally {
            setRenaming(false);
        }
    };

    const handleDeleteDataset = async (datasetId, e) => {
        e.stopPropagation();
        const token = checkAuth();
        if (!token) return;

        if (!window.confirm('Are you sure you want to delete this dataset? This will delete all enclosed documents and chat history permanently.')) {
            return;
        }

        setError('');
        try {
            const response = await fetch(`http://localhost:8000/datasets/${datasetId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401) {
                handleLogout();
                return;
            }

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Failed to delete dataset');
            }

            await fetchDatasets();
        } catch (err) {
            setError(err.message);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const utcDateString = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
        const date = new Date(utcDateString);
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
                                        <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {datasets.map((ds) => (
                                        <tr
                                            key={ds.id}
                                            style={{
                                                borderBottom: '1px solid rgba(255,255,255,0.05)',
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
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={() => navigate(`/dataset/${ds.id}`)}
                                                        className="btn btn-secondary"
                                                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                                                    >
                                                        View
                                                    </button>
                                                    <button
                                                        onClick={(e) => openRenameModal(ds, e)}
                                                        className="btn btn-secondary"
                                                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                                                    >
                                                        Rename
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteDataset(ds.id, e)}
                                                        className="btn btn-danger"
                                                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
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

            {/* Modal for Renaming Dataset */}
            {showRenameModal && (
                <div className="modal-overlay">
                    <div className="modal-content glass-panel">
                        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Rename Dataset</h2>
                        <form onSubmit={handleRenameDataset}>
                            <div className="input-group">
                                <label>Dataset Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={renameName}
                                    onChange={(e) => setRenameName(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="input-group">
                                <label>Description (Optional)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={renameDesc}
                                    onChange={(e) => setRenameDesc(e.target.value)}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                                <button
                                    type="button"
                                    className="btn"
                                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }}
                                    onClick={() => setShowRenameModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={renaming}
                                >
                                    {renaming ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
