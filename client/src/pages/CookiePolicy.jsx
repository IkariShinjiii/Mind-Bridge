import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        
        <h1 className="text-3xl font-bold text-white mb-6">Cookie Policy</h1>
        <p className="text-sm text-gray-400 mb-8">Last Updated: September 7, 2026</p>

        <div className="space-y-6 text-sm leading-relaxed text-gray-300">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. What Are Cookies?</h2>
            <p>
              Cookies are small text files that are placed on your computer or mobile device when you browse websites. They are widely used to make websites work, or work more efficiently, as well as to provide information to the owners of the site.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. How We Use Cookies</h2>
            <p>
              Mind Bridge primarily uses "essential" cookies. These cookies are strictly necessary to provide you with services available through our platform and to use some of its features, such as accessing secure areas that require authentication.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Types of Cookies We Use</h2>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>
                <strong>Strictly Necessary Cookies:</strong> These cookies are essential for you to browse the website and use its features, such as logging into your student or counselor dashboard. Without these cookies, services like secure session management cannot be provided.
              </li>
              <li>
                <strong>Functionality Cookies:</strong> We may use these to remember choices you make (such as your user name or region) and provide enhanced, more personal features.
              </li>
            </ul>
            <p className="mt-3 text-teal-400">
              Note: Mind Bridge currently does not use third-party tracking or advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Managing Cookies</h2>
            <p>
              You can set your browser to refuse all or some browser cookies, or to alert you when websites set or access cookies. However, if you disable or refuse cookies, please note that some parts of the Mind Bridge platform may become inaccessible or not function properly, particularly the authenticated dashboard areas.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
