
import React, { useState, useMemo } from 'react';
import { ExperimentRun, VariantId, ModelId } from '../types';
import { AVAILABLE_MODELS } from '../constants';

interface Props {
  run: ExperimentRun;
}

const SideBySidePanel: React.FC<Props> = ({ run }) => {
  const [leftIdx, setLeftIdx] = useState<number>(0);
  const [rightIdx, setRightIdx] = useState<number>(Math.min(3, run.results.length - 1));

  // Get unique models in this run (filter out undefined for backward compatibility)
  const modelsInRun = useMemo(() => {
    const models = new Set(run.results.map(r => r.modelId).filter((id): id is ModelId => id !== undefined));
    return Array.from(models);
  }, [run.results]);

  const hasMultipleModels = modelsInRun.length > 1;

  const left = run.results[leftIdx];
  const right = run.results[rightIdx];

  if (!left || !right) return null;

  const getResultLabel = (result: typeof left) => {
    if (hasMultipleModels) {
      return `${result.variantId}: ${result.variantLabel} (${result.modelLabel || 'Unknown'})`;
    }
    return `${result.variantId}: ${result.variantLabel}`;
  };

  const metrics = [
    { key: 'coherence', label: 'Coherence' },
    { key: 'creativity', label: 'Creativity' },
    { key: 'characterConsistency', label: 'Consistency' },
    { key: 'styleMatch', label: 'Style Match' },
    { key: 'endingStrength', label: 'Ending' },
    { key: 'avg', label: 'OVERALL AVG' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Selectors */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Result A</label>
          <select 
            value={leftIdx} 
            onChange={(e) => setLeftIdx(parseInt(e.target.value))}
            className="w-full p-2 border rounded-lg bg-white"
          >
            {run.results.map((r, idx) => (
              <option key={`${r.variantId}-${r.modelId}-${idx}`} value={idx}>
                {getResultLabel(r)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Result B</label>
          <select 
            value={rightIdx} 
            onChange={(e) => setRightIdx(parseInt(e.target.value))}
            className="w-full p-2 border rounded-lg bg-white"
          >
            {run.results.map((r, idx) => (
              <option key={`${r.variantId}-${r.modelId}-${idx}`} value={idx}>
                {getResultLabel(r)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Difference Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
            <tr>
              <th className="p-4">Metric</th>
              <th className="p-4">
                {left.variantLabel}
                {hasMultipleModels && <span className="ml-1 text-indigo-500">({left.modelLabel || 'Unknown'})</span>}
              </th>
              <th className="p-4">
                {right.variantLabel}
                {hasMultipleModels && <span className="ml-1 text-indigo-500">({right.modelLabel || 'Unknown'})</span>}
              </th>
              <th className="p-4">Delta</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {metrics.map(m => {
              const valA = (left.evaluation as any)[m.key];
              const valB = (right.evaluation as any)[m.key];
              const delta = valB - valA;
              return (
                <tr key={m.key}>
                  <td className="p-4 font-medium">{m.label}</td>
                  <td className="p-4">{valA.toFixed(1)}</td>
                  <td className="p-4">{valB.toFixed(1)}</td>
                  <td className={`p-4 font-bold ${delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                    {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Text Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
        <div className="bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden">
          <div className="bg-slate-50 p-3 border-b text-center">
            <div className="font-bold text-slate-700">{left.variantLabel}</div>
            {hasMultipleModels && <div className="text-xs text-slate-500">{left.modelLabel || 'Unknown'}</div>}
          </div>
          <div className="p-6 overflow-y-auto font-serif leading-relaxed text-slate-700 text-sm whitespace-pre-wrap bg-slate-50/50">
            {left.storyText}
          </div>
        </div>
        <div className="bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden">
          <div className="bg-slate-50 p-3 border-b text-center">
            <div className="font-bold text-slate-700">{right.variantLabel}</div>
            {hasMultipleModels && <div className="text-xs text-slate-500">{right.modelLabel || 'Unknown'}</div>}
          </div>
          <div className="p-6 overflow-y-auto font-serif leading-relaxed text-slate-700 text-sm whitespace-pre-wrap bg-slate-50/50">
            {right.storyText}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SideBySidePanel;
