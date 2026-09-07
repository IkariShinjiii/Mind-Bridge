import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        
        <h1 className="text-3xl font-bold text-white mb-6">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-8">Last Updated: September 7, 2026</p>

        <div className="space-y-6 text-sm leading-relaxed text-gray-300">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Introduction</h2>
            <p>
              Mind Bridge ("we," "us," or "our") is a confidential wellness monitoring and triage platform for the students of the University of San Agustin. We are committed to protecting your personal information and your right to privacy in accordance with the Philippine Data Privacy Act of 2012 (Republic Act No. 10173).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Information We Collect</h2>
            <p>We only collect information that is strictly necessary for providing our services. This includes:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Personal Identification Information:</strong> Name, university email address, student ID number.</li>
              <li><strong>Sensitive Health Information:</strong> Responses to wellness check-ins (e.g., PHQ-9, GAD-7) and counselor notes to facilitate support and triage in accordance with the Mental Health Act (RA 11036).</li>
              <li><strong>Usage Data:</strong> Essential cookies and system logs necessary for the secure operation of the platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. How We Use Your Information</h2>
            <p>We use your information exclusively to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Provide and maintain the Mind Bridge platform.</li>
              <li>Assess emotional distress and prioritize counseling services.</li>
              <li>Facilitate scheduling of appointments with the Guidance Services and Testing Center.</li>
              <li>Protect the vital interests of the user in emergency or crisis situations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Data Sharing and Disclosure</h2>
            <p>
              Your sensitive personal information is strictly confidential. We do not sell or rent your data. Your data is only accessible to authorized personnel (i.e., designated counselors and administrators) within the University of San Agustin. We may disclose your information only when required by law or in emergency situations to protect your life and safety.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Data Security</h2>
            <p>
              We implement appropriate technical, organizational, and physical security measures to protect your personal data against accidental, unlawful, or unauthorized destruction, loss, alteration, disclosure, or access. Data is encrypted in transit and at rest.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Your Rights</h2>
            <p>Under the Data Privacy Act of 2012, you have the right to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Be informed about how your data is processed.</li>
              <li>Access your personal data.</li>
              <li>Object to the processing of your data.</li>
              <li>Suspend, withdraw, or order the blocking, removal, or destruction of your personal data.</li>
              <li>Rectify errors in your personal data.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Contact Us</h2>
            <p>If you have questions about this Privacy Policy, please contact us at:</p>
            <div className="mt-2 p-4 bg-gray-900 rounded-xl border border-gray-800">
              <p><strong>University of San Agustin - Guidance Services and Testing Center</strong></p>
              <p>Address: General Luna Street, City Proper, Iloilo City, Philippines, 5000</p>
              <p>Email: <a href="mailto:guidance@usa.edu.ph" className="text-teal-400 hover:underline">guidance@usa.edu.ph</a></p>
              <p>Phone: 0951 189 6559</p>
              <p>Messenger: USA- Guidance Services and Testing Center</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
