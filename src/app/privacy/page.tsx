import Header from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-void-black text-white">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">
          PRIVACY <span className="text-void-red">POLICY</span>
        </h1>
        <div className="space-y-6 text-gray-400">
          <section>
            <h2 className="text-xl font-bold mb-4 text-white">1. Information We Collect</h2>
            <p>We collect information you provide directly, such as your name, email address, and viewing preferences. We also automatically collect usage data including device information, browser type, pages visited, and timestamps to improve our service.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4 text-white">2. How We Use Your Information</h2>
            <p>We use your information to provide and improve our service, personalize your experience, send relevant notifications, and ensure the security of our platform. We do not sell your personal information to third parties.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4 text-white">3. Data Security</h2>
            <p>We implement appropriate security measures to protect your personal information, including encryption, secure servers, and regular security audits. However, no method of transmission over the internet is 100% secure.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4 text-white">4. Cookies</h2>
            <p>We use cookies and similar technologies to maintain sessions, remember preferences, and analyze usage patterns. You can control cookie settings through your browser preferences.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4 text-white">5. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data. You can manage your data through your account settings or by contacting us directly.</p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
