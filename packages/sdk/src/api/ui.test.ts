import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ui } from './ui';
import * as ipc from '../internal/ipc';

vi.mock('../internal/ipc');

// Mock window object
const mockWindow = {
  dispatchEvent: vi.fn(),
};

describe('ui API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error - Mocking global window
    global.window = mockWindow;
  });

  afterEach(() => {
    // @ts-expect-error - Cleaning up mock
    delete global.window;
  });

  describe('showToast', () => {
    it('should dispatch toast event with default type', () => {
      const message = 'Test message';

      ui.showToast(message);

      expect(mockWindow.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'nixed:toast',
          detail: { message, type: 'info' },
        })
      );
    });

    it('should dispatch toast event with success type', () => {
      const message = 'Success message';

      ui.showToast(message, 'success');

      expect(mockWindow.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'nixed:toast',
          detail: { message, type: 'success' },
        })
      );
    });

    it('should dispatch toast event with error type', () => {
      const message = 'Error message';

      ui.showToast(message, 'error');

      expect(mockWindow.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'nixed:toast',
          detail: { message, type: 'error' },
        })
      );
    });

    it('should dispatch toast event with warning type', () => {
      const message = 'Warning message';

      ui.showToast(message, 'warning');

      expect(mockWindow.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'nixed:toast',
          detail: { message, type: 'warning' },
        })
      );
    });

    it('should handle empty message', () => {
      ui.showToast('');

      expect(mockWindow.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'nixed:toast',
          detail: { message: '', type: 'info' },
        })
      );
    });
  });

  describe('close', () => {
    it('should invoke hide_window command', async () => {
      vi.mocked(ipc.invoke).mockResolvedValue(undefined);

      await ui.close();

      expect(ipc.invoke).toHaveBeenCalledWith('hide_window');
    });

    it('should handle errors from IPC', async () => {
      const error = new Error('Failed to close window');
      vi.mocked(ipc.invoke).mockRejectedValue(error);

      await expect(ui.close()).rejects.toThrow();
      expect(ipc.invoke).toHaveBeenCalledWith('hide_window');
    });
  });

  describe('show', () => {
    it('should invoke show_window command', async () => {
      vi.mocked(ipc.invoke).mockResolvedValue(undefined);

      await ui.show();

      expect(ipc.invoke).toHaveBeenCalledWith('show_window');
    });

    it('should handle errors from IPC', async () => {
      const error = new Error('Failed to show window');
      vi.mocked(ipc.invoke).mockRejectedValue(error);

      await expect(ui.show()).rejects.toThrow();
      expect(ipc.invoke).toHaveBeenCalledWith('show_window');
    });
  });
});
