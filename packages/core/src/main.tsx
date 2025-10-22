import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { PluginProvider } from './contexts/plugin-context';
import { defaultAppConfig } from './config/app-config';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <PluginProvider config={defaultAppConfig}>
      <App />
    </PluginProvider>
  </React.StrictMode>
);
