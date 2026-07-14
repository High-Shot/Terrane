import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '../lib/api';

// Manages the current client's saved designs (guest via client_id or user via cookie).
export default function useDesigns(clientId, user) {
  const [designs, setDesigns] = useState([]);

  const loadDesigns = useCallback(() => {
    api.get('/designs', { params: { client_id: clientId } })
      .then((r) => setDesigns(r.data))
      .catch((error) => console.error('Failed to load designs:', error));
  }, [clientId]);

  // Reload when auth state changes (guest -> user or logout).
  useEffect(() => { loadDesigns(); }, [loadDesigns, user]);

  const saveDesign = useCallback(async (design) => {
    try {
      await api.post('/designs', design);
      toast.success('Design saved', { description: 'Find it under My Designs.' });
      loadDesigns();
    } catch (error) {
      console.error('Failed to save design:', error);
      toast.error('Could not save design');
    }
  }, [loadDesigns]);

  const deleteDesign = useCallback(async (id) => {
    try {
      await api.delete(`/designs/${id}`);
      setDesigns((d) => d.filter((x) => x.id !== id));
    } catch (error) {
      console.error('Failed to delete design:', error);
      toast.error('Could not delete');
    }
  }, []);

  return { designs, loadDesigns, saveDesign, deleteDesign };
}
