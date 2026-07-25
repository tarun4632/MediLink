import { useEffect, useState } from 'react';
import api, { getApiUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';

const ConsultationHistory = ({ onStartNew, onResume, onView, refreshKey, activeSessionId }) => {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHistory = async () => {
    if (!user?.token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/history');
      setHistory(response.data.history || []);
    } catch (err) {
      const apiMessage = err.response?.data?.error;
      if (apiMessage) {
        setError(apiMessage);
      } else if (!err.response) {
        setError(`Cannot reach the API at ${getApiUrl()}.`);
      } else {
        setError('Could not load consultation history.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [user?.token, refreshKey]);

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const severityColor = (severity) => {
    const map = {
      mild: 'bg-emerald-50 text-emerald-700',
      moderate: 'bg-amber-50 text-amber-700',
      severe: 'bg-orange-50 text-orange-700',
      emergency: 'bg-red-50 text-red-700',
    };
    return map[severity] || 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="ml-card flex flex-col max-h-[calc(100vh-6rem)] lg:max-h-[calc(100vh-7rem)] overflow-hidden">
      <div className="shrink-0 p-4 border-b border-slate-100">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">History</h2>
            <p className="text-xs text-slate-500">Past consultations</p>
          </div>
          <button type="button" onClick={onStartNew} className="ml-btn-primary text-xs py-1.5 px-3">
            New
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading && <p className="text-xs text-slate-500 p-2">Loading...</p>}

        {error && (
          <div className="mb-2 p-2 rounded-lg bg-red-50 border border-red-100 text-xs text-red-700">
            {error}
          </div>
        )}

        {!loading && history.length === 0 && (
          <p className="text-xs text-slate-500 p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
            No past consultations yet.
          </p>
        )}

        <div className="space-y-2">
          {history.map((item) => {
            const isActive = item.session_id === activeSessionId;
            return (
              <div
                key={item.session_id}
                className={`p-3 rounded-xl border transition ${
                  isActive
                    ? 'border-medilink-300 bg-medilink-50/50 ring-1 ring-medilink-200'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {item.patient_name || 'Consultation'}
                  </p>
                  <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${severityColor(item.severity)}`}>
                    {item.severity}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-1">{formatDate(item.created_at)}</p>
                <p className="text-xs text-slate-600 line-clamp-2 mb-2">{item.symptoms_preview}</p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    className="flex-1 text-xs py-1 px-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                    onClick={() => onView(item.session_id)}
                  >
                    View
                  </button>
                  {item.active && (
                    <button
                      type="button"
                      className="flex-1 text-xs py-1 px-2 rounded-lg bg-medilink-600 text-white hover:bg-medilink-700"
                      onClick={() => onResume(item.session_id)}
                    >
                      Resume
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ConsultationHistory;
