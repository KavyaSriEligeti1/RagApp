import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, UploadCloud, RefreshCw, CheckCircle, Clock, Play, Trash2, MessageSquare } from 'lucide-react';

export default function DatasetDetails() {
    const { id: datasetId } = useParams();
    const navigate = useNavigate();
    const [documents, setDocuments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [processingId, setProcessingId] = useState(null);
    const [error, setError] = useState('');
    const [toastMessage, setToastMessage] = useState('');
    const fileInputRef = useRef(null);

    const checkAuth = () => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/auth');
            return null;
        }
        return token;
    };

    const fetchDocuments = async () => {
        const token = checkAuth();
        if (!token) return;

        try {
            const response = await fetch(`http://localhost:8000/datasets/${datasetId}/documents`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401) {
                localStorage.removeItem('token');
                navigate('/auth');
                return;
            }

            if (!response.ok) throw new Error('Failed to fetch documents for this dataset');

            const data = await response.json();
            setDocuments(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, [datasetId]);

    const showToast = (message) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(''), 3000);
    };

    const handleUploadClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const token = checkAuth();
        if (!token) return;

        setUploading(true);
        setError('');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('dataset_id', datasetId);

        try {
            const uploadResponse = await fetch('http://localhost:8000/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!uploadResponse.ok) {
                const errData = await uploadResponse.json();
                throw new Error(errData.detail || 'Upload failed');
            }

            await fetchDocuments();
            showToast('Document uploaded successfully!');
            event.target.value = '';

        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleParse = async (docId) => {
        const token = checkAuth();
        if (!token) return;

        setProcessingId(docId);
        setError('');

        try {
            const processResponse = await fetch(`http://localhost:8000/process/${docId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!processResponse.ok) {
                const errData = await processResponse.json();
                throw new Error(errData.detail || 'Processing failed');
            }

            await fetchDocuments();
            showToast('Document processed and ready for Q&A!');
        } catch (err) {
            setError(err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleDelete = async (docId) => {
        if (!confirm('Are you sure you want to delete this document?')) return;

        const token = checkAuth();
        if (!token) return;

        setError('');

        try {
            const deleteResponse = await fetch(`http://localhost:8000/documents/${docId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!deleteResponse.ok) {
                const errData = await deleteResponse.json();
                throw new Error(errData.detail || 'Failed to delete document');
            }

            await fetchDocuments();
            showToast('Document deleted successfully!');
        } catch (err) {
            setError(err.message);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const utcDateString = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
        const date = new Date(utcDateString);
        return date.toLocaleString();
    };

    return (
        <div className="dashboard-container">
            <nav className="dashboard-nav">
                <div className="brand-logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
                    <ArrowLeft className="text-accent-primary" size={24} color="#3b82f6" />
                    <span>Back to Datasets</span>
                </div>
                <div className="nav-actions">
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/chat')}
                    >
                        <MessageSquare size={18} />
                        Chat
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        accept=".txt,.pdf"
                    />
                    <button
                        className="btn btn-primary"
                        onClick={handleUploadClick}
                        disabled={uploading}
                    >
                        {uploading ? <RefreshCw size={18} className="spin" /> : <UploadCloud size={18} />}
                        {uploading ? 'Uploading...' : 'Upload Document'}
                    </button>
                </div>
            </nav>

            <main className="dashboard-content">
                <div style={{ marginBottom: '2rem' }}>
                    <h1 className="welcome-title" style={{ fontSize: '2rem', textAlign: 'left', marginBottom: '0.5rem' }}>Dataset Details</h1>
                    <p className="welcome-subtitle" style={{ textAlign: 'left' }}>
                        Manage documents within this isolated dataset.
                    </p>
                </div>

                {error && <div className="error-message" style={{ marginBottom: '2rem' }}>{error}</div>}

                <div className="glass-panel" style={{ padding: '2rem' }}>
                    {isLoading ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                            <RefreshCw size={32} className="spin" style={{ marginBottom: '1rem' }} />
                            <p>Loading documents...</p>
                        </div>
                    ) : documents.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                            <FileText size={48} color="var(--text-secondary)" style={{ opacity: 0.5, marginBottom: '1rem' }} />
                            <h3 style={{ marginBottom: '0.5rem' }}>No documents in this dataset</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>Click 'Upload Document' to add files to this dataset.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {documents.map((doc) => (
                                <div key={doc.id} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(15, 23, 42, 0.4)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem', borderRadius: '8px' }}>
                                            <FileText size={24} color="#3b82f6" />
                                        </div>
                                        <div>
                                            <h4 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{doc.filename}</h4>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <Clock size={14} />
                                                    {formatDate(doc.upload_time)}
                                                </span>

                                                {/* Action Buttons inline with Date/Time */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '1rem', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '1rem' }}>
                                                    {processingId === doc.id ? (
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', fontWeight: 500 }}>
                                                            <RefreshCw size={14} className="spin" />
                                                            Parsing...
                                                        </span>
                                                    ) : (
                                                        <>
                                                            {doc.is_parsed && (
                                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--success)', fontWeight: 500, marginRight: '0.5rem' }}>
                                                                    <CheckCircle size={14} />
                                                                    <span style={{ fontSize: '0.85rem' }}>Ready</span>
                                                                </span>
                                                            )}
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleParse(doc.id); }}
                                                                className="btn btn-secondary"
                                                                style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)', border: 'none' }}
                                                                title="Parse this document to enable Q&A"
                                                            >
                                                                <Play size={12} /> Parse
                                                            </button>
                                                        </>
                                                    )}

                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                                                        className="btn"
                                                        style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--danger)' }}
                                                        title="Delete document"
                                                    >
                                                        <Trash2 size={12} /> Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Toast Notification */}
            {toastMessage && (
                <div className="toast-notification">
                    <CheckCircle size={20} />
                    {toastMessage}
                </div>
            )}
        </div>
    );
}
