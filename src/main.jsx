import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Unregister any stale service workers that may cache old React chunks
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(sw => sw.unregister());
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)