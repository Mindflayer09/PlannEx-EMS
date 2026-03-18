import api from '../axios';

export const getAllUsers = async (params = {}) => {
  try {
    const response = await api.get('/users', { params });
    console.log("RAW AXIOS RESPONSE:", response);
    return response.data || response; 
  } catch (error) {
    console.error("User Service Error (getAllUsers):", error.response?.data || error.message);
    throw error;
  }
};

export const getUserById = async (id) => {
  try {
    const response = await api.get(`/users/${id}`);
    return response.data || response;
  } catch (error) {
    console.error("User Service Error (getUserById):", error.response?.data || error.message);
    throw error;
  }
};

export const approveUser = async (userId) => {
  try {
    const response = await api.patch(`/users/${userId}/approve`);
    return response.data || response;
  } catch (error) {
    console.error("User Service Error (approveUser):", error.response?.data || error.message);
    throw error;
  }
};

export const updateUserRole = async (id, data) => {
  try {
    const response = await api.patch(`/users/${id}/role`, data);
    return response.data || response;
  } catch (error) {
    console.error("User Service Error (updateUserRole):", error.response?.data || error.message);
    throw error;
  }
};

export const updateUser = async (id, data) => {
  try {
    const response = await api.put(`/users/${id}`, data);
    return response.data || response;
  } catch (error) {
    console.error("User Service Error (updateUser):", error.response?.data || error.message);
    throw error;
  }
};

export const deleteUser = async (id) => {
  try {
    const response = await api.delete(`/users/${id}`);
    return response.data || response;
  } catch (error) {
    console.error("User Service Error (deleteUser):", error.response?.data || error.message);
    throw error;
  }
};