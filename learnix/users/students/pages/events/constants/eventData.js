// Event data constants
export const EVENT_STATUS = {
  LIVE: 'live',
  UPCOMING: 'upcoming',
  PAST: 'past',
  WORKSHOP: 'workshop',
  CERTIFICATION: 'certification',
};

export const EVENT_TYPE = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  HYBRID: 'hybrid',
};

export const EVENT_CATEGORY = {
  TECH: 'tech',
  DESIGN: 'design',
  BUSINESS: 'business',
  EDUCATION: 'education',
};

export const mockEvents = [
  {
    id: '1',
    title: 'Future of Web Development',
    description: 'Exploring the latest trends in web development',
    type: EVENT_TYPE.ONLINE,
    status: EVENT_STATUS.LIVE,
    category: EVENT_CATEGORY.TECH,
    date: new Date(),
    time: '2:00 PM',
    duration: '2h 15m',
    price: 'Free',
    location: 'Online Event',
    image: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/2feab81858-ad0568a66173e677806c.png',
    attendees: 247,
    maxAttendees: null,
    tags: ['JavaScript', 'React', 'Web Development'],
    organizer: 'Tech Conference',
    isLive: true,
  },
  {
    id: '2',
    title: 'UX Design Masterclass',
    description: 'Learn advanced UX design principles and methodologies',
    type: EVENT_TYPE.OFFLINE,
    status: EVENT_STATUS.UPCOMING,
    category: EVENT_CATEGORY.DESIGN,
    date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    time: '10:00 AM',
    duration: '4 hours',
    price: '$29',
    location: 'San Francisco, CA',
    image: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/3cbd32c759-3af34e83aab8dca89a76.png',
    attendees: 12,
    maxAttendees: 25,
    tags: ['UX Design', 'User Research', 'Prototyping'],
    organizer: 'Design Academy',
    isLive: false,
  },
  {
    id: '3',
    title: 'React Development Fundamentals',
    description: 'Master React hooks, components, and state management',
    type: EVENT_TYPE.ONLINE,
    status: EVENT_STATUS.CERTIFICATION,
    category: EVENT_CATEGORY.EDUCATION,
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
    time: '9:00 AM',
    duration: '4 weeks',
    price: '$79',
    location: 'Online Course',
    image: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/certification-bg.jpg',
    attendees: 2341,
    maxAttendees: null,
    tags: ['JavaScript', 'React', 'Frontend'],
    organizer: 'Tech Institute',
    isLive: false,
    rating: 4.8,
    reviews: 156,
  },
];

export const mockGroups = [
  {
    id: '1',
    name: 'Frontend Developers',
    description: 'Share projects, get feedback, and collaborate on frontend challenges',
    members: 1234,
    onlineMembers: 23,
    category: EVENT_CATEGORY.TECH,
    icon: 'code',
    color: '#3B82F6',
    gradient: ['#3B82F6', '#8B5CF6'],
    isActive: true,
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-6.jpg',
  },
  {
    id: '2',
    name: 'UI/UX Designers',
    description: 'Design critiques, portfolio reviews, and design system discussions',
    members: 856,
    onlineMembers: 12,
    category: EVENT_CATEGORY.DESIGN,
    icon: 'palette',
    color: '#EC4899',
    gradient: ['#EC4899', '#EF4444'],
    isActive: true,
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-1.jpg',
  },
];

export const mockFilters = [
  { id: 'today', label: 'Today', icon: 'calendar', active: true },
  { id: 'online', label: 'Online', icon: 'location-dot', active: false },
  { id: 'tech', label: 'Tech', icon: 'tag', active: false },
  { id: 'design', label: 'Design', icon: 'users', active: false },
];

export const getStatusColor = (status) => {
  switch (status) {
    case EVENT_STATUS.LIVE:
      return '#EF4444'; // Red
    case EVENT_STATUS.UPCOMING:
      return '#3B82F6'; // Blue
    case EVENT_STATUS.PAST:
      return '#6B7280'; // Gray
    case EVENT_STATUS.WORKSHOP:
      return '#F59E0B'; // Orange
    case EVENT_STATUS.CERTIFICATION:
      return '#8B5CF6'; // Purple
    default:
      return '#6B7280'; // Gray
  }
};

export const getStatusText = (status) => {
  switch (status) {
    case EVENT_STATUS.LIVE:
      return 'LIVE';
    case EVENT_STATUS.UPCOMING:
      return 'Upcoming';
    case EVENT_STATUS.PAST:
      return 'Past';
    case EVENT_STATUS.WORKSHOP:
      return 'Workshop';
    case EVENT_STATUS.CERTIFICATION:
      return 'Certification';
    default:
      return 'Unknown';
  }
};

export const getPriceColor = (price) => {
  if (price === 'Free') {
    return '#10B981'; // Green
  } else if (price.includes('$')) {
    return '#3B82F6'; // Blue
  }
  return '#6B7280'; // Gray
};

export const formatDate = (date) => {
  const now = new Date();
  const eventDate = new Date(date);
  const diffTime = eventDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'Past';
  } else if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Tomorrow';
  } else {
    return `${diffDays} days left`;
  }
};

export const formatTime = (date, time) => {
  const eventDate = new Date(date);
  const [hours, minutes] = time.split(':');
  eventDate.setHours(parseInt(hours), parseInt(minutes));
  
  return eventDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};
