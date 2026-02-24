import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import { Separator } from "@/components/ui/separator";

export default function Privacy() {
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

        <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-2">Effective: February 24, 2026</p>
        <p className="text-muted-foreground leading-relaxed mb-8">
          DispatchBoxAI ("we", "us", "our") operates dispatchboxai.com ("Site"). This Privacy Policy explains how we collect, use, and protect your information.
        </p>

        <Separator className="mb-8" />

        <section className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Information We Collect</h2>

            <h3 className="text-base font-medium text-foreground mb-2">Account Information</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1.5 ml-2 mb-4">
              <li>Email address, password (hashed)</li>
              <li>Organization name, billing details (Stripe)</li>
            </ul>

            <h3 className="text-base font-medium text-foreground mb-2">Warehouse Data (CSVs)</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1.5 ml-2 mb-4">
              <li>Client names, billing rates</li>
              <li>Inventory snapshots, order activity, receiving logs</li>
              <li>Calculated charges, invoices</li>
            </ul>

            <h3 className="text-base font-medium text-foreground mb-2">Usage Data</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1.5 ml-2">
              <li>Login times, feature usage</li>
              <li>Billing run frequency, recovered revenue amounts</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. How We Use Your Data</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1.5 ml-2">
              <li>Process billing runs and generate invoices</li>
              <li>Sync invoices to QuickBooks Online</li>
              <li>Calculate revenue recovery metrics</li>
              <li>Send billing alerts and reports</li>
              <li>Improve billing engine accuracy</li>
              <li>Process $499/mo payments via Stripe</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. QuickBooks Integration</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">When connected, we create:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1.5 ml-2 mb-4">
              <li>QuickBooks Customers (from your 3PL clients)</li>
              <li>QuickBooks Items (storage, pick fees, etc.)</li>
              <li>QuickBooks Invoices (with line items)</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              Your QuickBooks data remains in <strong className="text-foreground">your QuickBooks account</strong>. We don't store QB credentials beyond OAuth tokens.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Data Sharing</h2>

            <h3 className="text-base font-medium text-foreground mb-2">Third Parties</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1.5 ml-2 mb-4">
              <li>Stripe (payments)</li>
              <li>QuickBooks Online (invoices)</li>
              <li>Cloud hosting (encrypted)</li>
            </ul>

            <h3 className="text-base font-medium text-foreground mb-2">No Sharing</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1.5 ml-2">
              <li>We never sell your warehouse data</li>
              <li>No advertising partners</li>
              <li>No data brokers</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Security</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1.5 ml-2">
              <li>SOC2 Type II compliant hosting</li>
              <li>Multi-tenant row-level security (RLS)</li>
              <li>Stripe PCI Level 1 compliance</li>
              <li>HTTPS everywhere</li>
              <li>Regular security audits</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Data Retention</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1.5 ml-2">
              <li>CSVs: 24 months (billing disputes)</li>
              <li>Invoices: Permanent (audit trail)</li>
              <li>Account data: Until account deletion</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Your Rights</h2>
            <p className="text-sm font-medium text-foreground mb-2">GDPR / CCPA:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1.5 ml-2 mb-4">
              <li>Access, correct, delete your data</li>
              <li>Revoke QuickBooks connection</li>
              <li>Export all billing history</li>
              <li>Account deletion (permanently removes all data)</li>
            </ul>
            <p className="text-muted-foreground">
              <strong className="text-foreground">Contact:</strong>{" "}
              <a href="mailto:support@dispatchboxai.com" className="text-primary hover:underline">support@dispatchboxai.com</a>
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Children</h2>
            <p className="text-muted-foreground leading-relaxed">Site for business users only (18+). No children's data collected.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Changes</h2>
            <p className="text-muted-foreground leading-relaxed">We'll notify you of material changes via email.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
