import api from './config';

export const getMyMatches = async () => {
  const response = await api.get('/matches/my-matches');
  return response.data;
};

export const getPotentialMatches = async () => {
  const response = await api.get('/matches');
  return response.data;
};

export const getTopPicks = async () => {
  const response = await api.get('/matches/top-picks');
  return response.data;
};

export const recordInteraction = async (targetId, action) => {
  const response = await api.post('/matches/interaction', {
    targetId,
    action
  });
  return response.data;
};

export const respondToMatch = async (matchId, action) => {
  const response = await api.post(`/matches/${matchId}/respond`, {
    action
  });
  return response.data;
};
