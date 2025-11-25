import api from './config';

export const getConversations = async () => {
  try {
    const response = await api.get('/chat/conversations');
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};

export const getMessages = async (userId, before = null, limit = 50) => {
  try {
    const params = { limit };
    if (before) params.before = before;
    
    const response = await api.get(`/chat/messages/${userId}`, { params });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};

export const markAsRead = async (conversationId) => {
  try {
    const response = await api.post(`/chat/mark-read/${conversationId}`);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};
