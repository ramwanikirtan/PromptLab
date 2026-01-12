
import React from 'react';
import { StoryConfig } from '../types';

interface Props {
  config: StoryConfig;
  onChange: (config: StoryConfig) => void;
  isLocked: boolean;
}

const StoryConfigForm: React.FC<Props> = ({ config, onChange, isLocked }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
                type === 'number' ? parseFloat(value) : value;
    onChange({ ...config, [name]: val });
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <h3 className="text-lg font-semibold border-b pb-2 mb-4">Experiment Parameters</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Main Story Idea</label>
          <textarea
            name="idea"
            value={config.idea}
            onChange={handleChange}
            disabled={isLocked}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-slate-50 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Genre</label>
          <input
            type="text"
            name="genre"
            value={config.genre}
            onChange={handleChange}
            disabled={isLocked}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-slate-50 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Style</label>
          <input
            type="text"
            name="style"
            value={config.style}
            onChange={handleChange}
            disabled={isLocked}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-slate-50 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">POV</label>
          <input
            type="text"
            name="pov"
            value={config.pov}
            onChange={handleChange}
            disabled={isLocked}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-slate-50 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tone</label>
          <input
            type="text"
            name="tone"
            value={config.tone}
            onChange={handleChange}
            disabled={isLocked}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-slate-50 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Target Length (Words)</label>
          <input
            type="number"
            name="length"
            value={config.length}
            onChange={handleChange}
            disabled={isLocked}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-slate-50 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Temperature ({config.temperature})</label>
          <input
            type="range"
            name="temperature"
            min="0"
            max="2"
            step="0.1"
            value={config.temperature}
            onChange={handleChange}
            disabled={isLocked || config.isDeterministic}
            className="w-full"
          />
        </div>

        <div className="flex items-center space-x-2 pt-6">
          <input
            type="checkbox"
            id="isDeterministic"
            name="isDeterministic"
            checked={config.isDeterministic}
            onChange={handleChange}
            disabled={isLocked}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label htmlFor="isDeterministic" className="text-sm font-medium text-slate-700">Deterministic Mode (Force Temp 0)</label>
        </div>
      </div>
    </div>
  );
};

export default StoryConfigForm;
