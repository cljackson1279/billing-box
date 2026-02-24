import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";

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
      <main className="container max-w-3xl py-16 prose prose-sm dark:prose-invert">
        <Link to="/">
          <Button variant="ghost" size="sm" className="mb-6 no-underline"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        </Link>
        <h1>Privacy Policy</h1>
        <p className="text-muted-foreground"><strong>Effective: February 24, 2026</strong></p>
        <p>DispatchBoxAI ("we", "us", "our") operates dispatchboxai.com ("Site"). This Privacy Policy explains how we collect, use, and protect your information.</p>

        <h2>1. Information We Collect</h2>
        <h3>Account Information</h3>
        <ul>
          <li>Email address, password (hashed)</li>
          <li>Organization name, billing details (Stripe)</li>
        </ul>
        <h3>Warehouse Data (CSVs)</h3>
        <ul>
          <li>Client names, billing rates</li>
          <li>Inventory snapshots, order activity, receiving logs</li>
          <li>Calculated charges, invoices</li>
        </ul>
        <h3>Usage Data</h3>
        <ul>
          <li>Login times, feature usage</li>
          <li>Billing run frequency, recovered revenue amounts</li>
        </ul>

        <h2>2. How We Use Your Data</h2>
        <ul>
          <li>Process billing runs and generate invoices</li>
          <li>Sync invoices to QuickBooks Online</li>
          <li>Calculate revenue recovery metrics</li>
          <li>Send billing alerts and reports</li>
          <li>Improve billing engine accuracy</li>
          <li>Process $499/mo payments via Stripe</li>
        </ul>

        <h2>3. QuickBooks Integration</h2>
        <p>When connected, we create:</p>
        <ul>
          <li>QuickBooks Customers (from your 3PL clients)</li>
          <li>QuickBooks Items (storage, pick fees, etc.)</li>
          <li>QuickBooks Invoices (with line items)</li>
        </ul>
        <p>Your QuickBooks data remains in <strong>your QuickBooks account</strong>. We don't store QB credentials beyond OAuth tokens.</p>

        <h2>4. Data Sharing</h2>
        <h3>Third Parties</h3>
        <ul>
          <li>Stripe (payments)</li>
          <li>QuickBooks Online (invoices)</li>
          <li>Cloud hosting (encrypted)</li>
        </ul>
        <h3>No Sharing</h3>
        <ul>
          <li>We never sell your warehouse data</li>
          <li>No advertising partners</li>
          <li>No data brokers</li>
        </ul>

        <h2>5. Security</h2>
        <ul>
          <li>SOC2 Type II compliant hosting</li>
          <li>Multi-tenant row-level security (RLS)</li>
          <li>Stripe PCI Level 1 compliance</li>
          <li>HTTPS everywhere</li>
          <li>Regular security audits</li>
        </ul>

        <h2>6. Data Retention</h2>
        <ul>
          <li>CSVs: 24 months (billing disputes)</li>
          <li>Invoices: Permanent (audit trail)</li>
          <li>Account data: Until account deletion</li>
        </ul>

        <h2>7. Your Rights</h2>
        <p><strong>GDPR/CCPA:</strong></p>
        <ul>
          <li>Access, correct, delete your data</li>
          <li>Revoke QuickBooks connection</li>
          <li>Export all billing history</li>
          <li>Account deletion (permanently removes all data)</li>
        </ul>
        <p><strong>Contact:</strong> <a href="mailto:support@dispatchboxai.com">support@dispatchboxai.com</a></p>

        <h2>8. Children</h2>
        <p>Site for business users only (18+). No children's data collected.</p>

        <h2>9. Changes</h2>
        <p>We'll notify you of material changes via email.</p>
      </main>
    </div>
  );
}
