import { useHotkeys } from 'react-hotkeys-hook';
import { useNavigate } from 'react-router-dom';
import { showToast } from '../components/Toast';

interface UseKeyboardShortcutsProps {
  onSearch?: () => void;
  onToggleTheme?: () => void;
  onClearResults?: () => void;
}

export const useKeyboardShortcuts = ({
  onSearch,
  onToggleTheme,
  onClearResults,
}: UseKeyboardShortcutsProps = {}) => {
  const navigate = useNavigate();

  // Navigation shortcuts
  useHotkeys('ctrl+1', () => {
    navigate('/');
    showToast.info('Navigated to Home');
  }, { preventDefault: true });

  useHotkeys('ctrl+2', () => {
    navigate('/search');
    showToast.info('Navigated to Search');
  }, { preventDefault: true });

  useHotkeys('ctrl+3', () => {
    navigate('/history');
    showToast.info('Navigated to History');
  }, { preventDefault: true });

  // Search shortcut
  useHotkeys('ctrl+k', () => {
    if (onSearch) {
      onSearch();
    } else {
      navigate('/search');
      showToast.info('Search activated');
    }
  }, { preventDefault: true });

  // Theme toggle
  useHotkeys('ctrl+shift+t', () => {
    if (onToggleTheme) {
      onToggleTheme();
      showToast.info('Theme toggled');
    }
  }, { preventDefault: true });

  // Clear results
  useHotkeys('ctrl+shift+c', () => {
    if (onClearResults) {
      onClearResults();
      showToast.info('Results cleared');
    }
  }, { preventDefault: true });

  // Help shortcut
  useHotkeys('ctrl+shift+h', () => {
    showToast.info('Keyboard shortcuts: Ctrl+1-3 (Navigate), Ctrl+K (Search), Ctrl+Shift+T (Theme), Ctrl+Shift+C (Clear)');
  }, { preventDefault: true });

  return {
    shortcuts: [
      { key: 'Ctrl + 1', description: 'Go to Home' },
      { key: 'Ctrl + 2', description: 'Go to Search' },
      { key: 'Ctrl + 3', description: 'Go to History' },
      { key: 'Ctrl + K', description: 'Quick Search' },
      { key: 'Ctrl + Shift + T', description: 'Toggle Theme' },
      { key: 'Ctrl + Shift + C', description: 'Clear Results' },
      { key: 'Ctrl + Shift + H', description: 'Show Help' },
    ],
  };
};
