import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </button>
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <FileText className="h-6 w-6 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="prose max-w-none">
            <p className="text-sm text-gray-500 mb-8">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Agreement to Terms</h2>
              <p className="text-gray-700 mb-4">
                By accessing and using RupeeFlow, you agree to be bound by these Terms of Service 
                and all applicable laws and regulations. If you do not agree with any of these terms, you are 
                prohibited from using this service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
              <p className="text-gray-700 mb-4">
                RupeeFlow is a personal finance management application that helps you track transactions, 
                manage expenses, and analyze your financial data. The service includes features such as 
                transaction recording, categorization, analytics, and financial reporting.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
              <p className="text-gray-700 mb-4">
                To use certain features of the Service, you must create an account. You are responsible for:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Providing accurate and complete information</li>
                <li>Notifying us immediately of any unauthorized use</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Privacy and Data Protection</h2>
              <p className="text-gray-700 mb-4">
                We take your privacy seriously. Your financial data is encrypted and stored securely. 
                We do not share your personal information with third parties except as necessary to 
                provide the service or as required by law.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Acceptable Use</h2>
              <p className="text-gray-700 mb-4">
                You agree not to use the Service to:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe on the rights of others</li>
                <li>Upload malicious code or attempt to compromise the service</li>
                <li>Use the service for any illegal or unauthorized purpose</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Service Availability</h2>
              <p className="text-gray-700 mb-4">
                We strive to maintain high availability of the Service, but we do not guarantee 
                uninterrupted access. The Service may be temporarily unavailable due to maintenance, 
                updates, or technical issues.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Data Backup and Loss</h2>
              <p className="text-gray-700 mb-4">
                While we implement backup procedures, you are responsible for maintaining your own 
                copies of important data. We are not liable for any data loss that may occur.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Account Termination</h2>
              <p className="text-gray-700 mb-4">
                You may delete your account at any time through the profile settings. Upon account 
                deletion, all your data will be permanently removed and cannot be recovered. We may 
                also terminate accounts that violate these terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">
                The Service is provided "as is" without warranties of any kind. We are not liable 
                for any direct, indirect, incidental, or consequential damages arising from your 
                use of the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Changes to Terms</h2>
              <p className="text-gray-700 mb-4">
                We reserve the right to update these Terms of Service at any time. We will notify 
                users of any material changes. Your continued use of the Service after changes 
                constitutes acceptance of the new terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about these Terms of Service, please contact us through 
                the application or visit our support resources.
              </p>
            </section>

            <div className="border-t pt-8 mt-8">
              <p className="text-sm text-gray-500">
                Created by Ankit Dwivedi
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
