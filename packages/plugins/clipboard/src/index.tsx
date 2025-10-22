import type { Plugin, SearchQuery, SearchResult } from '@nixed/sdk';
import { clipboard, ui } from '@nixed/sdk';
import { ClipboardMonitor } from './services/clipboard-monitor';

// Plugin instance
let monitor: ClipboardMonitor | null = null;

const ClipboardPlugin: Plugin = {
  manifest: require('../package.json').nixed,

  onLoad: async () => {
    monitor = new ClipboardMonitor(100, 1000);
    await monitor.start();
    console.log('Clipboard plugin loaded');
  },

  onUnload: () => {
    if (monitor) {
      monitor.stop();
    }
    console.log('Clipboard plugin unloaded');
  },

  onSearch: (query: SearchQuery): SearchResult[] => {
    if (!monitor) {
      return [];
    }

    // Search history
    const items = monitor.search(query.text);

    // Convert to search results
    return items.map((item) => ({
      id: item.id,
      title: item.preview,
      subtitle: formatTimestamp(item.timestamp),
      icon: '📋',
      accessories: [
        {
          text: `${item.content.length} chars`,
        },
      ],
      onAction: async () => {
        // Paste item
        await clipboard.write(item.content);
        ui.showToast('Copied to clipboard', 'success');
        await ui.close();
      },
      actions: [
        {
          id: 'copy',
          title: 'Copy',
          icon: '📋',
          shortcut: 'Enter',
          onAction: async () => {
            await clipboard.write(item.content);
            ui.showToast('Copied to clipboard', 'success');
          },
        },
        {
          id: 'delete',
          title: 'Delete from History',
          icon: '🗑️',
          onAction: () => {
            ui.showToast('Delete not yet implemented', 'info');
          },
        },
      ],
    }));
  },
};

/**
 * Format timestamp for display
 */
function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffMins < 1440) {
    const hours = Math.floor(diffMins / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffMins / 1440);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
}

export default ClipboardPlugin;
