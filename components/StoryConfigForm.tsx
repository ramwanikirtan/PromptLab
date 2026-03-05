
import React, { useState } from 'react';
import { StoryConfig, ModelId, VariantId } from '../types';
import { AVAILABLE_MODELS, VARIANT_TEMPLATES } from '../constants';

interface Props {
  config: StoryConfig;
  onChange: (config: StoryConfig) => void;
  isLocked: boolean;
}

const StoryConfigForm: React.FC<Props> = ({ config, onChange, isLocked }) => {
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isVariantDropdownOpen, setIsVariantDropdownOpen] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
                type === 'number' ? parseFloat(value) : value;
    onChange({ ...config, [name]: val });
  };

  const handleModelToggle = (modelId: ModelId) => {
    const currentModels = config.selectedModels || [];
    const isSelected = currentModels.includes(modelId);
    
    if (isSelected) {
      // Don't allow deselecting if it's the last model
      if (currentModels.length > 1) {
        onChange({ ...config, selectedModels: currentModels.filter(m => m !== modelId) });
      }
    } else {
      onChange({ ...config, selectedModels: [...currentModels, modelId] });
    }
  };

  const handleSelectAll = () => {
    onChange({ ...config, selectedModels: AVAILABLE_MODELS.map(m => m.id) });
  };

  const handleSelectOne = (modelId: ModelId) => {
    onChange({ ...config, selectedModels: [modelId] });
    setIsModelDropdownOpen(false);
  };

  const getSelectedModelsLabel = () => {
    const count = config.selectedModels?.length || 0;
    if (count === 0) return 'Select models...';
    if (count === 1) {
      const model = AVAILABLE_MODELS.find(m => m.id === config.selectedModels[0]);
      return model?.label || 'Unknown';
    }
    if (count === AVAILABLE_MODELS.length) return 'All models selected';
    return `${count} models selected`;
  };

  // Variant selection handlers
  const handleVariantToggle = (variantId: VariantId) => {
    const currentVariants = config.selectedVariants || [];
    const isSelected = currentVariants.includes(variantId);
    
    if (isSelected) {
      // Don't allow deselecting if it's the last variant
      if (currentVariants.length > 1) {
        onChange({ ...config, selectedVariants: currentVariants.filter(v => v !== variantId) });
      }
    } else {
      onChange({ ...config, selectedVariants: [...currentVariants, variantId] });
    }
  };

  const handleSelectAllVariants = () => {
    onChange({ ...config, selectedVariants: VARIANT_TEMPLATES.map(v => v.id) });
  };

  const handleSelectOneVariant = (variantId: VariantId) => {
    onChange({ ...config, selectedVariants: [variantId] });
    setIsVariantDropdownOpen(false);
  };

  const getSelectedVariantsLabel = () => {
    const count = config.selectedVariants?.length || 0;
    if (count === 0) return 'Select variants...';
    if (count === 1) {
      const variant = VARIANT_TEMPLATES.find(v => v.id === config.selectedVariants![0]);
      return variant ? `${variant.id}: ${variant.label}` : 'Unknown';
    }
    if (count === VARIANT_TEMPLATES.length) return 'All variants selected';
    return `${count} variants selected`;
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

        {/* Model Selection */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Models to Use</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => !isLocked && setIsModelDropdownOpen(!isModelDropdownOpen)}
              disabled={isLocked}
              className="w-full px-3 py-2 border rounded-lg bg-slate-50 text-left flex justify-between items-center focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <span className={config.selectedModels?.length ? 'text-slate-800' : 'text-slate-400'}>
                {getSelectedModelsLabel()}
              </span>
              <svg className={`w-5 h-5 transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isModelDropdownOpen && !isLocked && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg">
                <div className="p-2 border-b border-slate-100 flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                  >
                    Select All
                  </button>
                </div>
                {AVAILABLE_MODELS.map(model => (
                  <div
                    key={model.id}
                    className="flex items-center p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                    onClick={() => handleModelToggle(model.id)}
                  >
                    <input
                      type="checkbox"
                      checked={config.selectedModels?.includes(model.id) || false}
                      onChange={() => {}}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-slate-800">{model.label}</div>
                      <div className="text-xs text-slate-500">{model.description}</div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleSelectOne(model.id); }}
                      className="text-xs px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded"
                    >
                      Only
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Select one or more models. Each model will generate {config.selectedModels?.length > 1 ? 'separate outputs' : 'outputs'} for all prompt variants.
          </p>
        </div>

        {/* Variant Selection */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Prompt Variants to Test</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => !isLocked && setIsVariantDropdownOpen(!isVariantDropdownOpen)}
              disabled={isLocked}
              className="w-full px-3 py-2 border rounded-lg bg-slate-50 text-left flex justify-between items-center focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <span className={config.selectedVariants?.length ? 'text-slate-800' : 'text-slate-400'}>
                {getSelectedVariantsLabel()}
              </span>
              <svg className={`w-5 h-5 transition-transform ${isVariantDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isVariantDropdownOpen && !isLocked && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                <div className="p-2 border-b border-slate-100 flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllVariants}
                    className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                  >
                    Select All
                  </button>
                </div>
                {VARIANT_TEMPLATES.map(variant => (
                  <div
                    key={variant.id}
                    className="flex items-center p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                    onClick={() => handleVariantToggle(variant.id)}
                  >
                    <input
                      type="checkbox"
                      checked={config.selectedVariants?.includes(variant.id) || false}
                      onChange={() => {}}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-slate-800">{variant.id}: {variant.label}</div>
                      <div className="text-xs text-slate-500">{variant.description}</div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleSelectOneVariant(variant.id); }}
                      className="text-xs px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded"
                    >
                      Only
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Select one or more prompt variants to test. Each variant uses a different prompting style.
          </p>
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
