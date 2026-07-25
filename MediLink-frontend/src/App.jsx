import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import Form from './pages/Form';
import Result from './pages/Result';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/form"
            element={(
              <ProtectedRoute>
                <Form />
              </ProtectedRoute>
            )}
          />
          <Route path="/result" element={<Result />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
