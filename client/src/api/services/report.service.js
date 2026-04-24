import api from '../axios'; // Using your custom instance 'api' for consistent headers

/**
 * 🤖 AI GENERATION
 * Trigger the backend to generate an AI report using Gemini 1.5 Flash
 */
export const generateEventReport = (eventId, formData) => {
  return api.post(`/events/${eventId}/generate-report`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

/**
 * 🎨 MEDIA CATALOG
 * Fetch all media from approved task submissions for report photo selection
 */
export const getMediaCatalog = (eventId) => {
  console.log(`[REPORT SERVICE] Fetching media catalog for event: ${eventId}`);
  return api.get(`/events/${eventId}/media-catalog`);
};

/**
 * 📱 SOCIAL MEDIA CONTENT GENERATION
 * Generate social media optimized content from selected photos and custom prompt
 */
export const generateSocialMediaContent = (eventId, data) => {
  // 🚀 THE FIX: Pointing to the new XML controller route!
  return api.post(`/reports/event/${eventId}/generate`, data);
};

/**
 * 📊 REPORT FETCHING
 * Fetch a specific report for a single event
 */
export const getEventReport = (eventId) => {
  return api.get(`/events/${eventId}/report`);
};

/**
 * 🌎 PUBLIC PORTAL
 * Fetch all public reports/finalized events for the public-facing portal
 * Note: axios automatically converts the 'params' object to a query string
 */
export const getPublicReports = (filters = {}) => {
  return api.get('/reports/public', { params: filters });
};

/**
 * 🗑️ DELETION (Staff Only)
 */
export const deleteReport = (reportId) => {
  // 🚀 BONUS FIX: Changed from api.get to api.delete
  return api.delete(`/reports/${reportId}`); 
};

/**
 * 📝 MANUAL OVERRIDE (Staff Only)
 * Update/Edit an existing AI report manually
 */
export const updateReport = (reportId, data) => {
  return api.put(`/reports/${reportId}`, data);
};