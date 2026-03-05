import axios from '../axios';

/**
 * Trigger the backend to generate an AI report using Gemini 1.5 Flash
 * @param {string} eventId - The ID of the finalized event
 */
export const generateEventReport = async (eventId) => {
  const response = await axios.post(`/events/${eventId}/generate-report`);
  return response;
};

/**
 * Fetch a specific report for a single event
 * @param {string} eventId - The ID of the event
 */
export const getEventReport = async (eventId) => {
  const response = await axios.get(`/events/${eventId}/report`);
  return response;
};

/**
 * Fetch all public reports for the public-facing portal
 * @param {Object} filters - Optional filters (e.g., clubId, page, limit)
 */
export const getPublicReports = async (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  const response = await axios.get(`/reports/public?${params}`);
  return response;
};

/**
 * Delete a report (Admin only)
 * @param {string} reportId - The ID of the report to delete
 */
export const deleteReport = async (reportId) => {
  const response = await axios.delete(`/reports/${reportId}`);
  return response;
};

/**
 * Update/Edit an existing AI report manually (Admin only)
 * @param {string} reportId - The ID of the report
 * @param {Object} data - The updated report data (e.g., { content: "Updated markdown text" })
 */
export const updateReport = async (reportId, data) => {
  const response = await axios.put(`/reports/${reportId}`, data);
  return response;
};