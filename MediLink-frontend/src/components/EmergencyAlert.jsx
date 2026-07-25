const EmergencyAlert = ({ finalAssessment, matchedKeywords = [], disclaimer }) => {
  if (!finalAssessment) return null;

  return (
    <div className="space-y-4">
      <div className="p-5 rounded-2xl border-2 border-red-400 bg-gradient-to-br from-red-50 to-red-100/80 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="shrink-0 w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-red-900">Critical emergency</h3>
            <p className="text-xs text-red-700 mt-0.5">Do not use this kiosk for self-treatment</p>
          </div>
        </div>

        {matchedKeywords?.length > 0 && (
          <p className="text-xs text-red-800 mb-3 px-3 py-2 rounded-lg bg-red-100/80 border border-red-200">
            <strong>Screening flags:</strong> {matchedKeywords.join(', ')}
          </p>
        )}

        <p className="text-red-900 font-semibold leading-relaxed text-base mb-3">
          {finalAssessment.summary}
        </p>

        {finalAssessment.advice && (
          <p className="text-red-800 text-sm leading-relaxed mb-3">{finalAssessment.advice}</p>
        )}

        {finalAssessment.integrated_recommendations && (
          <p className="text-red-800 text-sm leading-relaxed mb-3">
            {finalAssessment.integrated_recommendations}
          </p>
        )}

        <div className="p-4 rounded-xl bg-red-600 text-white">
          <p className="text-sm font-bold uppercase tracking-wide mb-1">What to do now</p>
          <p className="text-sm leading-relaxed opacity-95">
            {finalAssessment.see_doctor_when || 'Seek immediate emergency medical care.'}
          </p>
          <p className="text-sm font-semibold mt-3">
            Call your local emergency number or go to the nearest emergency department immediately.
            Do not drive yourself if you feel unsafe.
          </p>
        </div>
      </div>

      {finalAssessment.limitations && (
        <p className="text-xs text-slate-500 italic">{finalAssessment.limitations}</p>
      )}

      {disclaimer && (
        <p className="text-xs text-slate-400 leading-relaxed">{disclaimer}</p>
      )}
    </div>
  );
};

export default EmergencyAlert;
