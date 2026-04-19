export const EDITOR_TABS = [
    { id: 'text', label: 'Text Notes', icon: 'edit-note', active: true },
    { id: 'upload', label: 'Upload File', icon: 'cloud-upload', active: false },
    { id: 'links', label: 'External Links', icon: 'link', active: false },
];

export const EDITOR_ACTIONS = [
    { id: 'bold', icon: 'format-bold' },
    { id: 'italic', icon: 'format-italic' },
    { id: 'list', icon: 'format-list-bulleted' },
    { id: 'quote', icon: 'format-quote' },
    { id: 'divider', type: 'divider' },
    { id: 'image', icon: 'image' },
    { id: 'code', icon: 'code' },
];

export const QUICK_ASSETS = [
    {
        id: 'asset-1',
        type: 'pdf',
        icon: 'picture-as-pdf',
        iconColor: '#0050d4',
        name: 'syllabus_art_101.pdf',
        size: '2.4 MB',
    },
    {
        id: 'asset-2',
        type: 'video',
        icon: 'videocam',
        iconColor: '#702ae1',
        name: 'florence_vlog.mp4',
        size: '45.2 MB',
    },
];

export const HEADER = {
    title: 'Lecture Editor',
};
