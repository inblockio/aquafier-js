import { Component, For } from 'solid-js';

const TermsAndConditions: Component = () => {
  return (
    <div class="container mx-auto px-4 py-8 max-w-4xl">
      <h1 class="text-3xl font-bold mb-6 text-orange-600">Terms and Conditions</h1>
      <p class="text-gray-600 mb-4">Last Updated: July 15, 2025</p>

      <div class="space-y-6">
        <section>
          <h2 class="text-2xl font-semibold mb-3 text-orange-500">1. Introduction</h2>
          <p class="mb-3">
            Welcome to Aqua Protocol. These Terms and Conditions govern your use of our platform and services. By accessing or using Aqua Protocol, you agree to be bound by
            these Terms and Conditions.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-3 text-orange-500">2. Definitions</h2>
          <ul class="list-disc pl-6 space-y-2">
            <li>
              <strong>"Platform"</strong> refers to the Aqua Protocol application, website, and services.
            </li>
            <li>
              <strong>"User"</strong> refers to any individual or entity that accesses or uses the Platform.
            </li>
            <li>
              <strong>"Content"</strong> refers to any information, data, text, documents, or other materials uploaded, shared, or stored on the Platform.
            </li>
            <li>
              <strong>"Blockchain"</strong> refers to the distributed ledger technology used to verify and record transactions on the Platform.
            </li>
          </ul>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-3 text-orange-500">3. Account Registration</h2>
          <p class="mb-3">
            To use certain features of the Platform, you may need to register for an account. You agree to provide accurate, current, and complete information during the
            registration process and to update such information to keep it accurate, current, and complete.
          </p>
          <p class="mb-3">
            You are responsible for safeguarding your account credentials and for all activities that occur under your account. You agree to notify us immediately of any
            unauthorized use of your account.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-3 text-orange-500">4. Blockchain Transactions</h2>
          <p class="mb-3">
            The Platform utilizes blockchain technology to verify and record certain transactions. You acknowledge and understand that blockchain transactions are irreversible
            and final once confirmed on the blockchain.
          </p>
          <p class="mb-3">
            You are solely responsible for maintaining the security of your private keys and wallet. We cannot recover or restore lost private keys or passwords.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-3 text-orange-500">5. Document Sharing and Signatures</h2>
          <p class="mb-3">
            The Platform allows users to share documents and collect electronic signatures. You agree to use these features only for lawful purposes and in accordance with
            these Terms and Conditions.
          </p>
          <p class="mb-3">You represent and warrant that you have all necessary rights, permissions, and authority to share any documents or content on the Platform.</p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-3 text-orange-500">6. Intellectual Property</h2>
          <p class="mb-3">
            The Platform and its original content, features, and functionality are owned by Aqua Protocol and are protected by international copyright, trademark, patent, trade
            secret, and other intellectual property or proprietary rights laws.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-3 text-orange-500">7. Limitation of Liability</h2>
          <p class="mb-3">
            To the maximum extent permitted by law, Aqua Protocol shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including
            without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the
            Platform.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-3 text-orange-500">8. Changes to Terms</h2>
          <p class="mb-3">
            We reserve the right to modify or replace these Terms and Conditions at any time. If a revision is material, we will provide at least 30 days' notice prior to any
            new terms taking effect. What constitutes a material change will be determined at our sole discretion.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-3 text-orange-500">9. Contact Us</h2>
          <p class="mb-3">If you have any questions about these Terms and Conditions, please contact us at legal@aquaprotocol.io.</p>
        </section>
      </div>
    </div>
  );
};

const PrivacyPolicy: Component = () => {
  const infoCollected = [
    { title: 'Personal Information', description: 'Ethereum addresses, email addresses, and other contact information you provide.' },
    { title: 'Usage Data', description: 'Information about how you use our Platform, including your browsing actions and patterns.' },
    { title: 'Document Data', description: 'Content of documents you upload, share, or sign through our Platform.' },
    { title: 'Blockchain Data', description: 'Transaction information that is recorded on the blockchain.' },
  ];

  const howWeUse = [
    'To provide and maintain our Platform',
    'To notify you about changes to our Platform',
    'To allow you to participate in interactive features of our Platform',
    'To provide customer support',
    'To gather analysis or valuable information so that we can improve our Platform',
    'To monitor the usage of our Platform',
    'To detect, prevent and address technical issues',
    'To send you notifications about document sharing and signing activities',
  ];

  const dataRights = [
    'The right to access your personal information',
    'The right to rectify inaccurate personal information',
    'The right to request deletion of your personal information',
    'The right to restrict processing of your personal information',
    'The right to data portability',
    'The right to object to processing of your personal information',
  ];

  return (
    <div class="container mx-auto px-4 py-8 max-w-4xl">
      <h1 class="text-3xl font-bold mb-6 text-orange-600">Privacy Policy</h1>
      <p class="text-gray-600 mb-4">Last Updated: July 15, 2025</p>

      <div class="space-y-6">
        <section>
          <h2 class="text-2xl font-semibold mb-3 text-orange-500">1. Introduction</h2>
          <p class="mb-3">
            At Aqua Protocol, we respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and
            safeguard your information when you use our platform.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-3 text-orange-500">2. Information We Collect</h2>
          <p class="mb-3">We may collect several types of information from and about users of our Platform, including:</p>
          <ul class="list-disc pl-6 space-y-2">
            <For each={infoCollected}>
              {(item) => (
                <li>
                  <strong>{item.title}:</strong> {item.description}
                </li>
              )}
            </For>
          </ul>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-3 text-orange-500">3. How We Use Your Information</h2>
          <p class="mb-3">We may use the information we collect for various purposes, including:</p>
          <ul class="list-disc pl-6 space-y-2">
            <For each={howWeUse}>
              {(item) => <li>{item}</li>}
            </For>
          </ul>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-3 text-orange-500">4. Blockchain Data and Public Information</h2>
          <p class="mb-3">
            Please be aware that blockchain technology is inherently transparent and public. When you use our Platform to record information on a blockchain, that information
            becomes publicly available. While we do not directly publish your personal information on the blockchain, transaction data including Ethereum addresses are recorded
            and visible on the blockchain.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-3 text-orange-500">5. Data Security</h2>
          <p class="mb-3">
            We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet or method of electronic
            storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-3 text-orange-500">6. Your Data Protection Rights</h2>
          <p class="mb-3">Depending on your location, you may have certain rights regarding your personal information, including:</p>
          <ul class="list-disc pl-6 space-y-2">
            <For each={dataRights}>
              {(item) => <li>{item}</li>}
            </For>
          </ul>
          <p class="mt-3">
            Please note that some of these rights may be limited when information has been recorded on a blockchain, as blockchain data is immutable by design.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-3 text-orange-500">7. Cookies and Tracking Technologies</h2>
          <p class="mb-3">
            We use cookies and similar tracking technologies to track activity on our Platform and hold certain information. You can instruct your browser to refuse all cookies
            or to indicate when a cookie is being sent.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-3 text-orange-500">8. Changes to This Privacy Policy</h2>
          <p class="mb-3">
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated"
            date.
          </p>
        </section>

        <section>
          <h2 class="text-2xl font-semibold mb-3 text-orange-500">9. Contact Us</h2>
          <p class="mb-3">If you have any questions about this Privacy Policy, please contact us at privacy@aquaprotocol.io.</p>
        </section>
      </div>
    </div>
  );
};

export { TermsAndConditions, PrivacyPolicy };