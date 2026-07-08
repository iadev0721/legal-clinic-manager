"use client";

import * as React from "react";
import {
  Bar,
  BarChart as RechartsBarChart,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/shadcn/chart";

interface BarChartProps {
  data: any[];
  config: ChartConfig;
  dataKey: string;
  nameKey: string;
  title?: string;
  disableAnimation?: boolean;
}

export function BarChart({
  data,
  config,
  dataKey,
  nameKey,
  title,
  disableAnimation,
}: BarChartProps) {
  const processedData = React.useMemo(() => {
    return data.map((item) => ({
      ...item,
      fill: "#3E7DBB",
    }));
  }, [data]);

  // Check if data is empty or has no values
  const hasData = processedData.length > 0 && processedData.some((item) => item[dataKey] > 0);

  return (
    <Card className="flex flex-col border-none shadow-none bg-transparent">
      {title && (
        <CardHeader className="items-center pb-0">
          <CardTitle className="text-sky-950 text-2xl font-semibold font-serif leading-none">
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex-1 pb-0">
        {!hasData ? (
          <div className="text-center py-16 bg-neutral-50 rounded-xl border border-dashed border-neutral-200 h-[300px] flex flex-col items-center justify-center">
            <span className="icon-[mdi--chart-bar] text-6xl text-neutral-300 mb-3"></span>
            <p className="text-sky-950/40 text-sm font-medium">No hay datos disponibles.</p>
          </div>
        ) : (
          <ChartContainer config={config} className="h-[300px] w-full">
            <RechartsBarChart data={processedData} margin={{ bottom: 20, top: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey={nameKey}
                angle={-45}
                textAnchor="end"
                height={130}
                interval={0}
                tick={{ fill: "#0F172A", fontSize: 12 }}
              />
              <YAxis tick={{ fill: "#0F172A", fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey={dataKey} fill="#3E7DBB" radius={[8, 8, 0, 0]} maxBarSize={60} isAnimationActive={!disableAnimation} />
            </RechartsBarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
