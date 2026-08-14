import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Landing } from './Landing';
import { Editor } from './Editor';
import './app.css';

function App() {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const f = () => setPath(location.pathname);
    addEventListener('popstate', f);
    return () => removeEventListener('popstate', f);
  }, []);
  const nav = (p: string) => {
    history.pushState({}, '', p);
    setPath(p);
    scrollTo(0, 0);
  };
  return path.startsWith('/app') ? <Editor nav={nav} /> : <Landing nav={nav} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
