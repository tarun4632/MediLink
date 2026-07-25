import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import { useAuth } from '../context/AuthContext';

const Signup = () => {
  const [formData, setFormData] = useState({ username: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signup, isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/form" replace />;
  }

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await signup(formData.username, formData.password);
      navigate('/form');
    } catch (err) {
      setError(err.response?.data?.error || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <div className="max-w-md mx-auto">
        <div className="ml-card p-8 md:p-10">
          <p className="text-sm font-medium text-medilink-600 mb-2">Get started</p>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Create account</h1>
          <p className="text-slate-500 mb-8">
            Register to save consultations and access your medical history.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="ml-label" htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                className="ml-input"
                placeholder="3-32 characters, letters/numbers/_"
                value={formData.username}
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
                placeholder="At least 8 characters"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="ml-label" htmlFor="confirmPassword">Confirm password</label>
              <input
                type="password"
                id="confirmPassword"
                className="ml-input"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
                {error}
              </div>
            )}
            <button type="submit" className="ml-btn-primary w-full mt-2" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-500 text-center">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-medilink-600 hover:text-medilink-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </PageLayout>
  );
};

export default Signup;
