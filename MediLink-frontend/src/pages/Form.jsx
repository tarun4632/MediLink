import { useCallback, useState } from 'react';
import api from '../api/client';
import PageLayout from '../components/PageLayout';
import OutputPanel from '../components/OutputPanel';
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

const ALLOWED_REPORT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
];

const ALLOWED_REPORT_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.tif'];

const isAllowedReportFile = (file) => {
  const name = file.name.toLowerCase();
  const hasAllowedExt = ALLOWED_REPORT_EXTENSIONS.some((ext) => name.endsWith(ext));
  const hasAllowedType = !file.type || ALLOWED_REPORT_TYPES.includes(file.type);
  return hasAllowedExt || hasAllowedType;
};

const LOADING_MESSAGES = {
  ocr: 'Extracting report text...',
  intake: 'Analyzing intake...',
  report: 'Cross-checking reports...',
  synthesis: 'Generating final assessment...',
  default: 'Processing consultation...',
};

const applyConsultationData = (data, setters) => {
  const {
    setSessionId,
    setIntakeAssessment,
    setReportAnalysis,
    setFinalAssessment,
    setEmergency,
    setMatchedKeywords,
    setHasReports,
    setDisclaimer,
    setChatMessages,
    setChatReadOnly,
    setSubmitted,
  } = setters;

  setSessionId(data.session_id);
  setIntakeAssessment(data.intake_assessment);
  setReportAnalysis(data.report_analysis);
  setFinalAssessment(data.final_assessment);
  setEmergency(data.emergency || data.final_assessment?.severity === 'emergency');
  setMatchedKeywords(data.matched_keywords || []);
  setHasReports(data.has_reports);
  setDisclaimer(data.disclaimer || '');
  setChatMessages(data.messages || data.chat_messages || []);
  setChatReadOnly(data.active === false);
  setSubmitted(Boolean(data.final_assessment));
};

const FormPage = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [reportFiles, setReportFiles] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [intakeAssessment, setIntakeAssessment] = useState(null);
  const [reportAnalysis, setReportAnalysis] = useState(null);
  const [finalAssessment, setFinalAssessment] = useState(null);
  const [emergency, setEmergency] = useState(false);
  const [matchedKeywords, setMatchedKeywords] = useState([]);
  const [hasReports, setHasReports] = useState(false);
  const [disclaimer, setDisclaimer] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatReadOnly, setChatReadOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('default');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

  const consultationSetters = {
    setSessionId,
    setIntakeAssessment,
    setReportAnalysis,
    setFinalAssessment,
    setEmergency,
    setMatchedKeywords,
    setHasReports,
    setDisclaimer,
    setChatMessages,
    setChatReadOnly,
    setSubmitted,
  };

  const resetConsultation = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setReportFiles([]);
    setSessionId('');
    setIntakeAssessment(null);
    setReportAnalysis(null);
    setFinalAssessment(null);
    setEmergency(false);
    setMatchedKeywords([]);
    setHasReports(false);
    setDisclaimer('');
    setChatMessages([]);
    setChatReadOnly(false);
    setError('');
    setSubmitted(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 3) {
      setError('Maximum 3 files allowed.');
      return;
    }
    const invalid = files.find((f) => !isAllowedReportFile(f));
    if (invalid) {
      setError('Only PDF and image files are supported (pdf, jpg, png, webp, gif, bmp, tiff).');
      return;
    }
    setError('');
    setReportFiles(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSubmitted(false);
    setSessionId('');
    setIntakeAssessment(null);
    setReportAnalysis(null);
    setFinalAssessment(null);
    setChatMessages([]);
    setChatReadOnly(false);

    if (reportFiles.length > 0) {
      setLoadingStage('ocr');
    } else {
      setLoadingStage('intake');
    }

    const payload = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      payload.append(key, value);
    });
    reportFiles.forEach((file) => {
      payload.append('reports', file);
    });

    try {
      const response = await api.post('/assessment', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: () => {
          if (reportFiles.length > 0) setLoadingStage('ocr');
        },
      });
      applyConsultationData(response.data, consultationSetters);
      setHistoryKey((k) => k + 1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate assessment. Please try again.');
    } finally {
      setLoading(false);
      setLoadingStage('default');
    }
  };

  const viewConsultation = async (viewSessionId) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/history/${viewSessionId}`);
      applyConsultationData(response.data, consultationSetters);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load this consultation.');
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
        setError('This consultation has expired. View it in history or start a new one.');
        return;
      }
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
      applyConsultationData(data, consultationSetters);
      setChatReadOnly(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.error || 'Could not resume this consultation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 md:mb-8">
          <h1 className="ml-section-title">Patient Consultation</h1>
          <p className="ml-section-subtitle">
            Fill in your details on the left, view past consultations in the sidebar, and see results on the right.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <aside className="lg:col-span-3 order-3 lg:order-1">
            <ConsultationHistory
              key={historyKey}
              refreshKey={historyKey}
              activeSessionId={sessionId}
              onStartNew={resetConsultation}
              onResume={resumeConsultation}
              onView={viewConsultation}
            />
          </aside>

          <main className="lg:col-span-5 order-1 lg:order-2">
            <div className="ml-card p-6 md:p-8">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-900">Intake form</h2>
                <p className="text-sm text-slate-500">
                  Describe symptoms and optionally upload medical reports (PDF or images).
                </p>
              </div>

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

                <div>
                  <label className="ml-label" htmlFor="reports">
                    Medical reports <span className="text-slate-400 font-normal">(optional, PDF/images, max 3)</span>
                  </label>
                  <input
                    className="ml-input file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-medilink-50 file:text-medilink-700 file:font-medium"
                    type="file"
                    id="reports"
                    accept=".pdf,application/pdf,image/jpeg,image/png,image/webp,image/gif,image/bmp,image/tiff"
                    multiple
                    onChange={handleFileChange}
                  />
                  {reportFiles.length > 0 && (
                    <p className="text-xs text-slate-500 mt-2">
                      {reportFiles.map((f) => f.name).join(', ')}
                    </p>
                  )}
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
                        {LOADING_MESSAGES[loadingStage]}
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
            </div>
          </main>

          <aside className="lg:col-span-4 order-2 lg:order-3 lg:sticky lg:top-24">
            <OutputPanel
              loading={loading}
              loadingStage={loadingStage}
              intakeAssessment={intakeAssessment}
              reportAnalysis={reportAnalysis}
              finalAssessment={finalAssessment}
              emergency={emergency}
              matchedKeywords={matchedKeywords}
              disclaimer={disclaimer}
              hasReports={hasReports}
              sessionId={sessionId}
              authToken={user?.token}
              chatMessages={chatMessages}
              chatReadOnly={chatReadOnly}
              patientName={formData.name || intakeAssessment?.patient_name}
            />
          </aside>
        </div>
      </div>
    </PageLayout>
  );
};

export default FormPage;
