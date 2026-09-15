import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SearchProvider } from './store/searchStore';
import { GuideProvider } from './context/GuideContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SearchProvider>
      <GuideProvider>
        <App />
      </GuideProvider>
    </SearchProvider>
  </React.StrictMode>
);

