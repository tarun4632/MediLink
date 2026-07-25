import { useEffect, useState } from 'react';
import api, { getApiUrl } from '../api/client';
import AssessmentReport from './AssessmentReport';

const ConsultationHistory = ({ onStartNew, onResume }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const loadHistory = async () => {
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
        setError(
          `Cannot reach the API at ${getApiUrl()}. Set VITE_API_URL in Vercel to your Render URL and redeploy.`,
        );
      } else {
        setError('Could not load consultation history.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const viewConsultation = async (sessionId) => {
    setViewLoading(true);
    setError('');
    try {
      const response = await api.get(`/history/${sessionId}`);
      setSelected(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load this consultation.');
    } finally {
      setViewLoading(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleString();
  };

  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Your consultations</h2>
          <p className="text-sm text-slate-500">Saved consultations linked to your account.</p>
        </div>
        <button type="button" onClick={onStartNew} className="ml-btn-primary text-sm py-2 px-4">
          New consultation
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading history...</p>}
      {error && (
        <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && history.length === 0 && (
        <p className="text-sm text-slate-500 p-4 rounded-xl bg-slate-50 border border-slate-100">
          No past consultations yet. Start your first one below.
        </p>
      )}

      {history.length > 0 && (
        <div className="space-y-2 mb-4">
          {history.map((item) => (
            <div
              key={item.session_id}
              className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 bg-white"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-900 truncate">
                  {item.patient_name || 'Consultation'}
                  <span className="ml-2 text-xs font-semibold uppercase text-medilink-600">
                    {item.severity}
                  </span>
                </p>
                <p className="text-xs text-slate-500">{formatDate(item.created_at)}</p>
                <p className="text-sm text-slate-600 truncate">{item.symptoms_preview}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="ml-btn-secondary text-xs py-1.5 px-3"
                  onClick={() => viewConsultation(item.session_id)}
                >
                  View
                </button>
                {item.active && (
                  <button
                    type="button"
                    className="ml-btn-primary text-xs py-1.5 px-3"
                    onClick={() => onResume(item.session_id)}
                  >
                    Resume chat
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewLoading && <p className="text-sm text-slate-500">Loading consultation...</p>}

      {selected && !viewLoading && (
        <div className="p-4 rounded-2xl border border-medilink-100 bg-medilink-50/50">
          <div className="flex justify-between items-start gap-2 mb-4">
            <div>
              <h3 className="font-semibold text-slate-900">Past consultation</h3>
              <p className="text-xs text-slate-500">{formatDate(selected.created_at)}</p>
            </div>
            <button
              type="button"
              className="text-sm text-slate-500 hover:text-slate-700"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
          <AssessmentReport
            assessment={selected.assessment}
            emergency={selected.assessment?.severity === 'emergency'}
            matchedKeywords={[]}
            disclaimer={selected.disclaimer}
          />
          {selected.messages?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-medilink-100">
              <h4 className="text-sm font-semibold text-slate-800 mb-2">Chat history</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selected.messages.map((msg, index) => (
                  <div
                    key={`${msg.role}-${index}`}
                    className={`text-sm p-2 rounded-lg ${
                      msg.role === 'user' ? 'bg-medilink-100 ml-8' : 'bg-white border mr-8'
                    }`}
                  >
                    {msg.content}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConsultationHistory;
