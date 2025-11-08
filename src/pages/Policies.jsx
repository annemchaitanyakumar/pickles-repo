import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";

export default function Policies() {
  return (
    <div className="min-h-screen bg-gradient-warm py-24 px-4 md:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto bg-card rounded-lg shadow-warm p-6 md:p-8"
      >
        <h1 className="text-3xl font-bold text-center mb-8 text-foreground">
          Homely Taste Pickles — Store Policies
        </h1>

        <Tabs defaultValue="refund" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="refund">Refund & Return</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="shipping">Shipping</TabsTrigger>
            <TabsTrigger value="terms">Terms</TabsTrigger>
          </TabsList>

          {/* Refund & Return Policy */}
          <TabsContent value="refund" className="text-muted-foreground space-y-6">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">
              I. Refund & Return Policy
            </h2>

            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">1. Overview</h3>
              <p>
                Homely Taste Pickles values customer satisfaction above all else. Every jar is packed
                with care and sealed for freshness. In rare cases of damaged, expired, or incorrect
                items, we ensure a fair return or refund process.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">2. Eligibility</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Eligible for refund or replacement if received damaged, expired, or incorrect.</li>
                <li>Perishable food items (pickles, sweets, snacks) cannot be returned once opened or used.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">3. Initiating a Return</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Contact our team within 48 hours of delivery at <strong>ht_customercare@gmail.com</strong>.</li>
                <li>Provide your order number, issue details, and photos if applicable.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">4. Review & Resolution</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Requests reviewed within 2–3 business days.</li>
                <li>Refunds processed within 7–10 business days or replacement offered as appropriate.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">5. Packaging & Condition</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Returned items must be unused, unopened, and in original packaging.</li>
                <li>Items must be securely packed to prevent transit damage.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">6. Exceptions</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Returns after 48 hours will not be accepted.</li>
                <li>Gift packs, trial kits, and combo offers are non-refundable.</li>
              </ul>
            </section>
          </TabsContent>

          {/* Privacy Policy */}
          <TabsContent value="privacy" className="text-muted-foreground space-y-6">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">
              II. Privacy Policy
            </h2>

            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">1. Introduction</h3>
              <p>
                Your privacy is our recipe for trust. This policy explains how we collect, use, and protect your personal data.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">2. Information We Collect</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Personal details: name, email, phone, and address.</li>
                <li>Transaction data: order history, payment status, cart contents.</li>
                <li>Technical data: IP address, browser type, device details.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">3. Why We Collect It</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>To process and deliver your orders efficiently.</li>
                <li>To send confirmations, updates, and support messages.</li>
                <li>To personalize your shopping experience.</li>
                <li>To comply with legal and tax obligations.</li>
              </ul>
              <p className="mt-2">
                Even if you log in without ordering, we store basic data (like your name and email)
                to personalize your visit and keep your session secure.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">4. Data Storage & Security</h3>
              <p>
                All data is encrypted and securely stored. Transactions use SSL protection, and access is
                limited to authorized personnel only.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">5. Data Sharing</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Payment gateways (Razorpay, PayPal)</li>
                <li>Delivery and logistics partners</li>
                <li>Official email and SMS providers for order updates</li>
              </ul>
              <p>We never sell or rent your data to third parties.</p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">6. Your Rights</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access or correct your personal information.</li>
                <li>Request deletion of your account.</li>
                <li>Opt out of promotional messages.</li>
              </ul>
            </section>
          </TabsContent>

          {/* Shipping Policy */}
          <TabsContent value="shipping" className="text-muted-foreground space-y-6">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">
              III. Shipping Policy
            </h2>

            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">1. Dispatch & Delivery</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Orders dispatched within 1–2 business days.</li>
                <li>Delivery takes 3–7 business days depending on location.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">2. Shipping Charges</h3>
              <p>
                Shipping fees (if applicable) are displayed during checkout. Free delivery applies on
                certain promotions or order amounts.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">3. Tracking & Damages</h3>
              <p>
                Tracking details are shared via email/SMS after dispatch. If a package is damaged or
                tampered with, refuse delivery or contact us within 24 hours with proof.
              </p>
            </section>
          </TabsContent>

          {/* Terms of Service */}
          <TabsContent value="terms" className="text-muted-foreground space-y-6">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">
              IV. Terms of Service
            </h2>

            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">1. Acceptance</h3>
              <p>
                By using this website or making a purchase, you agree to abide by these terms.
                You must be at least 18 years old to place orders.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">2. Products & Pricing</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>All prices are in INR and include applicable taxes.</li>
                <li>Product descriptions and images are accurate to our best knowledge.</li>
                <li>We reserve the right to change prices or discontinue items without prior notice.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">3. User Responsibilities</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide accurate personal and delivery information.</li>
                <li>Keep your account credentials secure.</li>
                <li>Do not misuse the website for fraudulent activity.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">4. Limitation of Liability</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Homely Taste Pickles is not responsible for delays caused by third-party couriers.</li>
                <li>We are not liable for damages due to improper storage post-delivery.</li>
                <li>Indirect or consequential losses are excluded to the maximum extent permitted by law.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-foreground mb-2">5. Contact & Support</h3>
              <p>
                For any policy or grievance queries, contact us at{" "}
                <strong>ht_customercare@gmail.com</strong>. Our team will respond within 2–4 business
                days.
              </p>
            </section>
          </TabsContent>
        </Tabs>

        <p className="text-sm text-center text-muted-foreground mt-10">
          © {new Date().getFullYear()} Homely Taste Pickles — Your trust is our main ingredient.
        </p>
      </motion.div>
    </div>
  );
}