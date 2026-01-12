
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { StoryResult } from '../types';

interface ComparisonChartsProps {
  results: StoryResult[];
}

export const MetricGroupedChart: React.FC<ComparisonChartsProps> = ({ results }) => {
  const data = results.map(r => ({
    name: r.variantId,
    Coherence: r.evaluation.coherence,
    Creativity: r.evaluation.creativity,
    Consistency: r.evaluation.characterConsistency,
    Style: r.evaluation.styleMatch,
    Ending: r.evaluation.endingStrength
  }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" />
          <YAxis domain={[0, 10]} />
          <Tooltip />
          <Legend />
          <Bar dataKey="Coherence" fill="#6366f1" />
          <Bar dataKey="Creativity" fill="#ec4899" />
          <Bar dataKey="Consistency" fill="#8b5cf6" />
          <Bar dataKey="Style" fill="#10b981" />
          <Bar dataKey="Ending" fill="#f59e0b" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const ComparisonBarChart: React.FC<ComparisonChartsProps> = ({ results }) => {
  const data = results.map(r => ({
    name: r.variantId,
    score: r.evaluation.avg,
    label: r.variantLabel
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" />
          <YAxis domain={[0, 10]} />
          <Tooltip 
            formatter={(value: number) => [value.toFixed(2), 'Avg Score']}
            labelFormatter={(label) => results.find(r => r.variantId === label)?.variantLabel || label}
          />
          <Bar dataKey="score" fill="#4f46e5" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

interface RadarProps {
  result: StoryResult;
}

export const SingleVariantRadar: React.FC<RadarProps> = ({ result }) => {
  const data = [
    { subject: 'Coherence', value: result.evaluation.coherence, fullMark: 10 },
    { subject: 'Creativity', value: result.evaluation.creativity, fullMark: 10 },
    { subject: 'Consistency', value: result.evaluation.characterConsistency, fullMark: 10 },
    { subject: 'Style', value: result.evaluation.styleMatch, fullMark: 10 },
    { subject: 'Ending', value: result.evaluation.endingStrength, fullMark: 10 },
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" />
          <PolarRadiusAxis angle={30} domain={[0, 10]} />
          <Radar
            name={result.variantLabel}
            dataKey="value"
            stroke="#4f46e5"
            fill="#4f46e5"
            fillOpacity={0.6}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
