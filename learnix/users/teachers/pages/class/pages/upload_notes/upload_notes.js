import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Text
} from 'react-native';
import { useUploadNotes } from './hooks/useUploadNotes';
import TabNavigation from './components/TabNavigation';
import UploadArea from './components/UploadArea';
import FileCategories from './components/FileCategories';
import AISuggestedTags from './components/AISuggestedTags';
import RecentUploads from './components/RecentUploads';
import MyNotesPage from './components/MyNotesPage';
import SharedPage from './components/SharedPage';
import UploadButton from './components/UploadButton';

export default function UploadNotes({ navigation }) {
  const {
    // State
    activeTab,
    uploadState,
    uploadProgress,
    selectedFiles,
    uploadForm,
    selectedTags,
    recentUploads,
    myNotes,
    sharedNotes,
    
    // Data
    tabs,
    subjects,
    fileTypes,
    aiSuggestedTags,
    
    // Actions
    handleTabChange,
    handleFileSelect,
    handleRemoveFile,
    handleFormChange,
    handleTagToggle,
    handleAddCustomTag,
    handleUpload,
    handleRecentUploadAction,
    handleMyNoteAction,
    handleSharedNoteAction,
    resetForm
  } = useUploadNotes();

  const handleBackPress = () => {
    console.log('Back pressed');
    if (navigation && navigation.navigate) {
      navigation.navigate('main'); // Go back to main (Classes tab)
    }
  };

  const handleFileSelection = () => {
    // In a real app, this would open a file picker
    console.log('File selection triggered');
    // For demo purposes, simulate file selection
    const mockFiles = [
      {
        name: 'Mathematics_Chapter5.pdf',
        size: 2400000, // 2.4 MB
        type: 'pdf'
      }
    ];
    handleFileSelect(mockFiles);
  };

  const handleCustomTagSubmit = () => {
    if (uploadForm.customTags.trim()) {
      handleAddCustomTag(uploadForm.customTags);
    }
  };

  const handleRefresh = () => {
    // Refresh data
    console.log('Refreshing upload notes...');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'upload':
        return (
          <>
            <UploadArea
              onFileSelect={handleFileSelection}
              uploadState={uploadState}
              uploadProgress={uploadProgress}
            />
            
            <FileCategories
              subjects={subjects}
              fileTypes={fileTypes}
              uploadForm={uploadForm}
              onFormChange={handleFormChange}
            />
            
            <AISuggestedTags
              aiSuggestedTags={aiSuggestedTags}
              selectedTags={selectedTags}
              customTags={uploadForm.customTags}
              onTagToggle={handleTagToggle}
              onAddCustomTag={handleAddCustomTag}
              onCustomTagChange={(value) => handleFormChange('customTags', value)}
            />
            
            <RecentUploads
              recentUploads={recentUploads}
              onUploadAction={handleRecentUploadAction}
            />
          </>
        );
      
      case 'myNotes':
        return (
          <MyNotesPage
            myNotes={myNotes}
            onRefresh={handleRefresh}
            refreshing={false}
            onNoteAction={handleMyNoteAction}
          />
        );
      
      case 'shared':
        return (
          <SharedPage
            sharedNotes={sharedNotes}
            onRefresh={handleRefresh}
            refreshing={false}
            onNoteAction={handleSharedNoteAction}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <TabNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabPress={handleTabChange}
      />

      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: activeTab === 'upload' ? 100 : 20 }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={handleRefresh}
            colors={["#2563EB"]}
            tintColor="#2563EB"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </ScrollView>

      {/* Bottom Upload Button */}
      {activeTab === 'upload' && (
        <UploadButton
          onUpload={handleUpload}
          uploadState={uploadState}
          disabled={selectedFiles.length === 0}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: 20
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    marginHorizontal: 16
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center'
  }
});
