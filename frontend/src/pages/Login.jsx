
import { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isRegister
      ? '/api/auth/register'
      : '/api/auth/login';

    try {
      const res = await axios.post(
        `${API_URL}${endpoint}`,
        formData
      );

      login(res.data.user, res.data.token);
    } catch (err) {
      if (err.response) {
        setError(
          err.response.data?.message || 'Login or registration failed.'
        );
      } else if (err.request) {
        setError(
          'Server se connection nahi ho raha. API URL aur backend check karo.'
        );
      } else {
        setError(err.message || 'Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl"
      >
        <h2 className="text-center text-2xl font-bold text-emerald-400">
          {isRegister ? 'Register' : 'Login'}
        </h2>

        {error && (
          <p role="alert" className="text-center text-sm text-rose-500">
            {error}
          </p>
        )}

        {isRegister && (
          <input
            type="text"
            placeholder="Username"
            autoComplete="username"
            value={formData.username}
            onChange={(e) =>
              setFormData({ ...formData, username: e.target.value })
            }
            className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm focus:border-emerald-500 focus:outline-none"
            required
          />
        )}

        <input
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={formData.email}
          onChange={(e) =>
            setFormData({ ...formData, email: e.target.value })
          }
          className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm focus:border-emerald-500 focus:outline-none"
          required
        />

        <input
          type="password"
          placeholder="Password"
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm focus:border-emerald-500 focus:outline-none"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-emerald-600 p-3 text-sm font-semibold transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? 'Please wait...'
            : isRegister
              ? 'Sign Up'
              : 'Sign In'}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsRegister(!isRegister);
            setError('');
          }}
          className="w-full text-center text-xs text-slate-400 hover:text-slate-200"
        >
          {isRegister
            ? 'Already have an account? Sign In'
            : "Don't have an account? Sign Up"}
        </button>
      </form>
    </div>
  );
}
