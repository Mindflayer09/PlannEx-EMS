import api from '../axios';

// Get all organizations (Teams) - Used by Super Admins
export const getAllTeams = async () => {
  const res = await api.get('/teams');
  console.log("TEAMS RESPONSE:", res.data);
  
  // Handling the SaaS data structure: { success: true, data: [...] }
  return res.data.data || res.data; 
};

// Get a specific team by ID
export const getTeamById = (id) => api.get(`/teams/${id}`);

// Create a new team (Registration flow)
export const createTeam = (teamData) => api.post('/teams', teamData);

// Update team status (Approve/Reject - Super Admin)
export const updateTeamStatus = (id, status) => api.patch(`/teams/${id}/status`, { status });

// PERMANENTLY DELETE a team - Super Admin
export const deleteTeam = (id) => api.delete(`/teams/${id}`);