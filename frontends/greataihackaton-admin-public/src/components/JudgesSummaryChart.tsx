import React from 'react';

interface JudgeSummaryItem {
  judge_id: string;
  judge_name: string;
  reviewed: number;
  pending: number;
}

interface Props {
  data: JudgeSummaryItem[];
  compact?: boolean;
}

const COLORS = {
  reviewed: '#10B981',
  pending: '#E5E7EB',
};

const JudgesSummaryChart: React.FC<Props> = ({ data, compact = false }) => {
  if (!data || data.length === 0) {
    return <div className="text-sm text-gray-500 italic">No judge assignments available.</div>;
  }

  return (
    <div className="w-full">
      <div className={`${compact ? 'max-h-64 overflow-auto' : ''}`}>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((d) => {
            const total = d.reviewed + d.pending;
            const percent = total === 0 ? 0 : Math.round((d.reviewed / total) * 100);

            return (
        <div key={d.judge_id} className="flex items-center gap-2">
          <div className="w-40 text-sm text-gray-700 truncate">{d.judge_name}</div>
                <div className="flex-1">
                  <div className="relative h-5 bg-gray-100 rounded-md overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0" style={{ width: '100%', background: COLORS.pending }} aria-hidden />
                    <div
                      className="absolute left-0 top-0 bottom-0 transition-all duration-200"
                      style={{ width: `${percent}%`, background: COLORS.reviewed }}
                      aria-hidden
                    />
                  </div>
                </div>
                <div className="w-24 text-sm text-gray-600 text-right">
                  <div><span className="font-semibold text-green-600">{d.reviewed}</span> <span className="text-gray-400">/ {total}</span></div>
                  <div className="text-xs text-gray-500">{percent}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 text-xs text-gray-500">
        <span className="inline-block w-3 h-3 mr-1 align-middle" style={{ background: COLORS.reviewed }} /> Reviewed
        <span className="inline-block w-3 h-3 mr-1 ml-4 align-middle" style={{ background: COLORS.pending }} /> Pending
      </div>
    </div>
  );
};

export default JudgesSummaryChart;
