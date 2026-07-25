import { useCallback, useState } from 'react';
import api from '../api/client';
import PageLayout from '../components/PageLayout';
import AssessmentReport from '../components/AssessmentReport';
import ChatPanel from '../components/ChatPanel';
import ConsultationHistory from '../components/ConsultationHistory';
import { useAuth } from '../context/AuthContext';

const INITIAL_FORM_DATA = {
  name: '',
  gender: '',
  age: '',
  height: '',
  weight: '',
  bp: '',
  symptom_duration: '',
  allergies: '',
  current_medications: '',
  existing_conditions: '',
  symptoms: '',
};

const FormPage = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [sessionId, setSessionId] = useState('');
  const [assessment, setAssessment] = useState(null);
  const [emergency, setEmergency] = useState(false);
  const [matchedKeywords, setMatchedKeywords] = useState([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

  const resetConsultation = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setSessionId('');
    setAssessment(null);
    setEmergency(false);
    setMatchedKeywords([]);
    setDisclaimer('');
    setChatMessages([]);
    setError('');
    setSubmitted(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSubmitted(false);
    setSessionId('');
    setAssessment(null);
    setChatMessages([]);

    try {
      const response = await api.post('/assessment', formData);
      setSessionId(response.data.session_id);
      setAssessment(response.data.assessment);
      setEmergency(response.data.emergency);
      setMatchedKeywords(response.data.matched_keywords || []);
      setDisclaimer(response.data.disclaimer || '');
      setChatMessages(response.data.chat_messages || []);
      setSubmitted(true);
      setHistoryKey((k) => k + 1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate assessment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resumeConsultation = async (resumeSessionId) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/history/${resumeSessionId}`);
      const data = response.data;
      if (!data.active) {
        setError('This consultation has expired. Start a new one or view it in history.');
        return;
      }
      setSessionId(data.session_id);
      setFormData({
        name: data.patient_data?.name || '',
        gender: data.patient_data?.gender || '',
        age: data.patient_data?.age || '',
        height: data.patient_data?.height || '',
        weight: data.patient_data?.weight || '',
        bp: data.patient_data?.bp || '',
        symptom_duration: data.patient_data?.symptom_duration || '',
        allergies: data.patient_data?.allergies || '',
        current_medications: data.patient_data?.current_medications || '',
        existing_conditions: data.patient_data?.existing_conditions || '',
        symptoms: data.patient_data?.symptoms || '',
      });
      setAssessment(data.assessment);
      setEmergency(data.assessment?.severity === 'emergency');
      setMatchedKeywords([]);
      setDisclaimer(data.disclaimer || '');
      setChatMessages(data.messages || []);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.error || 'Could not resume this consultation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="ml-section-title">Patient Consultation</h1>
          <p className="ml-section-subtitle">Tell us about yourself and your symptoms to begin.</p>
        </div>

        <div className="ml-card p-6 md:p-8">
          <ConsultationHistory
            key={historyKey}
            onStartNew={resetConsultation}
            onResume={resumeConsultation}
          />

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="ml-label" htmlFor="name">Name</label>
                <input className="ml-input" type="text" id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Your name" />
              </div>
              <div>
                <label className="ml-label" htmlFor="gender">Gender</label>
                <select className="ml-input" id="gender" name="gender" value={formData.gender} onChange={handleChange} required>
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="ml-label" htmlFor="age">Age</label>
                <input className="ml-input" type="number" id="age" name="age" value={formData.age} onChange={handleChange} required placeholder="Years" />
              </div>
              <div>
                <label className="ml-label" htmlFor="height">Height (cm)</label>
                <input className="ml-input" type="number" id="height" name="height" value={formData.height} onChange={handleChange} required placeholder="cm" />
              </div>
              <div>
                <label className="ml-label" htmlFor="weight">Weight (kg)</label>
                <input className="ml-input" type="number" id="weight" name="weight" value={formData.weight} onChange={handleChange} required placeholder="kg" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="ml-label" htmlFor="bp">Blood pressure</label>
                <input className="ml-input" type="text" id="bp" name="bp" value={formData.bp} onChange={handleChange} required placeholder="e.g. 120/80" />
              </div>
              <div>
                <label className="ml-label" htmlFor="symptom_duration">Symptom duration</label>
                <input className="ml-input" type="text" id="symptom_duration" name="symptom_duration" value={formData.symptom_duration} onChange={handleChange} placeholder="e.g. 2 days" />
              </div>
            </div>

            <div>
              <label className="ml-label" htmlFor="allergies">Allergies</label>
              <input className="ml-input" type="text" id="allergies" name="allergies" value={formData.allergies} onChange={handleChange} placeholder="None or list allergies" />
            </div>

            <div>
              <label className="ml-label" htmlFor="current_medications">Current medications</label>
              <input className="ml-input" type="text" id="current_medications" name="current_medications" value={formData.current_medications} onChange={handleChange} placeholder="None or list medications" />
            </div>

            <div>
              <label className="ml-label" htmlFor="existing_conditions">Existing conditions</label>
              <input className="ml-input" type="text" id="existing_conditions" name="existing_conditions" value={formData.existing_conditions} onChange={handleChange} placeholder="e.g. diabetes, asthma" />
            </div>

            <div>
              <label className="ml-label" htmlFor="symptoms">Symptoms</label>
              <textarea
                className="ml-input resize-none"
                id="symptoms"
                name="symptoms"
                value={formData.symptoms}
                onChange={handleChange}
                required
                placeholder="Describe what you're experiencing..."
                rows="4"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <button className="ml-btn-primary flex-1" type="submit" disabled={loading}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating assessment...
                  </span>
                ) : (
                  'Start consultation'
                )}
              </button>
              {submitted && (
                <button type="button" className="ml-btn-secondary flex-1" onClick={resetConsultation}>
                  New consultation
                </button>
              )}
            </div>
          </form>

          {submitted && assessment && (
            <>
              <AssessmentReport
                assessment={assessment}
                emergency={emergency}
                matchedKeywords={matchedKeywords}
                disclaimer={disclaimer}
              />
              {sessionId && (
                <ChatPanel
                  key={sessionId}
                  sessionId={sessionId}
                  authToken={user?.token}
                  initialMessages={chatMessages}
                />
              )}
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default FormPage;
