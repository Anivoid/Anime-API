import Header from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-void-black text-white">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">
          CONTACT <span className="text-void-red">US</span>
        </h1>
        <div className="space-y-6 text-gray-400">
          <section>
            <h2 className="text-xl font-bold mb-4 text-white">Get in Touch</h2>
            <p>Have questions, suggestions, or need support? We'd love to hear from you. Fill out the form below and we'll get back to you as soon as possible.</p>
          </section>

          <form className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="w-full px-4 py-3 rounded-lg bg-void-dark border border-void-gray/50 text-white placeholder-gray-500 focus:outline-none focus:border-void-red transition-colors"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className="w-full px-4 py-3 rounded-lg bg-void-dark border border-void-gray/50 text-white placeholder-gray-500 focus:outline-none focus:border-void-red transition-colors"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">Subject</label>
              <select
                id="subject"
                name="subject"
                className="w-full px-4 py-3 rounded-lg bg-void-dark border border-void-gray/50 text-white focus:outline-none focus:border-void-red transition-colors"
              >
                <option value="general">General Inquiry</option>
                <option value="support">Technical Support</option>
                <option value="dmca">DMCA / Copyright</option>
                <option value="bug">Bug Report</option>
                <option value="feature">Feature Request</option>
              </select>
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">Message</label>
              <textarea
                id="message"
                name="message"
                rows={5}
                required
                className="w-full px-4 py-3 rounded-lg bg-void-dark border border-void-gray/50 text-white placeholder-gray-500 focus:outline-none focus:border-void-red transition-colors resize-none"
                placeholder="How can we help?"
              />
            </div>
            <button
              type="submit"
              className="bg-void-red px-8 py-3 rounded font-semibold hover:bg-void-red-dark transition-all duration-300 glow-red"
            >
              Send Message
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}
