
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'experiment' | 'history' | 'compare';
  setActiveTab: (tab: 'experiment' | 'history' | 'compare') => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50">
      {/* Sidebar */}
      <nav className="w-full lg:w-64 bg-slate-900 text-white p-6 flex flex-col">
        <div className="mb-10">
          <h1 className="text-xl font-bold tracking-tight text-indigo-400">PromptWriter Pro</h1>
        </div>
        
        <ul className="space-y-2 flex-1">
          <li>
            <button 
              onClick={() => setActiveTab('experiment')}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${activeTab === 'experiment' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
            >
              Run Experiment
            </button>
          </li>
          <li>
            <button 
              onClick={() => setActiveTab('history')}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${activeTab === 'history' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
            >
              Results History
            </button>
          </li>
          <li>
            <button 
              onClick={() => setActiveTab('compare')}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${activeTab === 'compare' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
            >
              Compare Variants
            </button>
          </li>
        </ul>

        <div className="mt-auto pt-6 border-t border-slate-800 text-slate-500 text-xs">
          <p>Version 1.0.4-Beta</p>
          <p>© 2024 Research Engineering</p>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
