import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AppProvider, ToastProvider } from './context/AppContext.jsx'

// Strictly enforce global application title as "Eduzenta"
document.title = 'Eduzenta';

// Enforce title lock across component lifecycles
try {
  const target = document.querySelector('title');
  if (target) {
    const observer = new MutationObserver(() => {
      if (document.title !== 'Eduzenta') {
        document.title = 'Eduzenta';
      }
    });
    observer.observe(target, { childList: true, characterData: true, subtree: true });
  }
} catch (e) {
  // Silent fallback
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AppProvider>
  </React.StrictMode>,
)
