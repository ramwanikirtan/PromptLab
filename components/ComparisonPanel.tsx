
import React, { useState, useMemo } from 'react';
import { ExperimentRun, VariantId, ModelId } from '../types';
import { SingleVariantRadar, ComparisonBarChart, MetricGroupedChart } from './EvaluationCharts';
import { AVAILABLE_MODELS } from '../constants';

interface Props {
  run: ExperimentRun;
}

const ComparisonPanel: React.FC<Props> = ({ run }) => {
  const [selectedResultIndex, setSelectedResultIndex] = useState<number>(0);
  const [showDebug, setShowDebug] = useState(false);
  const [filterModel, setFilterModel] = useState<ModelId | 'all'>('all');

  // Get unique models used in this run (filter out undefined for backward compatibility)
  const modelsInRun = useMemo(() => {
    const models = new Set(run.results.map(r => r.modelId).filter((id): id is ModelId => id !== undefined));
    return Array.from(models);
  }, [run.results]);

  // Filter results by selected model
  const filteredResults = useMemo(() => {
    if (filterModel === 'all') return run.results;
    return run.results.filter(r => r.modelId === filterModel);
  }, [run.results, filterModel]);

  const selectedResult = filteredResults[selectedResultIndex] || filteredResults[0];
  
  // Rank results for the leaderboard
  const rankedResults = [...filteredResults].sort((a, b) => b.evaluation.avg - a.evaluation.avg);

  if (!selectedResult) return null;

  return (
    <div className="space-y-8">
      {/* Model Filter (only show if multiple models) */}
      {modelsInRun.length > 1 && (
        <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-sm font-medium text-slate-600">Filter by Model:</span>
          <div className="flex gap-2">
            <button
              onClick={() => { setFilterModel('all'); setSelectedResultIndex(0); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterModel === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Models
            </button>
            {modelsInRun.map(modelId => {
              const model = AVAILABLE_MODELS.find(m => m.id === modelId);
              return (
                <button
                  key={modelId}
                  onClick={() => { setFilterModel(modelId); setSelectedResultIndex(0); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filterModel === modelId ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {model?.label || modelId}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 1. High Level Summary Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Performance Leaderboard</h4>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50">
            <tr>
              <th className="px-6 py-3">Rank</th>
              <th className="px-6 py-3">Variant</th>
              {modelsInRun.length > 1 && filterModel === 'all' && <th className="px-6 py-3">Model</th>}
              <th className="px-6 py-3 text-center">Avg Score</th>
              <th className="px-6 py-3">Best Metric</th>
              <th className="px-6 py-3">Rationale Snippet</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rankedResults.map((res, index) => {
              const metrics = Object.entries(res.evaluation).filter(([k]) => k !== 'avg');
              const bestMetric = metrics.reduce((prev, curr) => (curr[1] > prev[1] ? curr : prev));
              return (
                <tr key={`${res.variantId}-${res.modelId}`} className={index === 0 ? "bg-indigo-50/30" : ""}>
                  <td className="px-6 py-4 font-bold text-slate-400">#{index + 1}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{res.variantId}: {res.variantLabel}</td>
                  {modelsInRun.length > 1 && filterModel === 'all' && (
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                        {res.modelLabel || 'Unknown'}
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${index === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {res.evaluation.avg.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-500 capitalize">{bestMetric[0].replace(/([A-Z])/g, ' $1')} ({bestMetric[1]})</td>
                  <td className="px-6 py-4 text-xs text-slate-400 italic truncate max-w-[200px]">{res.judgeRationale}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 2. Overview Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Detailed Metrics Comparison</h4>
          <MetricGroupedChart results={filteredResults} />
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Overall Performance (Avg)</h4>
          <ComparisonBarChart results={filteredResults} />
        </div>
      </div>

      {/* 3. Deep Dive Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Variant List Sidebar */}
        <div className="lg:col-span-3 space-y-2">
          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2 px-2">Select to Read</h4>
          {filteredResults.map((res, idx) => (
            <button
              key={`${res.variantId}-${res.modelId}`}
              onClick={() => setSelectedResultIndex(idx)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${selectedResultIndex === idx ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-semibold text-slate-700">{res.variantId}: {res.variantLabel}</span>
                  {modelsInRun.length > 1 && filterModel === 'all' && (
                    <span className="ml-2 text-xs text-slate-500">({res.modelLabel || 'Unknown'})</span>
                  )}
                </div>
                <span className="text-sm text-indigo-600 font-bold">{res.evaluation.avg.toFixed(1)}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Story Text Area */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
          <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
            <div>
              <h3 className="font-serif text-xl italic text-slate-800">{selectedResult.variantLabel} Output</h3>
              {modelsInRun.length > 1 && (
                <span className="text-xs text-slate-500">Generated by {selectedResult.modelLabel || 'Unknown'}</span>
              )}
            </div>
            <button 
              onClick={() => setShowDebug(!showDebug)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              {showDebug ? 'Hide Technical Metadata' : 'Show Full Prompt & Raw JSON'}
            </button>
          </div>
          <div className="p-8 overflow-y-auto font-serif text-lg leading-relaxed text-slate-700 whitespace-pre-wrap">
            {selectedResult.storyText}
          </div>
        </div>

        {/* Selected Results Sidebar */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Metric Radar</h4>
            <SingleVariantRadar result={selectedResult} />
          </div>
          <div className="bg-indigo-600 text-white p-6 rounded-xl shadow-md">
            <h4 className="text-sm font-bold uppercase tracking-widest mb-2 opacity-80">Full Critic Feedback</h4>
            <p className="text-sm italic leading-relaxed">"{selectedResult.judgeRationale}"</p>
          </div>
        </div>
      </div>

      {showDebug && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top duration-300">
          <div className="bg-slate-900 text-slate-300 p-6 rounded-xl overflow-auto max-h-96">
            <h4 className="text-xs font-bold uppercase tracking-widest mb-4 text-indigo-400">Experimental Prompt</h4>
            <pre className="text-xs whitespace-pre-wrap font-mono">{selectedResult.promptUsed}</pre>
          </div>
          <div className="bg-slate-900 text-slate-300 p-6 rounded-xl overflow-auto max-h-96">
            <h4 className="text-xs font-bold uppercase tracking-widest mb-4 text-indigo-400">Raw Model Response (Part Data)</h4>
            <pre className="text-xs whitespace-pre-wrap font-mono">{selectedResult.rawModelResponse}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComparisonPanel;
