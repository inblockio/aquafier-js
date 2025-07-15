
const PrivacyPolicy = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-orange-600">Privacy Policy</h1>
      <p className="text-gray-600 mb-4">Last Updated: July 15, 2025</p>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-3 text-orange-500">1. Introduction</h2>
          <p className="mb-3">
            At Aqua Protocol, we respect your privacy and are committed to protecting your personal data. 
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3 text-orange-500">2. Information We Collect</h2>
          <p className="mb-3">We may collect several types of information from and about users of our Platform, including:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Personal Information:</strong> Ethereum addresses, email addresses, and other contact information you provide.</li>
            <li><strong>Usage Data:</strong> Information about how you use our Platform, including your browsing actions and patterns.</li>
            <li><strong>Document Data:</strong> Content of documents you upload, share, or sign through our Platform.</li>
            <li><strong>Blockchain Data:</strong> Transaction information that is recorded on the blockchain.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3 text-orange-500">3. How We Use Your Information</h2>
          <p className="mb-3">We may use the information we collect for various purposes, including:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>To provide and maintain our Platform</li>
            <li>To notify you about changes to our Platform</li>
            <li>To allow you to participate in interactive features of our Platform</li>
            <li>To provide customer support</li>
            <li>To gather analysis or valuable information so that we can improve our Platform</li>
            <li>To monitor the usage of our Platform</li>
            <li>To detect, prevent and address technical issues</li>
            <li>To send you notifications about document sharing and signing activities</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3 text-orange-500">4. Blockchain Data and Public Information</h2>
          <p className="mb-3">
            Please be aware that blockchain technology is inherently transparent and public. When you use our Platform to record information on a blockchain, that information becomes publicly available. 
            While we do not directly publish your personal information on the blockchain, transaction data including Ethereum addresses are recorded and visible on the blockchain.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3 text-orange-500">5. Data Security</h2>
          <p className="mb-3">
            We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet or method of electronic storage is 100% secure. 
            While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3 text-orange-500">6. Your Data Protection Rights</h2>
          <p className="mb-3">Depending on your location, you may have certain rights regarding your personal information, including:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>The right to access your personal information</li>
            <li>The right to rectify inaccurate personal information</li>
            <li>The right to request deletion of your personal information</li>
            <li>The right to restrict processing of your personal information</li>
            <li>The right to data portability</li>
            <li>The right to object to processing of your personal information</li>
          </ul>
          <p className="mt-3">
            Please note that some of these rights may be limited when information has been recorded on a blockchain, as blockchain data is immutable by design.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3 text-orange-500">7. Cookies and Tracking Technologies</h2>
          <p className="mb-3">
            We use cookies and similar tracking technologies to track activity on our Platform and hold certain information. 
            You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3 text-orange-500">8. Changes to This Privacy Policy</h2>
          <p className="mb-3">
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3 text-orange-500">9. Contact Us</h2>
          <p className="mb-3">
            If you have any questions about this Privacy Policy, please contact us at privacy@aquaprotocol.io.
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;