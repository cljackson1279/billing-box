import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import { Separator } from "@/components/ui/separator";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center gap-4">
          <Link to="/" className="flex items-center gap-2">
            <BrandIcon size="md" />
            <span className="font-bold text-lg text-foreground">DispatchBox<span className="text-gradient-brand">AI</span></span>
          </Link>
        </div>
      </nav>
      <main className="container max-w-3xl py-12 px-6">
        <Link to="/">
          <Button variant="ghost" size="sm" className="mb-8"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Effective: February 24, 2026</p>

        <Separator className="mb-8" />

        <section className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Acceptance</h2>
            <p className="text-muted-foreground leading-relaxed">By using DispatchBoxAI ("Service"), you agree to these Terms.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Service Description</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">DispatchBoxAI processes warehouse CSVs to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1.5 ml-2">
              <li>Detect billing leakage</li>
              <li>Calculate accurate client charges</li>
              <li>Generate invoices</li>
              <li>Sync to QuickBooks Online</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3"><strong className="text-foreground">Not a WMS.</strong> We're billing automation only.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Pricing & Payment</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1.5 ml-2">
              <li><strong className="text-foreground">$499/month</strong> (USD), paid upfront</li>
              <li>Billed same date monthly via Stripe</li>
              <li>No refunds (pro-rated cancellation)</li>
              <li>Upgrade/downgrade via Stripe portal</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3"><strong className="text-foreground">Paywall:</strong> New users pay before full access.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Your Data</h2>
            <div className="space-y-2 mb-4">
              <p className="text-muted-foreground"><strong className="text-foreground">You own:</strong> All warehouse data, invoices, calculations</p>
              <p className="text-muted-foreground"><strong className="text-foreground">We own:</strong> Platform, billing engine algorithms</p>
            </div>
            <h3 className="text-base font-medium text-foreground mb-2">Your Responsibility</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1.5 ml-2">
              <li>Accurate CSV data</li>
              <li>Valid billing rates</li>
              <li>Client authorization for billing</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. QuickBooks Integration</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">You authorize DispatchBoxAI to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1.5 ml-2">
              <li>Create QuickBooks Customers/Items/Invoices</li>
              <li>Access your QuickBooks Online account (OAuth)</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Usage Limits</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Starter Plan ($499/mo):</p>
            <ul className="text-muted-foreground space-y-1.5 ml-2">
              <li>✅ Unlimited clients</li>
              <li>✅ Unlimited CSVs (50MB max)</li>
              <li>✅ Unlimited billing runs</li>
              <li>✅ Unlimited invoices</li>
              <li>✅ QuickBooks sync (500/mo)</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Uptime SLA</h2>
            <p className="text-muted-foreground leading-relaxed">99.5% monthly uptime. Credits for downtime &gt;4hrs.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Termination</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1.5 ml-2">
              <li><strong className="text-foreground">You:</strong> Cancel via Stripe portal anytime</li>
              <li><strong className="text-foreground">Us:</strong> 30 days notice, unpaid invoices, abuse</li>
              <li><strong className="text-foreground">Data:</strong> Available 30 days post-termination</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Disclaimers</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1.5 ml-2">
              <li><strong className="text-foreground">NO WARRANTY</strong> on revenue recovery amounts</li>
              <li>Billing calculations based on your data/rates</li>
              <li>Not financial/tax/legal advice</li>
              <li>Backup your CSVs</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">Delaware, USA. Disputes via arbitration.</p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <strong className="text-foreground">Questions?</strong>{" "}
              <a href="mailto:support@dispatchboxai.com" className="text-primary hover:underline">support@dispatchboxai.com</a>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
