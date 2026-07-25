import PageLayout from '../components/PageLayout';

const Result = () => (
  <PageLayout>
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <h1 className="ml-section-title">Prescription</h1>
        <p className="ml-section-subtitle">Sample prescription view</p>
      </div>

      <div className="ml-card p-6 md:p-8 space-y-4">
        {[
          { label: 'Patient name', value: 'John Doe' },
          { label: 'Age', value: '30' },
          { label: 'Date', value: '2024-07-31' },
        ].map((field) => (
          <div key={field.label}>
            <label className="ml-label">{field.label}</label>
            <div className="ml-input bg-slate-50 cursor-default">{field.value}</div>
          </div>
        ))}

        <div>
          <label className="ml-label">Medications</label>
          <ul className="ml-input bg-slate-50 space-y-1 list-disc list-inside text-sm">
            <li>Medicine 1: 1 tablet twice daily</li>
            <li>Medicine 2: 5 ml syrup once daily</li>
            <li>Medicine 3: 1 capsule after lunch</li>
          </ul>
        </div>

        <div>
          <label className="ml-label">Doctor&apos;s notes</label>
          <div className="ml-input bg-slate-50 cursor-default text-sm">
            Take medications with food. Follow up in two weeks.
          </div>
        </div>

        <button className="ml-btn-primary w-full mt-2" type="button">
          Print prescription
        </button>
      </div>
    </div>
  </PageLayout>
);

export default Result;
