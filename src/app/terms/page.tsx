import Header from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-void-black text-white">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">
          TERMS OF <span className="text-void-red">SERVICE</span>
        </h1>
        <div className="space-y-6 text-gray-400">
          <section>
            <h2 className="text-xl font-bold mb-4 text-white">1. Acceptance of Terms</h2>
            <p>By accessing and using AnimeVoid, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service. We reserve the right to modify these terms at any time, and continued use of the service constitutes acceptance of any changes.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4 text-white">2. Use of Service</h2>
            <p>You may use our service only for lawful purposes and in accordance with these Terms. You agree not to use the service to distribute harmful content, attempt unauthorized access, interfere with the platform, or violate any applicable laws. Automated access without permission is prohibited.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4 text-white">3. User Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials. You must notify us immediately of any unauthorized use. You may not share your account or create multiple accounts. We reserve the right to terminate accounts that violate these terms.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4 text-white">4. Content</h2>
            <p>All content on AnimeVoid, including but not limited to anime episodes, artwork, and descriptions, is protected by copyright laws. You may not reproduce, distribute, or create derivative works without permission. User-submitted content must not infringe on third-party rights.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4 text-white">5. Privacy</h2>
            <p>Your use of the service is also governed by our Privacy Policy. Please review it to understand our practices regarding data collection and use.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4 text-white">6. Limitation of Liability</h2>
            <p>AnimeVoid is provided as-is. We are not liable for any damages arising from the use of the service. We do not guarantee uninterrupted access or error-free operation.</p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
