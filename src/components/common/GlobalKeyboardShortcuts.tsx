// DISABLED - Global keyboard shortcuts
// This component is currently disabled per user request
// To re-enable, uncomment the code below and add <GlobalKeyboardShortcuts /> to your App component

interface GlobalKeyboardShortcutsProps {
  onSearch?: () => void;
}

export function GlobalKeyboardShortcuts({ onSearch: _onSearch }: GlobalKeyboardShortcutsProps) {
  // Disabled - no functionality
  return null;
}

/* DISABLED CODE - Uncomment to re-enable

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../../utils/toast';

export function GlobalKeyboardShortcuts({ onSearch }: GlobalKeyboardShortcutsProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K - Search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (onSearch) {
          onSearch();
        } else {
          toast.info('Recherche globale (à implémenter)');
        }
      }

      // Ctrl+B or Cmd+B - Go to Dashboard
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        navigate('/');
        toast.success('Retour au dashboard');
      }

      // Ctrl+P or Cmd+P - Go to Projects
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        navigate('/projets');
      }

      // Ctrl+I or Cmd+I - Go to Investors
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        navigate('/investisseurs');
      }

      // Show help modal with Ctrl+/ or Cmd+/
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        toast.info(
          'Raccourcis:\n' +
          'Ctrl+K - Recherche\n' +
          'Ctrl+B - Dashboard\n' +
          'Ctrl+P - Projets\n' +
          'Ctrl+I - Investisseurs\n' +
          'ESC - Fermer',
          { duration: 6000 }
        );
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate, onSearch]);

  return null;
}
*/
