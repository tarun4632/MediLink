import Navbar from './Navbar';

const PageLayout = ({ children, className = '' }) => (
  <div className={`ml-page ${className}`}>
    <Navbar />
    <main className="px-4 py-8 md:py-12">
      {children}
    </main>
  </div>
);

export default PageLayout;
