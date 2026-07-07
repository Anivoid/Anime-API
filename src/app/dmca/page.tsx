import Header from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function DMCAPage() {
  return (
    <div className="min-h-screen bg-void-black text-white">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">
          DMCA <span className="text-void-red">POLICY</span>
        </h1>
        <div className="space-y-6 text-gray-400">
          <section>
            <h2 className="text-xl font-bold mb-4 text-white">1. Digital Millennium Copyright Act</h2>
            <p>AnimeVoid respects the intellectual property rights of others and expects users to do the same. In accordance with the Digital Millennium Copyright Act of 1998 (DMCA), we will respond expeditiously to claims of copyright infringement that are reported to our designated copyright agent.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4 text-white">2. Filing a DMCA Notice</h2>
            <p>If you believe that your work has been copied and is accessible on AnimeVoid in a way that constitutes copyright infringement, you may notify our copyright agent with the following information: identification of the copyrighted work, identification of the infringing material, your contact information, a statement of good faith belief, and a statement of accuracy under penalty of perjury.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4 text-white">3. Counter-Notification</h2>
            <p>If you believe that your content was removed by mistake or misidentification, you may file a counter-notification with us. Your counter-notification must include identification of the removed content, your contact information, and a statement under penalty of perjury that the removal was a mistake.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4 text-white">4. Repeat Infringers</h2>
            <p>AnimeVoid maintains a policy to terminate the accounts of users who are found to be repeat infringers. We may also, in our sole discretion, limit access to the service or terminate accounts of any users who infringe any intellectual property rights of others.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-4 text-white">5. Contact</h2>
            <p>For DMCA inquiries, please contact our designated agent at <span className="text-void-red">dmca@animevoid.com</span>.</p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
