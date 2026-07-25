import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [userData, setUserData] = useState({ userId: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/form" replace />;
  }

  const handleChange = (e) => {
    const { id, value } = e.target;
    setUserData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      login(userData.userId);
      navigate('/form');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto">
        <div className="ml-card overflow-hidden grid md:grid-cols-2">
          <div className="p-8 md:p-10 flex flex-col justify-center">
            <p className="text-sm font-medium text-medilink-600 mb-2">Welcome back</p>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Sign in to MediLink</h1>
            <p className="text-slate-500 mb-8">
              Enter your kiosk ID to access the patient consultation.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="ml-label" htmlFor="userId">User ID</label>
                <input
                  type="text"
                  id="userId"
                  className="ml-input"
                  placeholder="Enter your user ID"
                  value={userData.userId}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="ml-label" htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  className="ml-input"
                  placeholder="Enter your password (optional for demo)"
                  value={userData.password}
                  onChange={handleChange}
                />
              </div>
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
                  {error}
                </div>
              )}
              <button type="submit" className="ml-btn-primary w-full mt-2" disabled={loading}>
                {loading ? 'Signing in...' : 'Continue to consultation'}
              </button>
            </form>
          </div>

          <div className="hidden md:flex bg-gradient-to-br from-medilink-600 to-medilink-800 p-10 items-center justify-center relative overflow-hidden">
            <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10" />
            <div className="absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-white/5" />
            <div className="relative text-center text-white">
              <img
                src="/login.jpg"
                alt="Healthcare"
                className="rounded-2xl shadow-card mb-6 max-h-48 object-cover mx-auto border border-white/20"
              />
              <h2 className="text-xl font-semibold mb-2">Care that reaches everyone</h2>
              <p className="text-blue-100 text-sm leading-relaxed max-w-xs mx-auto">
                Preliminary assessments and follow-up guidance, built for remote communities.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Login;
