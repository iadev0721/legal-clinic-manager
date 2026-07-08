"use client"

import * as React from "react"
import { Pie, PieChart as RechartsPieChart } from "recharts"

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/shadcn/card"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/shadcn/chart"

interface PieChartProps {
    data: any[]
    config: ChartConfig
    dataKey: string
    nameKey: string
    title?: string
    innerRadius?: number
    disableAnimation?: boolean
}

const BLUE_PALETTE = [
    "#003366",
    "#3E7DBB",
    "#73ACE6",
    "#D4EAFF",
    "#2751BA",
    "#0A233C",
]

export function Pie2Chart({ data, config, dataKey, nameKey, title, innerRadius = 0, disableAnimation }: PieChartProps) {
    const processedData = React.useMemo(() => {
        return data.map((item, index) => ({
            ...item,
            fill: item.fill || BLUE_PALETTE[index % BLUE_PALETTE.length]
        }))
    }, [data])

    // Check if data is empty or has no values
    const hasData = processedData.length > 0 && processedData.some((item) => item[dataKey] > 0)

    return (
        <Card className="flex flex-col border-none shadow-none bg-transparent">
            {title && (
                <CardHeader className="items-center pb-0">
                    <CardTitle className="text-sky-950 text-2xl font-semibold font-serif leading-none">{title}</CardTitle>
                </CardHeader>
            )}
            <CardContent className="flex-1 pb-0 pt-0">
                {!hasData ? (
                    <div className="text-center py-16 bg-neutral-50 rounded-xl border border-dashed border-neutral-200 mx-auto aspect-square max-h-[250px] flex flex-col items-center justify-center">
                        <span className="icon-[mdi--chart-pie] text-6xl text-neutral-300 mb-3"></span>
                        <p className="text-sky-950/40 text-sm font-medium">No hay datos disponibles.</p>
                    </div>
                ) : (
                    <ChartContainer
                        config={config}
                        className="[&_.recharts-pie-label-text]:fill-foreground mx-auto aspect-square max-h-[250px] pb-0"
                    >
                        <RechartsPieChart>
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent hideLabel />}
                            />
                            <Pie
                                data={processedData}
                                dataKey={dataKey}
                                nameKey={nameKey}
                                innerRadius={innerRadius}
                                strokeWidth={2}
                                label
                                isAnimationActive={!disableAnimation}
                            />
                        </RechartsPieChart>
                    </ChartContainer>
                )}
            </CardContent>
            {hasData && (
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-4 mb-2 max-w-[240px] mx-auto">
                    {processedData.map((entry, index) => {
                        const key = entry[nameKey] as string
                        return (
                            <div key={index} className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: entry.fill }}
                                />
                                <span className="text-sky-950 font-medium text-sm capitalize">
                                    {config[key]?.label || entry[nameKey]}
                                </span>
                            </div>
                        )
                    })}
                </div>
            )}
        </Card>
    )
}
{/*

"use client"

import { TrendingUp } from "lucide-react"
import { Pie, PieChart } from "recharts"

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart"

export const description = "A pie chart with a label"

const chartData = [
    { browser: "chrome", visitors: 275, fill: "var(--color-chrome)" },
    { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
    { browser: "firefox", visitors: 187, fill: "var(--color-firefox)" },
    { browser: "edge", visitors: 173, fill: "var(--color-edge)" },
    { browser: "other", visitors: 90, fill: "var(--color-other)" },
]

const chartConfig = {
    visitors: {
        label: "Visitors",
    },
    chrome: {
        label: "Chrome",
        color: "var(--chart-1)",
    },
    safari: {
        label: "Safari",
        color: "var(--chart-2)",
    },
    firefox: {
        label: "Firefox",
        color: "var(--chart-3)",
    },
    edge: {
        label: "Edge",
        color: "var(--chart-4)",
    },
    other: {
        label: "Other",
        color: "var(--chart-5)",
    },
} satisfies ChartConfig

export function ChartPieLabel() {
    return (
        <Card className="flex flex-col">
            <CardHeader className="items-center pb-0">
                <CardTitle>Pie Chart - Label</CardTitle>
                <CardDescription>January - June 2024</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
                <ChartContainer
                    config={chartConfig}
                    className="[&_.recharts-pie-label-text]:fill-foreground mx-auto aspect-square max-h-[250px] pb-0"
                >
                    <PieChart>
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <Pie data={chartData} dataKey="visitors" label nameKey="browser" />
                    </PieChart>
                </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col gap-2 text-sm">
                <div className="flex items-center gap-2 leading-none font-medium">
                    Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
                </div>
                <div className="text-muted-foreground leading-none">
                    Showing total visitors for the last 6 months
                </div>
            </CardFooter>
        </Card>
    )
}
*/}