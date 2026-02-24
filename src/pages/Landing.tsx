import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, FileSpreadsheet, Shield, Zap, TrendingUp, DollarSign, CheckCircle2, XCircle, Link2 } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import heroBg from "@/assets/hero-bg.jpg";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const features = [
  {
    icon: FileSpreadsheet,
    title: "CSV Upload & Auto-Map",
    description: "Drag-drop inventory, order, and receiving files. AI auto-detects columns and validates data instantly.",
  },
  {
    icon: DollarSign,
    title: "Billing Engine",
    description: "Automated storage, receiving, and handling charge calculations using your custom rate tables.",
  },
  {
    icon: TrendingUp,
    title: "Revenue Recovery",
    description: "Identify missed charges and billing gaps. Recover thousands in unbilled warehouse services.",
  },
  {
    icon: BarChart3,
    title: "Smart Dashboards",
    description: "Real-time visibility into recoverable revenue, client leakage, and billing run history.",
  },
  {
    icon: Shield,
    title: "Multi-Tenant Secure",
    description: "Organization-level data isolation with row-level security. Your data stays yours.",
  },
  {
    icon: Link2,
    title: "Deep QuickBooks Integration",
    description: "Invoices appear in QuickBooks automatically. Clients, line items, and charge types all mapped — zero double-entry.",
    highlight: true,
  },
];

const stats = [
  { value: "$42K", label: "Avg. Revenue Recovered", sublabel: "per warehouse / year" },
  { value: "87%", label: "Billing Accuracy Boost", sublabel: "vs. manual processes" },
  { value: "3 min", label: "Upload to Invoice", sublabel: "end-to-end automation" },
];

const comparison = [
  {
    feature: "QuickBooks Integration",
    dispatchbox: { value: "DEEP — invoices appear automatically", positive: true },
    competitor: { value: "CSV export only", positive: false },
  },
  {
    feature: "Revenue Recovery Engine",
    dispatchbox: { value: "AI-powered gap detection", positive: true },
    competitor: { value: "Manual review required", positive: false },
  },
  {
    feature: "Automated Billing Runs",
    dispatchbox: { value: "One-click, fully automated", positive: true },
    competitor: { value: "Spreadsheet-based", positive: false },
  },
  {
    feature: "Invoice Generation",
    dispatchbox: { value: "Instant PDF & CSV invoices", positive: true },
    competitor: { value: "Manual formatting", positive: false },
  },
  {
    feature: "Built for 3PLs",
    dispatchbox: { value: "Storage, pick, pack, receiving rates", positive: true },
    competitor: { value: "Generic billing software", positive: false },
  },
  {
    feature: "Price",
    dispatchbox: { value: "$499/month flat", positive: true },
    competitor: { value: "$800–$2,000+/month", positive: false },
  },
];

export default function Landing() {
  const { session, displayName, initials, profile, isLoading } = useAuth();
  const isSignedIn = !!session;
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandIcon size="md" />
            <span className="font-bold text-lg text-foreground">DispatchBox<span className="text-gradient-brand">AI</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#compare" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Compare</a>
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-3">
            {isSignedIn ? (
              <>
                <Link to="/dashboard">
                  <Button variant="hero" size="sm">
                    Go to Dashboard <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
                <Link to="/dashboard" className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground hidden md:inline">{displayName}</span>
                </Link>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">Log in</Button>
                </Link>
                <Link to="/signup">
                  <Button variant="hero" size="sm">
                    Start Free <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <img src={heroBg} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="animate-fade-in-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
                <Zap className="h-3.5 w-3.5" /> AI-Powered Revenue Recovery for 3PLs
              </span>
            </div>
            <h1 className="animate-fade-in-up-delay-1 text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
              Stop Leaving
              <br />
              <span className="text-gradient-brand">Revenue on the Table</span>
            </h1>
            <p className="animate-fade-in-up-delay-2 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              DispatchBoxAI automates billing, identifies missed charges, and generates invoices
              for small 3PL warehouses — so you get paid for every pallet stored and every order shipped.
            </p>
            {/* QB callout in hero */}
            <div className="animate-fade-in-up-delay-2 inline-flex items-center gap-2 rounded-lg border border-[#2CA01C]/30 bg-[#2CA01C]/5 px-4 py-2 text-sm text-[#2CA01C] font-medium mb-8">
              <CheckCircle2 className="h-4 w-4" />
              DEEP QuickBooks integration — invoices appear automatically
            </div>
            <div className="animate-fade-in-up-delay-3 flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button variant="hero" size="lg" className="text-base px-8">
                  Start Recovering Revenue <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="hero-outline" size="lg" className="text-base px-8">
                  View Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-y border-border">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl md:text-5xl font-extrabold text-gradient-brand mb-2">{stat.value}</div>
                <div className="text-sm font-semibold text-foreground">{stat.label}</div>
                <div className="text-xs text-muted-foreground">{stat.sublabel}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to
              <span className="text-gradient-brand"> Bill Accurately</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From CSV upload to invoice delivery — automate the entire 3PL billing workflow.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className={`group relative p-6 rounded-xl border shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 ${
                  (feature as any).highlight
                    ? "border-[#2CA01C]/40 bg-[#2CA01C]/5 hover:bg-[#2CA01C]/10"
                    : "border-border bg-card"
                }`}
              >
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-4 transition-colors ${
                  (feature as any).highlight
                    ? "bg-[#2CA01C]/20 group-hover:bg-[#2CA01C]/30"
                    : "bg-primary/10 group-hover:bg-primary/20"
                }`}>
                  <feature.icon className={`h-5 w-5 ${(feature as any).highlight ? "text-[#2CA01C]" : "text-primary"}`} />
                </div>
                {(feature as any).highlight && (
                  <span className="absolute top-4 right-4 text-xs font-semibold text-[#2CA01C] bg-[#2CA01C]/10 px-2 py-0.5 rounded-full">NEW</span>
                )}
                <h3 className="font-semibold text-lg mb-2 text-card-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-gradient-navy text-primary-foreground">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Three Steps to Full Revenue Recovery
            </h2>
            <p className="opacity-70 max-w-xl mx-auto">
              Get from spreadsheet chaos to accurate invoices in minutes, not days.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Upload Your Data", desc: "Drop your inventory, orders, and receiving CSVs. We auto-detect and map columns." },
              { step: "02", title: "Run Billing Engine", desc: "Our engine calculates every charge against your rate tables. See what you're owed." },
              { step: "03", title: "Sync to QuickBooks", desc: "Generate invoices and sync them directly to QuickBooks Online — no CSV export, no double-entry." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="text-6xl font-extrabold text-gradient-brand mb-4">{item.step}</div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="opacity-70 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section id="compare" className="py-24">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why 3PLs Choose
              <span className="text-gradient-brand"> DispatchBoxAI</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              See how we compare to generic warehouse management and billing tools.
            </p>
          </div>
          <div className="max-w-3xl mx-auto overflow-hidden rounded-xl border border-border shadow-card">
            <div className="grid grid-cols-3 bg-muted/50 px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <span>Feature</span>
              <span className="text-center text-primary">DispatchBoxAI</span>
              <span className="text-center">PackemWMS / Others</span>
            </div>
            {comparison.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-3 px-6 py-4 items-center gap-4 ${i % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
              >
                <span className="text-sm font-medium text-foreground">{row.feature}</span>
                <div className="flex items-center gap-2 justify-center">
                  <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                  <span className="text-xs text-foreground text-center">{row.dispatchbox.value}</span>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground text-center">{row.competitor.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-navy text-primary-foreground">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Recover Your Revenue?
            </h2>
            <p className="opacity-70 mb-8">
              Join 3PL warehouses already using DispatchBoxAI to eliminate billing leakage and sync invoices directly to QuickBooks.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button variant="hero" size="lg" className="text-base px-10">
                  Get Started Free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button variant="hero-outline" size="lg" className="text-base px-10">
                  See Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BrandIcon size="sm" />
            <span className="text-sm font-semibold text-foreground">DispatchBoxAI</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 DispatchBoxAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
