
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import StoryConfigForm from './components/StoryConfigForm';
import ComparisonPanel from './components/ComparisonPanel';
import SideBySidePanel from './components/SideBySidePanel';
import { ExperimentRun, StoryConfig, VariantId } from './types';
import { DEFAULT_STORY_CONFIG, VARIANT_TEMPLATES } from './constants';
import { openaiService } from './services/openaiService';
import { dbService } from './services/dbService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'experiment' | 'history' | 'compare'>('experiment');
  const [config, setConfig] = useState<StoryConfig>(DEFAULT_STORY_CONFIG);
  const [runs, setRuns] = useState<ExperimentRun[]>([]);
  const [currentRun, setCurrentRun] = useState<ExperimentRun | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<Record<string, string>>({});

  useEffect(() => {
    setRuns(dbService.getAllRuns());
  }, []);

  const handleRunExperiment = async () => {
    setIsRunning(true);
    setProgress({});
    
    try {
      const results = await openaiService.runExperiment(config, (variantId, status) => {
        setProgress(prev => ({ ...prev, [variantId]: status }));
      });

      const newRun: ExperimentRun = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        config: { ...config },
        results
      };

      dbService.saveRun(newRun);
      setRuns(dbService.getAllRuns());
      setCurrentRun(newRun);
      setActiveTab('history');
    } catch (error: any) {
      alert(`Experiment failed: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleDeleteRun = (id: string) => {
    if (confirm("Are you sure you want to delete this experiment result?")) {
      dbService.deleteRun(id);
      setRuns(dbService.getAllRuns());
      if (currentRun?.id === id) setCurrentRun(null);
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'experiment' && (
        <div className="max-w-4xl mx-auto space-y-8">
          <StoryConfigForm config={config} onChange={setConfig} isLocked={isRunning} />

          <div className="flex flex-col items-center gap-4 py-6">
            <button
              onClick={handleRunExperiment}
              disabled={isRunning}
              className={`px-10 py-4 rounded-full text-lg font-bold shadow-xl transition-all transform hover:scale-105 active:scale-95 ${isRunning ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
            >
              {isRunning ? 'Running Experiment (V0..V7)...' : 'START RESEARCH EXPERIMENT'}
            </button>
            <p className="text-xs text-slate-400 text-center max-w-sm">
              Note: This will execute 8 separate LLM calls for story generation and 8 for evaluation. It may take 1-3 minutes.
            </p>
          </div>

          {isRunning && (
            <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm animate-pulse">
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Real-time Progress</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {VARIANT_TEMPLATES.map(v => (
                  <div key={v.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="font-semibold text-slate-700">{v.id}: {v.label}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${progress[v.id]?.includes('Error') ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                      {progress[v.id] || "Pending..."}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">Experiment Repository</h2>
            {currentRun && (
              <button 
                onClick={() => setCurrentRun(null)}
                className="text-sm text-indigo-600 font-medium"
              >
                Back to List
              </button>
            )}
          </div>

          {!currentRun ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {runs.map(run => (
                <div 
                  key={run.id} 
                  className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative group"
                  onClick={() => setCurrentRun(run)}
                >
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteRun(run.id); }}
                    className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Delete
                  </button>
                  <div className="text-xs text-indigo-600 font-bold uppercase tracking-wider mb-2">
                    {new Date(run.timestamp).toLocaleString()}
                  </div>
                  <h4 className="font-bold text-slate-800 line-clamp-1">{run.config.idea}</h4>
                  <div className="mt-4 flex gap-4">
                    <div className="text-center">
                      <div className="text-xl font-bold text-slate-900">{run.results.length}</div>
                      <div className="text-[10px] text-slate-500 uppercase">Variants</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-indigo-600">
                        {(run.results.reduce((acc, r) => acc + r.evaluation.avg, 0) / run.results.length).toFixed(1)}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase">Avg Rating</div>
                    </div>
                  </div>
                </div>
              ))}
              {runs.length === 0 && (
                <div className="col-span-full py-20 text-center text-slate-400">
                  <p>No experiments found. Run your first experiment to see results here.</p>
                </div>
              )}
            </div>
          ) : (
            <ComparisonPanel run={currentRun} />
          )}
        </div>
      )}

      {activeTab === 'compare' && (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">Cross-Variant Comparison</h2>
            <select 
              className="p-2 border rounded-lg text-sm bg-white"
              onChange={(e) => {
                const r = runs.find(run => run.id === e.target.value);
                if (r) setCurrentRun(r);
              }}
              value={currentRun?.id || ""}
            >
              <option value="">Select Experiment Session...</option>
              {runs.map(run => (
                <option key={run.id} value={run.id}>
                  {new Date(run.timestamp).toLocaleDateString()} - {run.config.idea.substring(0, 30)}...
                </option>
              ))}
            </select>
          </div>

          {currentRun ? (
            <SideBySidePanel run={currentRun} />
          ) : (
            <div className="py-20 text-center text-slate-400 bg-white rounded-xl border border-dashed">
              Please select an experiment session from the dropdown above to start a side-by-side comparison.
            </div>
          )}
        </div>
      )}
    </Layout>
  );
};

export default App;
