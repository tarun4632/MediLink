const SEVERITY_STYLES = {
  mild: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  moderate: 'bg-amber-50 text-amber-700 border-amber-200',
  severe: 'bg-orange-50 text-orange-700 border-orange-200',
  emergency: 'bg-red-50 text-red-700 border-red-200',
};

const Section = ({ title, children }) => (
  <div>
    <h4 className="text-sm font-semibold text-medilink-800 uppercase tracking-wide mb-2">{title}</h4>
    {children}
  </div>
);

const AssessmentReport = ({ assessment, emergency, matchedKeywords, disclaimer }) => {
  if (!assessment) return null;

  const severity = assessment.severity || 'unknown';
  const badgeClass = SEVERITY_STYLES[severity] || 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <div className="mt-10 pt-8 border-t border-slate-100 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-bold text-slate-900">Preliminary assessment</h3>
        <span className={`px-4 py-1.5 rounded-full text-sm font-semibold border capitalize ${badgeClass}`}>
          {severity}
        </span>
      </div>

      {emergency && matchedKeywords?.length > 0 && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">
          <strong className="font-semibold">Urgent:</strong> Emergency indicators detected — {matchedKeywords.join(', ')}
        </div>
      )}

      <div className="p-5 md:p-6 rounded-2xl bg-gradient-to-br from-medilink-50 to-white border border-medilink-100 space-y-5">
        <p className="text-slate-700 leading-relaxed text-base">{assessment.summary}</p>

        {assessment.likely_causes?.length > 0 && (
          <Section title="Possible considerations">
            <ul className="space-y-1.5">
              {assessment.likely_causes.map((item) => (
                <li key={item} className="flex gap-2 text-slate-600 text-sm">
                  <span className="text-medilink-500 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {assessment.recommended_tests?.length > 0 && (
          <Section title="Recommended tests">
            <ul className="space-y-1.5">
              {assessment.recommended_tests.map((item) => (
                <li key={item} className="flex gap-2 text-slate-600 text-sm">
                  <span className="text-medilink-500 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {assessment.advice && (
          <Section title="Advice">
            <p className="text-slate-600 text-sm leading-relaxed">{assessment.advice}</p>
          </Section>
        )}

        {assessment.otc_suggestions?.length > 0 && (
          <Section title="OTC suggestions">
            <p className="text-xs text-slate-400 mb-2">Confirm with a pharmacist before use.</p>
            <ul className="space-y-2">
              {assessment.otc_suggestions.map((item) => (
                <li
                  key={`${item.name}-${item.dose}`}
                  className="p-3 rounded-xl bg-white border border-medilink-100 text-sm"
                >
                  <span className="font-medium text-slate-800">{item.name}</span>
                  <span className="text-slate-500"> — {item.dose}</span>
                  {item.note && <p className="text-slate-500 mt-1">{item.note}</p>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {assessment.see_doctor_when && (
          <Section title="When to see a doctor">
            <p className="text-slate-600 text-sm leading-relaxed">{assessment.see_doctor_when}</p>
          </Section>
        )}

        {assessment.limitations && (
          <p className="text-xs text-slate-400 italic pt-2 border-t border-medilink-100">
            {assessment.limitations}
          </p>
        )}
      </div>

      {disclaimer && (
        <p className="text-xs text-slate-400 leading-relaxed">{disclaimer}</p>
      )}
    </div>
  );
};

export default AssessmentReport;
