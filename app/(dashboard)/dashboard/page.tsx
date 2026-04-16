import { LayoutDashboard, TrendingUp, Package, DollarSign } from "lucide-react";

const stats = [
  {
    label: "Total Parts",
    value: "2,847",
    change: "+12.5%",
    icon: Package,
    gradient: "from-blue-500 to-cyan-500",
    shadowColor: "shadow-blue-500/20",
  },
  {
    label: "Revenue",
    value: "$48,290",
    change: "+8.2%",
    icon: DollarSign,
    gradient: "from-emerald-500 to-teal-500",
    shadowColor: "shadow-emerald-500/20",
  },
  {
    label: "Active Listings",
    value: "1,423",
    change: "+3.1%",
    icon: LayoutDashboard,
    gradient: "from-violet-500 to-purple-500",
    shadowColor: "shadow-violet-500/20",
  },
  {
    label: "Growth",
    value: "23.5%",
    change: "+2.4%",
    icon: TrendingUp,
    gradient: "from-amber-500 to-orange-500",
    shadowColor: "shadow-amber-500/20",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="group relative overflow-hidden rounded-2xl border border-white/20 bg-white/15 p-5 shadow-lg shadow-black/5 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl dark:border-white/10 dark:bg-black/20"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs font-medium text-emerald-500">
                  {stat.change}
                </p>
              </div>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} shadow-md ${stat.shadowColor}`}
              >
                <stat.icon className="h-5 w-5 text-white" />
              </div>
            </div>
            {/* Decorative gradient orb */}
            <div
              className={`absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-gradient-to-br ${stat.gradient} opacity-10 blur-2xl transition-opacity group-hover:opacity-20`}
            />
          </div>
        ))}
      </div>

      {/* Welcome card */}
      <div className="rounded-2xl border border-white/20 bg-white/15 p-8 shadow-lg shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-black/20">
        <h2 className="text-xl font-bold text-foreground">
          Welcome to AutoParts Dashboard
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Manage your auto parts inventory, track analytics, and list vehicles
          all from one place. Navigate using the sidebar to explore different
          sections.
        </p>
      </div>
    </div>
  );
}
