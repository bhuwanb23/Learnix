import { useState, useEffect } from 'react';
import { mockEvents, mockGroups } from '../constants/eventData';

export const useEvents = () => {
  const [events, setEvents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('today');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setEvents(mockEvents);
        setGroups(mockGroups);
        setError(null);
      } catch (err) {
        setError('Failed to fetch events');
        console.error('Error fetching events:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const getFilteredEvents = () => {
    if (!events || events.length === 0) return [];

    switch (activeFilter) {
      case 'today':
        return events.filter(event => {
          const today = new Date();
          const eventDate = new Date(event.date);
          return eventDate.toDateString() === today.toDateString();
        });
      case 'online':
        return events.filter(event => event.type === 'online');
      case 'tech':
        return events.filter(event => event.category === 'tech');
      case 'design':
        return events.filter(event => event.category === 'design');
      default:
        return events;
    }
  };

  const joinEvent = async (eventId) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setEvents(prevEvents =>
        prevEvents.map(event =>
          event.id === eventId
            ? { ...event, attendees: event.attendees + 1 }
            : event
        )
      );
      
      return true;
    } catch (error) {
      console.error('Error joining event:', error);
      return false;
    }
  };

  const joinGroup = async (groupId) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setGroups(prevGroups =>
        prevGroups.map(group =>
          group.id === groupId
            ? { ...group, members: group.members + 1 }
            : group
        )
      );
      
      return true;
    } catch (error) {
      console.error('Error joining group:', error);
      return false;
    }
  };

  const getEventById = (eventId) => {
    return events.find(event => event.id === eventId);
  };

  const getGroupById = (groupId) => {
    return groups.find(group => group.id === groupId);
  };

  const getUpcomingEvents = () => {
    const now = new Date();
    return events.filter(event => new Date(event.date) > now);
  };

  const getLiveEvents = () => {
    return events.filter(event => event.isLive);
  };

  return {
    events: getFilteredEvents(),
    allEvents: events,
    groups,
    loading,
    error,
    activeFilter,
    setActiveFilter,
    joinEvent,
    joinGroup,
    getEventById,
    getGroupById,
    getUpcomingEvents,
    getLiveEvents,
  };
};
