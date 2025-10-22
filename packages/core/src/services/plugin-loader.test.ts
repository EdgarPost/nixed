import { describe, it, expect, beforeEach } from 'vitest';
import { PluginLoader } from './plugin-loader';
import type { PluginManifest } from '@nixed/sdk';

describe('PluginLoader', () => {
  let loader: PluginLoader;

  beforeEach(() => {
    loader = new PluginLoader();
  });

  describe('validateManifest', () => {
    it('should accept valid manifest', () => {
      const manifest: PluginManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        author: 'Test Author',
        description: 'Test description',
        commands: [
          {
            name: 'test-command',
            title: 'Test Command',
            mode: 'view' as const,
          },
        ],
      };

      expect(() => loader['validateManifest'](manifest)).not.toThrow();
    });

    it('should reject manifest without id', () => {
      const manifest = {
        name: 'Test Plugin',
        version: '1.0.0',
        commands: [
          {
            name: 'test',
            title: 'Test',
            mode: 'view',
          },
        ],
      } as never;

      expect(() => loader['validateManifest'](manifest)).toThrow('must have a valid id');
    });

    it('should reject manifest without name', () => {
      const manifest = {
        id: 'test-plugin',
        version: '1.0.0',
        commands: [
          {
            name: 'test',
            title: 'Test',
            mode: 'view',
          },
        ],
      } as never;

      expect(() => loader['validateManifest'](manifest)).toThrow('must have a valid name');
    });

    it('should reject manifest without version', () => {
      const manifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        commands: [
          {
            name: 'test',
            title: 'Test',
            mode: 'view',
          },
        ],
      } as never;

      expect(() => loader['validateManifest'](manifest)).toThrow('must have a valid version');
    });

    it('should reject manifest without commands', () => {
      const manifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        commands: [],
      } as never;

      expect(() => loader['validateManifest'](manifest)).toThrow('at least one command');
    });

    it('should reject command without name', () => {
      const manifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        author: 'Test',
        description: 'Test',
        commands: [
          {
            title: 'Test',
            mode: 'view',
          },
        ],
      } as never;

      expect(() => loader['validateManifest'](manifest)).toThrow('Command must have a valid name');
    });

    it('should reject command without title', () => {
      const manifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        author: 'Test',
        description: 'Test',
        commands: [
          {
            name: 'test',
            mode: 'view',
          },
        ],
      } as never;

      expect(() => loader['validateManifest'](manifest)).toThrow('Command must have a valid title');
    });

    it('should reject command with invalid mode', () => {
      const manifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        author: 'Test',
        description: 'Test',
        commands: [
          {
            name: 'test',
            title: 'Test',
            mode: 'invalid',
          },
        ],
      } as never;

      expect(() => loader['validateManifest'](manifest)).toThrow('Command must have a valid mode');
    });
  });

  describe('validatePlugin', () => {
    it('should accept valid plugin', () => {
      const plugin = {
        manifest: {
          id: 'test',
          name: 'Test',
          version: '1.0.0',
          author: 'Test',
          description: 'Test',
          commands: [{ name: 'test', title: 'Test', mode: 'view' as const }],
        },
        onSearch: () => [],
        onLoad: () => {},
        onUnload: () => {},
      };

      expect(() => loader['validatePlugin'](plugin)).not.toThrow();
    });

    it('should accept plugin without optional methods', () => {
      const plugin = {
        manifest: {
          id: 'test',
          name: 'Test',
          version: '1.0.0',
          author: 'Test',
          description: 'Test',
          commands: [{ name: 'test', title: 'Test', mode: 'view' as const }],
        },
      };

      expect(() => loader['validatePlugin'](plugin)).not.toThrow();
    });

    it('should reject plugin with non-function onSearch', () => {
      const plugin = {
        manifest: {
          id: 'test',
          name: 'Test',
          version: '1.0.0',
          author: 'Test',
          description: 'Test',
          commands: [{ name: 'test', title: 'Test', mode: 'view' as const }],
        },
        onSearch: 'not a function',
      } as never;

      expect(() => loader['validatePlugin'](plugin)).toThrow('onSearch must be a function');
    });

    it('should reject plugin with non-function onLoad', () => {
      const plugin = {
        manifest: {
          id: 'test',
          name: 'Test',
          version: '1.0.0',
          author: 'Test',
          description: 'Test',
          commands: [{ name: 'test', title: 'Test', mode: 'view' as const }],
        },
        onLoad: 'not a function',
      } as never;

      expect(() => loader['validatePlugin'](plugin)).toThrow('onLoad must be a function');
    });

    it('should reject plugin with non-function onUnload', () => {
      const plugin = {
        manifest: {
          id: 'test',
          name: 'Test',
          version: '1.0.0',
          author: 'Test',
          description: 'Test',
          commands: [{ name: 'test', title: 'Test', mode: 'view' as const }],
        },
        onUnload: 'not a function',
      } as never;

      expect(() => loader['validatePlugin'](plugin)).toThrow('onUnload must be a function');
    });

    it('should reject plugin with non-function onCommand', () => {
      const plugin = {
        manifest: {
          id: 'test',
          name: 'Test',
          version: '1.0.0',
          author: 'Test',
          description: 'Test',
          commands: [{ name: 'test', title: 'Test', mode: 'view' as const }],
        },
        onCommand: 'not a function',
      } as never;

      expect(() => loader['validatePlugin'](plugin)).toThrow('onCommand must be a function');
    });
  });

  describe('discoverPlugins', () => {
    it('should discover plugins without throwing', async () => {
      const manifests = await loader.discoverPlugins();
      expect(Array.isArray(manifests)).toBe(true);
    });
  });
});
