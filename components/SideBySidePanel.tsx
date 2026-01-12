
import React, { useState } from 'react';
import { ExperimentRun, VariantId } from '../types';

interface Props {
  run: ExperimentRun;
}

const SideBySidePanel: React.FC<Props> = ({ run }) => {
  const [leftId, setLeftId] = useState<VariantId>(VariantId.V0);
  const [rightId, setRightId] = useState<VariantId>(VariantId.V3);

  const left = run.results.find(r => r.variantId === leftId);
  const right = run.results.find(r => r.variantId === rightId);

  if (!left || !right) return null;

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
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Variant A</label>
          <select 
            value={leftId} 
            onChange={(e) => setLeftId(e.target.value as VariantId)}
            className="w-full p-2 border rounded-lg bg-white"
          >
            {run.results.map(r => <option key={r.variantId} value={r.variantId}>{r.variantId}: {r.variantLabel}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Variant B</label>
          <select 
            value={rightId} 
            onChange={(e) => setRightId(e.target.value as VariantId)}
            className="w-full p-2 border rounded-lg bg-white"
          >
            {run.results.map(r => <option key={r.variantId} value={r.variantId}>{r.variantId}: {r.variantLabel}</option>)}
          </select>
        </div>
      </div>

      {/* Difference Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
            <tr>
              <th className="p-4">Metric</th>
              <th className="p-4">{left.variantLabel}</th>
              <th className="p-4">{right.variantLabel}</th>
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
          <div className="bg-slate-50 p-3 border-b text-center font-bold text-slate-700">{left.variantLabel}</div>
          <div className="p-6 overflow-y-auto font-serif leading-relaxed text-slate-700 text-sm whitespace-pre-wrap bg-slate-50/50">
            {left.storyText}
          </div>
        </div>
        <div className="bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden">
          <div className="bg-slate-50 p-3 border-b text-center font-bold text-slate-700">{right.variantLabel}</div>
          <div className="p-6 overflow-y-auto font-serif leading-relaxed text-slate-700 text-sm whitespace-pre-wrap bg-slate-50/50">
            {right.storyText}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SideBySidePanel;
