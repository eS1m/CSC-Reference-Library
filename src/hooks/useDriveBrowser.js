import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function useDriveBrowser() {
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const currentFolderId = breadcrumbs.length > 0 
    ? breadcrumbs[breadcrumbs.length - 1].id 
    : null;

  const fetchContents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const url = currentFolderId 
        ? `${API_URL}/drive/browse?folderId=${encodeURIComponent(currentFolderId)}`
        : `${API_URL}/drive/browse`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch folder contents');
      const data = await res.json();
      
      setFolders(data.folders);
      setFiles(data.files);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentFolderId]);

  useEffect(() => {
    fetchContents();
  }, [fetchContents]);

  const navigateToFolder = (folder) => {
    setSearchQuery('');
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
  };

  const navigateToBreadcrumb = (index) => {
    setSearchQuery('');
    if (index === -1) {
      setBreadcrumbs([]);
    } else {
      setBreadcrumbs(prev => prev.slice(0, index + 1));
    }
  };

  const handleView = (webViewLink) => {
    if (webViewLink) window.open(webViewLink, '_blank');
  };

  const handleDownload = (webContentLink) => {
    if (webContentLink) window.open(webContentLink, '_blank');
  };

  const deleteItem = async (item) => {
    const res = await fetch(`${API_URL}/drive/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId: item.id })
    });
    
    if (!res.ok) throw new Error('Failed to delete item');
    const data = await res.json();

    const fileIdsToClean = [];
    if (data.mimeType === 'application/vnd.google-apps.folder') {
      fileIdsToClean.push(...(data.nestedFileIds || []));
    } else {
      fileIdsToClean.push(item.id);
    }

    const chunkSize = 10;
    for (let i = 0; i < fileIdsToClean.length; i += chunkSize) {
      const chunk = fileIdsToClean.slice(i, i + chunkSize);
      const submissionsQuery = query(
        collection(db, 'agencySubmissions'), 
        where('fileId', 'in', chunk)
      );
      const snapshot = await getDocs(submissionsQuery);
      const deletePromises = snapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);
    }

    await fetchContents();
    return { success: true, deletedCount: fileIdsToClean.length };
  };

  const filteredFolders = folders.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return {
    breadcrumbs,
    folders,
    files,
    loading,
    error,
    searchQuery,
    filteredFolders,
    filteredFiles,
    setSearchQuery,
    fetchContents,
    navigateToFolder,
    navigateToBreadcrumb,
    handleView,
    handleDownload,
    deleteItem
  };
}
