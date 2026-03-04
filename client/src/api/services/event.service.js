import api from '../axios';

export const getAllEvents = (params) => api.get('/events', { params });
export const getPublicEvents = (params) => api.get('/events/public', { params });
export const getEventById = (id) => api.get(`/events/${id}`);
export const createEvent = (data) => api.post('/events', data);
export const updateEvent = (id, data) => api.put(`/events/${id}`, data);
export const deleteEvent = (id) => api.delete(`/events/${id}`);
export const changeEventPhase = (id, data) => api.patch(`/events/${id}/phase`, data);
export const finalizeEvent = (id) => api.patch(`/events/${id}/finalize`);
export const addEventMedia = (id, data) => api.post(`/events/${id}/media`, data);

export const generateEventReport = async (eventId) => {
  const response = await api.post(`/events/${eventId}/generate-report`);
  return response.data;
};