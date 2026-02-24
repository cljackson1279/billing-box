import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqSections = [
  {
    title: "Getting Started",
    items: [
      {
        q: "How does DispatchBoxAI work?",
        a: (
          <ol className="list-decimal list-inside space-y-1">
            <li>Upload your warehouse CSVs (inventory, orders, receiving, returns)</li>
            <li>Set client billing rates</li>
            <li>Run billing → See missed revenue automatically</li>
            <li>Generate professional invoices → Sync to QuickBooks ✓</li>
          </ol>
        ),
      },
      {
        q: "What CSVs do I need?",
        a: (
          <ul className="list-disc list-inside space-y-1">
            <li>Inventory snapshots (client_id, pallet_count, storage dates)</li>
            <li>Order activity (picks, packs, kitting)</li>
            <li>Receiving logs (pallets received)</li>
            <li>Client rate tables ($/pallet/day, pick fees, etc.)</li>
            <li>Returns logs (optional)</li>
          </ul>
        ),
      },
      {
        q: "How fast is setup?",
        a: "Less than 10 minutes to first recovered revenue. No IT team required.",
      },
    ],
  },
  {
    title: "Billing & Pricing",
    items: [
      { q: "How much does it cost?", a: "$499/month. New users pay immediately after signup. Cancel anytime." },
      { q: "What if I don't recover $3k+/month?", a: "Our customers typically recover $3k–$5k/month in billing leakage. If we don't pay for ourselves in 30 days, cancel risk-free." },
      { q: "Can I try it free?", a: "Payment required at signup for full access. Month-to-month, no contracts." },
    ],
  },
  {
    title: "Integrations",
    items: [
      { q: "Does it sync with QuickBooks?", a: "✅ Deep 2-way sync. Invoices auto-create in QuickBooks Online with customers, items, and line items." },
      { q: "What about my WMS?", a: "Upload CSVs from any system. Shopify/WMS/carrier integrations coming 2026." },
    ],
  },
  {
    title: "Technical",
    items: [
      { q: "What data do you store?", a: "Your warehouse CSVs and billing calculations only. No customer PII beyond what's needed for invoicing." },
      { q: "Is my data secure?", a: "SOC2-compliant hosting, multi-tenant RLS, encrypted storage." },
      { q: "How often should I run billing?", a: "Monthly (or weekly for high-volume 3PLs)." },
    ],
  },
  {
    title: "Support",
    items: [
      {
        q: "How do I get help?",
        a: (
          <>
            Priority email <a href="mailto:support@dispatchboxai.com" className="text-primary underline">support@dispatchboxai.com</a> (paid subscribers only). Documentation + video tutorials at dispatchboxai.com/docs.
          </>
        ),
      },
      { q: "Can I cancel anytime?", a: "Yes. Use the Stripe Customer Portal (Dashboard → Manage Billing)." },
    ],
  },
];

export default function FAQ() {
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
      <main className="container max-w-3xl py-16">
        <Link to="/">
          <Button variant="ghost" size="sm" className="mb-6"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        </Link>
        <h1 className="text-4xl font-extrabold mb-2">Frequently Asked Questions</h1>
        <p className="text-muted-foreground mb-10">Everything you need to know about DispatchBoxAI.</p>

        {faqSections.map((section) => (
          <div key={section.title} className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-3">{section.title}</h2>
            <Accordion type="multiple" className="border rounded-xl overflow-hidden">
              {section.items.map((item, i) => (
                <AccordionItem key={i} value={`${section.title}-${i}`} className="border-b last:border-b-0">
                  <AccordionTrigger className="px-5 text-left">{item.q}</AccordionTrigger>
                  <AccordionContent className="px-5 text-muted-foreground">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
      </main>
    </div>
  );
}
