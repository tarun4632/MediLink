import { useState } from 'react';
import CombinedReport from './CombinedReport';
import ChatPanel from './ChatPanel';

const LOADING_MESSAGES = {
  ocr: 'Extracting report text...',
  intake: 'Analyzing intake...',
  report: 'Cross-checking reports...',
  synthesis: 'Generating final assessment...',
  default: 'Processing consultation...',
};

const OutputPanel = ({
  loading,
  loadingStage = 'default',
  error = '',
  intakeAssessment,
  reportAnalysis,
  finalAssessment,
  emergency,
  matchedKeywords,
  disclaimer,
  hasReports,
  sessionId,
  authToken,
  chatMessages,
  chatReadOnly = false,
  patientName,
}) => {
  const [activeTab, setActiveTab] = useState('assessment');
  const hasResults = Boolean(finalAssessment);
  const isCriticalEmergency = emergency || finalAssessment?.severity === 'emergency';

  const tabs = [
    { id: 'assessment', label: isCriticalEmergency ? 'Emergency' : 'Assessment' },
    { id: 'chat', label: 'Follow-up', disabled: !sessionId || isCriticalEmergency },
  ];

  return (
    <div className="ml-card flex flex-col h-full max-h-[calc(100vh-6rem)] lg:max-h-[calc(100vh-7rem)] overflow-hidden">
      <div className="shrink-0 p-4 border-b border-slate-100 bg-white/80">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Results</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {patientName ? `${patientName} — ` : ''}
              Assessment & follow-up chat
            </p>
          </div>
          {hasResults && finalAssessment?.severity && (
            <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${
              isCriticalEmergency
                ? 'bg-red-100 text-red-800 border-red-300'
                : 'bg-medilink-50 text-medilink-700 border-medilink-100'
            }`}>
              {finalAssessment.severity}
            </span>
          )}
        </div>

        {hasResults && !isCriticalEmergency && (
          <div className="flex gap-1 p-1 rounded-xl bg-slate-100">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                disabled={tab.disabled}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-white text-medilink-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 min-h-[280px]">
        {loading && (
          <div className="flex flex-col items-center justify-center h-full min-h-[240px] text-center px-4">
            <span className="h-10 w-10 border-2 border-medilink-200 border-t-medilink-600 rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium text-slate-700">
              {LOADING_MESSAGES[loadingStage] || LOADING_MESSAGES.default}
            </p>
            <p className="text-xs text-slate-400 mt-1">This may take a minute</p>
          </div>
        )}

        {!loading && !hasResults && (
          <div className="flex flex-col items-center justify-center h-full min-h-[240px] text-center px-4">
            {error ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-red-700">{error}</p>
                <p className="text-xs text-slate-400 mt-2 max-w-[240px]">
                  Check the form for details, or click View on a past consultation in history.
                </p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-medilink-50 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-medilink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-700">No assessment yet</p>
                <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                  Submit the intake form or click View on a past consultation to see results here.
                </p>
              </>
            )}
          </div>
        )}

        {!loading && hasResults && (isCriticalEmergency || activeTab === 'assessment') && (
          <CombinedReport
            embedded
            intakeAssessment={intakeAssessment}
            reportAnalysis={reportAnalysis}
            finalAssessment={finalAssessment}
            emergency={emergency}
            matchedKeywords={matchedKeywords}
            disclaimer={disclaimer}
            hasReports={hasReports}
          />
        )}

        {!loading && hasResults && !isCriticalEmergency && activeTab === 'chat' && sessionId && (
          <ChatPanel
            key={sessionId}
            embedded
            readOnly={chatReadOnly}
            sessionId={sessionId}
            authToken={authToken}
            initialMessages={chatMessages}
          />
        )}
      </div>
    </div>
  );
};

export default OutputPanel;
