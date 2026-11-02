import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

export default function App() {
  const { user } = useContext(AuthContext);

  // If no user is authenticated, render Login page
  if (!user) {
    return <Login />;
  }

  // Once authenticated, render Dashboard
  return <Dashboard />;
}