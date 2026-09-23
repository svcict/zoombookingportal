import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AdminPortal from './components/AdminPortal.tsx';
import './index.css';

// /admin is a completely separate page from the regular staff booking app,
// not a tab within it - picked here, before either mounts, so the two never
// share component state or a page shell.
const isAdminPortal = window.location.pathname === '/admin';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdminPortal ? <AdminPortal /> : <App />}
  </StrictMode>,
);
