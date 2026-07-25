import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-xl bg-medilink-600 flex items-center justify-center shadow-soft overflow-hidden">
            <img src="/logo.jpg" alt="MediLink" className="h-full w-full object-cover" />
          </div>
          <span className="text-lg font-bold text-slate-900 group-hover:text-medilink-700 transition">
            MediLink
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <span className="hidden sm:inline text-sm text-slate-500">
                Signed in as{' '}
                <span className="font-semibold text-medilink-700">{user.userId}</span>
              </span>
              <Link to="/form" className="ml-btn-secondary text-sm py-2 px-4">
                Consultation
              </Link>
              <button type="button" onClick={handleLogout} className="text-sm font-medium text-slate-500 hover:text-red-600 transition">
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="ml-btn-secondary text-sm py-2 px-4">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
