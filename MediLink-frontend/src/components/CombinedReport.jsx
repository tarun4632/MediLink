import EmergencyAlert from './EmergencyAlert';

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

const ListSection = ({ title, items }) => {
  if (!items?.length) return null;
  return (
    <Section title={title}>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-slate-600 text-sm">
            <span className="text-medilink-500 mt-0.5">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
};

const AssessmentBody = ({ assessment }) => (
  <>
    <p className="text-slate-700 leading-relaxed text-base">{assessment.summary}</p>
    <ListSection title="Possible considerations" items={assessment.likely_causes} />
    <ListSection title="Recommended tests" items={assessment.recommended_tests} />
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
  </>
);

const CombinedReport = ({
  intakeAssessment,
  reportAnalysis,
  finalAssessment,
  emergency,
  matchedKeywords,
  disclaimer,
  hasReports,
  embedded = false,
}) => {
  if (!finalAssessment) return null;

  const severity = finalAssessment.severity || 'unknown';
  const isCriticalEmergency = emergency || severity === 'emergency';

  if (isCriticalEmergency) {
    const wrapperClass = embedded ? '' : 'mt-10 pt-8 border-t border-slate-100';
    return (
      <div className={wrapperClass}>
        <EmergencyAlert
          finalAssessment={finalAssessment}
          matchedKeywords={matchedKeywords}
          disclaimer={disclaimer}
        />
      </div>
    );
  }

  const badgeClass = SEVERITY_STYLES[severity] || 'bg-slate-50 text-slate-700 border-slate-200';
  const wrapperClass = embedded ? 'space-y-4' : 'mt-10 pt-8 border-t border-slate-100 space-y-6';

  return (
    <div className={wrapperClass}>
      {!embedded && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-bold text-slate-900">Integrated assessment</h3>
          <span className={`px-4 py-1.5 rounded-full text-sm font-semibold border capitalize ${badgeClass}`}>
            {severity}
          </span>
        </div>
      )}

      {emergency && matchedKeywords?.length > 0 && severity !== 'emergency' && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">
          <strong className="font-semibold">Urgent:</strong> Emergency indicators detected — {matchedKeywords.join(', ')}
        </div>
      )}

      <div className={`${embedded ? 'p-4' : 'p-5 md:p-6'} rounded-2xl bg-gradient-to-br from-medilink-600/5 to-white border border-medilink-200 space-y-4`}>
        <h4 className="text-sm font-semibold text-medilink-800 uppercase tracking-wide">Final recommendation</h4>
        <p className="text-slate-700 leading-relaxed">{finalAssessment.summary}</p>
        {finalAssessment.integrated_recommendations && (
          <p className="text-slate-600 text-sm leading-relaxed bg-white p-4 rounded-xl border border-medilink-100">
            {finalAssessment.integrated_recommendations}
          </p>
        )}
        <ListSection title="Data gaps" items={finalAssessment.data_gaps} />
      </div>

      {hasReports && reportAnalysis && (
        <div className={`${embedded ? 'p-4' : 'p-5 md:p-6'} rounded-2xl bg-white border border-slate-200 space-y-4`}>
          <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Report analysis</h4>
          <ListSection title="Key findings" items={reportAnalysis.key_findings} />
          <ListSection title="Abnormal values" items={reportAnalysis.abnormal_values} />
          <ListSection title="Conflicts with intake" items={reportAnalysis.conflicts_with_intake} />
          {reportAnalysis.additional_context && (
            <Section title="Additional context">
              <p className="text-slate-600 text-sm leading-relaxed">{reportAnalysis.additional_context}</p>
            </Section>
          )}
          {finalAssessment.report_summary && (
            <Section title="Report summary">
              <p className="text-slate-600 text-sm leading-relaxed">{finalAssessment.report_summary}</p>
            </Section>
          )}
        </div>
      )}

      {intakeAssessment && (
        <details className={`${embedded ? 'p-4' : 'p-5 md:p-6'} rounded-2xl bg-slate-50 border border-slate-200`}>
          <summary className="text-sm font-semibold text-slate-700 cursor-pointer">
            Intake assessment (from symptoms)
          </summary>
          <div className="mt-4 space-y-4">
            <AssessmentBody assessment={intakeAssessment} />
          </div>
        </details>
      )}

      {finalAssessment.limitations && (
        <p className="text-xs text-slate-400 italic">{finalAssessment.limitations}</p>
      )}

      {disclaimer && (
        <p className="text-xs text-slate-400 leading-relaxed">{disclaimer}</p>
      )}
    </div>
  );
};

export default CombinedReport;
