import { BarChart2, TrendingUp, Activity, PieChart } from "lucide-react";

const metrics = [
  {
    title: "Page Views",
    value: "124,892",
    change: "+14.2%",
    icon: Activity,
    gradient: "from-rose-500 to-pink-500",
  },
  {
    title: "Conversion Rate",
    value: "3.24%",
    change: "+0.8%",
    icon: TrendingUp,
    gradient: "from-indigo-500 to-violet-500",
  },
  {
    title: "Avg. Order Value",
    value: "$127.50",
    change: "+5.1%",
    icon: BarChart2,
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    title: "Categories",
    value: "48",
    change: "+3",
    icon: PieChart,
    gradient: "from-amber-500 to-orange-500",
  },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      {/* Metrics grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.title}
            className="group relative overflow-hidden rounded-2xl border border-white/20 bg-white/15 p-5 shadow-lg shadow-black/5 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl dark:border-white/10 dark:bg-black/20"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {metric.title}
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                  {metric.value}
                </p>
                <p className="mt-1 text-xs font-medium text-emerald-500">
                  {metric.change}
                </p>
              </div>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${metric.gradient} shadow-md`}
              >
                <metric.icon className="h-5 w-5 text-white" />
              </div>
            </div>
            <div
              className={`absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-gradient-to-br ${metric.gradient} opacity-10 blur-2xl transition-opacity group-hover:opacity-20`}
            />
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="rounded-2xl border border-white/20 bg-white/15 p-8 shadow-lg shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-black/20">
        <h2 className="text-xl font-bold text-foreground">
          Analytics Overview
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Detailed analytics and reporting coming soon. Track your auto parts
          sales, inventory turnover, and market trends.
        </p>
        <div className="mt-6 flex h-64 items-center justify-center rounded-xl border border-dashed border-white/20 dark:border-white/10">
          <p className="text-sm text-muted-foreground">
            Chart visualizations coming soon
          </p>
        </div>
      </div>
    </div>
  );
}
