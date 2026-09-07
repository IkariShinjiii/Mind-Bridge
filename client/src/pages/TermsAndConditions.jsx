import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        
        <h1 className="text-3xl font-bold text-white mb-6">Terms and Conditions</h1>
        <p className="text-sm text-gray-400 mb-8">Last Updated: September 7, 2026</p>

        <div className="space-y-6 text-sm leading-relaxed text-gray-300">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing and using the Mind Bridge platform, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Description of Service</h2>
            <p>
              Mind Bridge provides an online platform for mental wellness monitoring and triage for the students of the University of San Agustin. It allows students to complete wellness check-ins, request appointments, and access crisis resources.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Not a Replacement for Emergency Medical Care</h2>
            <p className="text-rose-400 font-medium">
              Mind Bridge is an assessment and triage tool, not an emergency response service. It does not replace professional medical advice, diagnosis, or treatment. If you are experiencing a medical emergency or are in immediate danger of harming yourself or others, please call the National Center for Mental Health (NCMH) Crisis Hotline at 1553, or proceed to the nearest emergency room immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. User Responsibilities</h2>
            <p>You agree to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Provide accurate and truthful information during check-ins and appointment requests.</li>
              <li>Maintain the confidentiality of your account credentials.</li>
              <li>Use the platform only for its intended purpose and not for any unlawful activities.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Privacy and Data Security</h2>
            <p>
              Your use of Mind Bridge is also governed by our Privacy Policy. We take reasonable measures to protect your data, but we cannot guarantee absolute security against unauthorized access or breaches beyond our control.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by applicable law, the University of San Agustin and the developers of Mind Bridge shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from the use or inability to use the service, including but not limited to reliance on any information obtained from the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Modifications to the Service and Terms</h2>
            <p>
              We reserve the right to modify or discontinue the service, or change these Terms and Conditions at any time. Your continued use of the platform following any changes constitutes your acceptance of the new terms.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
