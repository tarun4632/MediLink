import { Link } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import { useAuth } from '../context/AuthContext';

const features = [
  {
    title: 'Remote preliminary assessment',
    desc: 'AI-assisted first consultation for rural clinic kiosks.',
  },
  {
    title: 'Structured health guidance',
    desc: 'Clear severity levels, advice, and follow-up chat.',
  },
  {
    title: 'Connect to care pathways',
    desc: 'Know when to seek a doctor or emergency help.',
  },
];

const HomePage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14 pt-4 md:pt-8">
          <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-medilink-100 text-medilink-700 text-sm font-medium mb-6">
            <span className="h-2 w-2 rounded-full bg-medilink-500 animate-pulse" />
            Healthcare kiosk for remote clinics
          </p>
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-4">
            Medi<span className="text-medilink-600">Link</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Your calm, trusted companion for preliminary health guidance — designed for clarity, not clutter.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mb-12">
          {features.map((feature) => (
            <div key={feature.title} className="ml-card p-6 hover:shadow-card transition duration-300">
              <div className="h-10 w-10 rounded-xl bg-medilink-100 text-medilink-600 flex items-center justify-center mb-4 text-lg font-bold">
                ✓
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            to={isAuthenticated ? '/form' : '/login'}
            className="ml-btn-primary text-base px-8 py-3"
          >
            {isAuthenticated ? 'Go to consultation' : 'Get started'}
          </Link>
          <p className="text-sm text-slate-400 mt-4">Informational guidance only — not a substitute for professional care.</p>
        </div>
      </div>
    </PageLayout>
  );
};

export default HomePage;
