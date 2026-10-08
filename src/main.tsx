import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AdminPortal from './components/AdminPortal.tsx';
// Self-hosted (bundled, not a runtime Google Fonts request) so Inter
// reliably applies everywhere - an external font link can silently fail to
// load depending on the network/CSP, which left some text falling back to
// the system font instead.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
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
