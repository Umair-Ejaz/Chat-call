import process from 'process';

window.process = process;

import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './context/AuthProvider';
import { SocketProvider } from './context/SocketProvider';

ReactDOM.createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <SocketProvider>
      <App />
    </SocketProvider>
  </AuthProvider>
);