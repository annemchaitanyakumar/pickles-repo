import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
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
          Homely taste Pickles Policies
        </h1>

        <Tabs defaultValue="refund" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="refund">Refund Policy</TabsTrigger>
            <TabsTrigger value="privacy">Privacy Policy</TabsTrigger>
            <TabsTrigger value="terms">Terms of Service</TabsTrigger>
          </TabsList>

          <TabsContent value="refund" className="text-muted-foreground">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">Refund and Return Policy</h2>
            <div className="space-y-6">
              <section>
                <h3 className="text-lg font-semibold mb-2 text-foreground">1. Return Eligibility</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Returns are accepted for products that are received in a Delivery damaged, or incorrect Product.</li>
                  <li>Please note that perishable items such as sweets and snacks cannot be returned due to hygiene and safety reasons.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2 text-foreground">2. Initiation of Returns</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Notify our customer support team within 48 hours of receiving the product.</li>
                  <li>Contact us at ht_customercare@gmail.com</li>
                  <li>Provide order number, description of the issue, and photographs if applicable.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2 text-foreground">3. Return Process</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Our customer support team will guide you through the return process.</li>
                  <li>We may offer replacement or refund based on the situation.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2 text-foreground">4. Refund Policy</h3>
                <p>Once approved, refunds will be credited to the original payment method within 7-10 business days.</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2 text-foreground">5. Packaging and Condition</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Return items must be in original packaging and unused/unopened.</li>
                  <li>Package items securely to prevent transit damage.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2 text-foreground">6. Return Timeline</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Initiate returns within 2 days of receiving the product.</li>
                  <li>Allow 7-10 business days for processing refunds or replacements.</li>
                </ul>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="privacy" className="text-muted-foreground">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">Privacy Policy</h2>
            <div className="space-y-6">
              <section>
                <h3 className="text-lg font-semibold mb-2 text-foreground">Information We Collect</h3>
                <p>We collect information you provide directly to us, including name, email, address, and order details.</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2 text-foreground">How We Use Your Information</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Process your orders and payments</li>
                  <li>Send order confirmations and updates</li>
                  <li>Respond to your inquiries</li>
                  <li>Improve our services and products</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2 text-foreground">Information Security</h3>
                <p>We implement appropriate security measures to protect your personal information.</p>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="terms" className="text-muted-foreground">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">Terms of Service</h2>
            <div className="space-y-6">
              <section>
                <h3 className="text-lg font-semibold mb-2 text-foreground">Acceptance of Terms</h3>
                <p>By accessing and using our website, you accept and agree to be bound by these Terms of Service.</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2 text-foreground">Products and Services</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>All product descriptions are accurate to the best of our knowledge</li>
                  <li>We reserve the right to modify or discontinue products without notice</li>
                  <li>Prices are subject to change without notice</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2 text-foreground">User Responsibilities</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide accurate account information</li>
                  <li>Maintain the security of your account</li>
                  <li>Comply with all applicable laws and regulations</li>
                </ul>
              </section>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
