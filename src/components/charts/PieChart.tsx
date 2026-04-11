import React from 'react';
import {View} from 'react-native';
import Svg, {Circle} from 'react-native-svg';

interface PieChartSegment {
  color: string;
  value: number;
}

interface PieChartProps {
  size?: number;
  strokeWidth?: number;
  segments: PieChartSegment[];
}

export const PieChart = ({
  size = 220,
  strokeWidth = 34,
  segments,
}: PieChartProps): React.JSX.Element => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let accumulated = 0;

  return (
    <View style={{alignItems: 'center', justifyContent: 'center'}}>
      <Svg height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map(segment => {
          const ratio = total > 0 ? segment.value / total : 0;
          const dashArray = `${circumference * ratio} ${circumference}`;
          const dashOffset = -circumference * accumulated;
          accumulated += ratio;

          return (
            <Circle
              key={`${segment.color}-${segment.value}`}
              cx={size / 2}
              cy={size / 2}
              fill="transparent"
              r={radius}
              rotation="-90"
              origin={`${size / 2}, ${size / 2}`}
              stroke={segment.color}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              strokeLinecap="butt"
              strokeWidth={strokeWidth}
            />
          );
        })}
      </Svg>
    </View>
  );
};
