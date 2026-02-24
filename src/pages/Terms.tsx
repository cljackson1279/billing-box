import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";

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
      <main className="container max-w-3xl py-16 prose prose-sm dark:prose-invert">
        <Link to="/">
          <Button variant="ghost" size="sm" className="mb-6 no-underline"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        </Link>
        <h1>Terms of Service</h1>
        <p className="text-muted-foreground"><strong>Effective: February 24, 2026</strong></p>

        <h2>1. Acceptance</h2>
        <p>By using DispatchBoxAI ("Service"), you agree to these Terms.</p>

        <h2>2. Service Description</h2>
        <p>DispatchBoxAI processes warehouse CSVs to:</p>
        <ul>
          <li>Detect billing leakage</li>
          <li>Calculate accurate client charges</li>
          <li>Generate invoices</li>
          <li>Sync to QuickBooks Online</li>
        </ul>
        <p><strong>Not a WMS.</strong> We're billing automation only.</p>

        <h2>3. Pricing & Payment</h2>
        <ul>
          <li><strong>$499/month</strong> (USD), paid upfront</li>
          <li>Billed same date monthly via Stripe</li>
          <li>No refunds (pro-rated cancellation)</li>
          <li>Upgrade/downgrade via Stripe portal</li>
        </ul>
        <p><strong>Paywall:</strong> New users pay before full access.</p>

        <h2>4. Your Data</h2>
        <p><strong>You own:</strong> All warehouse data, invoices, calculations</p>
        <p><strong>We own:</strong> Platform, billing engine algorithms</p>
        <h3>Your Responsibility</h3>
        <ul>
          <li>Accurate CSV data</li>
          <li>Valid billing rates</li>
          <li>Client authorization for billing</li>
        </ul>

        <h2>5. QuickBooks Integration</h2>
        <p>You authorize DispatchBoxAI to:</p>
        <ul>
          <li>Create QuickBooks Customers/Items/Invoices</li>
          <li>Access your QuickBooks Online account (OAuth)</li>
        </ul>

        <h2>6. Usage Limits</h2>
        <p>Starter Plan ($499/mo):</p>
        <ul>
          <li>✅ Unlimited clients</li>
          <li>✅ Unlimited CSVs (50MB max)</li>
          <li>✅ Unlimited billing runs</li>
          <li>✅ Unlimited invoices</li>
          <li>✅ QuickBooks sync (500/mo)</li>
        </ul>

        <h2>7. Uptime SLA</h2>
        <p>99.5% monthly uptime. Credits for downtime &gt;4hrs.</p>

        <h2>8. Termination</h2>
        <ul>
          <li><strong>You:</strong> Cancel via Stripe portal anytime</li>
          <li><strong>Us:</strong> 30 days notice, unpaid invoices, abuse</li>
          <li><strong>Data:</strong> Available 30 days post-termination</li>
        </ul>

        <h2>9. Disclaimers</h2>
        <ul>
          <li><strong>NO WARRANTY</strong> on revenue recovery amounts</li>
          <li>Billing calculations based on your data/rates</li>
          <li>Not financial/tax/legal advice</li>
          <li>Backup your CSVs</li>
        </ul>

        <h2>10. Governing Law</h2>
        <p>Delaware, USA. Disputes via arbitration.</p>
        <p><strong>Questions?</strong> <a href="mailto:support@dispatchboxai.com">support@dispatchboxai.com</a></p>
      </main>
    </div>
  );
}
