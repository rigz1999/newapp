import { toast } from './toast';
import { logger } from '../utils/logger';

export const copyToClipboard = async (text: string, successMessage: string = 'Copié!') => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch (err) {
    logger.error('Failed to copy:', err);
    toast.error('Impossible de copier');
  }
};
