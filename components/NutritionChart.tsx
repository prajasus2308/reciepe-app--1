
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface NutritionChartProps {
  nutrition: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

const NutritionChart: React.FC<NutritionChartProps> = ({ nutrition }) => {
  const data = [
    { name: 'Protein', value: nutrition.protein, color: '#10b981' },
    { name: 'Carbs', value: nutrition.carbs, color: '#3b82f6' },
    { name: 'Fat', value: nutrition.fat, color: '#f59e0b' },
  ];

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default NutritionChart;
