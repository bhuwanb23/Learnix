import { useState, useEffect } from 'react';
import { mockNotes, mockSubjects, mockTabs } from '../constants/notesData';

export const useNotesData = () => {
  const [notes, setNotes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState('pdfs');
  const [activeSubject, setActiveSubject] = useState('math');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotesData = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setNotes(mockNotes);
      setSubjects(mockSubjects);
      setTabs(mockTabs);
      setError(null);
    } catch (err) {
      setError('Failed to load notes data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotesData();
  }, []);

  const filteredNotes = notes.filter(note => {
    const matchesTab = activeTab === 'pdfs' ? note.type === 'pdf' :
                      activeTab === 'ppts' ? note.type === 'ppt' :
                      activeTab === 'scans' ? note.type === 'scan' :
                      activeTab === 'ai' ? note.type === 'ai' : true;
    
    const matchesSearch = searchQuery === '' || 
                         note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesTab && matchesSearch;
  });

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setTabs(prevTabs => 
      prevTabs.map(tab => ({
        ...tab,
        active: tab.id === tabId
      }))
    );
  };

  const handleSubjectChange = (subjectId) => {
    setActiveSubject(subjectId);
    setSubjects(prevSubjects => 
      prevSubjects.map(subject => ({
        ...subject,
        active: subject.id === subjectId
      }))
    );
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  return {
    notes: filteredNotes,
    subjects,
    tabs,
    activeTab,
    activeSubject,
    searchQuery,
    loading,
    error,
    handleTabChange,
    handleSubjectChange,
    handleSearch,
    refreshData: fetchNotesData,
  };
};
