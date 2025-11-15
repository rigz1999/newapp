import { toast } from './toast';

export const copyToClipboard = async (text: string, successMessage: string = 'Copié!') => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch (err) {
    console.error('Failed to copy:', err);
    toast.error('Impossible de copier');
  }
};
