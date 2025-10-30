import { Component, For } from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import {
  ArrowRight,
  Check,
  Chrome,
  Mail,
  FileCheck,
  ShieldCheck,
  UserCheck,
  Stamp,
  BookOpen,
  Server,
  PenSquare,
  Fingerprint,
  LockKeyhole,
  ArrowUpRight,
  Clock,
  Sparkles,
  Rocket,
  Zap,
} from 'lucide-solid';

import { Button } from '../../components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { JsonCodeBlock } from './json_code';
import MainLayout from './layout';

const HeroSection: Component = () => {

    const navigate = useNavigate();
return (  <section id="hero" class="relative w-full py-20 md:py-32 bg-gradient-to-b from-background to-orange-50/20 dark:to-orange-900/10">
    {/* Decorative elements */}
    <div class="absolute top-20 left-10 w-64 h-64 bg-orange-500/10 rounded-full filter blur-3xl"></div>
    <div class="absolute bottom-20 right-10 w-72 h-72 bg-orange-400/10 rounded-full filter blur-3xl"></div>

    <div class="container mx-auto text-center px-4 relative z-10">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-4xl font-bold font-headline tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
          <span class="bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">Aqua</span> Secure Document Signing & Verification Protocol
        </h1>
        <div class="h-1 w-24 bg-gradient-to-r from-orange-600 to-orange-400 mx-auto my-6"></div>
        <p class="mt-6 text-lg text-muted-foreground md:text-xl">
          The Aqua Protocol enables cryptographic document signing using wallet-based authentication, tamper-proof PDF verification, and immutable timestamping. Our solution
          provides enterprise-grade security with the convenience of decentralized technology.
        </p>
        <p class="mt-4 text-md text-muted-foreground">
          Sign documents with your crypto wallet, verify authenticity instantly, and establish document provenance with cryptographic timestamps—all without requiring a blockchain
          or compromising privacy.
        </p>
      </div>
      <div class="mt-10 flex flex-col sm:flex-row justify-center gap-4">
        <Button
          size="lg"
         onClick={(e)=>{
 navigate("/app");
         }}
          
          class="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white transition-transform duration-300 ease-in-out hover:scale-105 shadow-lg shadow-orange-500/20"
        >
          Get Started <ArrowRight class="ml-2 h-5 w-5" />
        </Button>
        <Button size="lg" variant="outline" onClick={(e)=>{
 navigate("#contact");
         }}   class="border-orange-500/30 hover:border-orange-500 hover:bg-orange-500/5 transition-all duration-300">
          Request a Demo
        </Button>
      </div>
      <div class="mt-12 md:mt-16 rounded-lg shadow-2xl shadow-orange-500/20 overflow-hidden border border-orange-200 dark:border-orange-900/20">
        <div class="relative">
          <div class="absolute inset-0 bg-gradient-to-tr from-orange-500/10 to-transparent pointer-events-none"></div>
          <img
            src="/images/screenshot.png"
            alt="Aqua Protocol Document Signing Visualization"
            height={400}
            class="h-[400px] w-full object-cover"
            onError={(e) => {
              e.currentTarget.src = 'https://placehold.co/1200x600.png';
              e.currentTarget.alt = 'Aqua Protocol Document Signing Visualization (Placeholder)';
            }}
          />
        </div>
      </div>
    </div>
  </section>
);

}

const features = [
  {
    icon: <FileCheck class="h-8 w-8 text-orange-500" />,
    title: 'Data Accountability',
    description: 'Track and verify the origin and history of data (data accounting).',
    link: "https://digitalfreedom.substack.com/p/defining-data-accounting",
    cta: 'Read More',
  },
  {
    icon: <ShieldCheck class="h-8 w-8 text-orange-500" />,
    title: 'Access Control',
    description: 'Enforce secure, automated access policies.',
  },
  {
    icon: <UserCheck class="h-8 w-8 text-orange-500" />,
    title: 'Identity Claims and Attestations',
    description: 'Certify identities and assertions without intermediaries.',
  },
  {
    icon: <Stamp class="h-8 w-8 text-orange-500" />,
    title: 'Notarization and Beyond',
    description: 'Provide undeniable proof of data existence and authenticity.',
  },
];

const FeaturesSection: Component = () => {
    
    return (
  <section id="features" class="py-20 md:py-28 bg-background relative overflow-hidden">
    {/* Decorative elements */}
    <div class="absolute top-40 right-0 w-80 h-80 bg-orange-500/5 rounded-full filter blur-3xl"></div>
    <div class="absolute bottom-20 left-10 w-60 h-60 bg-orange-400/5 rounded-full filter blur-3xl"></div>

    <div class="container mx-auto px-4 relative z-10">
      <div class="text-center max-w-2xl mx-auto">
        <h2 class="text-3xl font-bold font-headline sm:text-4xl md:text-5xl">
          What <span class="bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">Aqua</span> Enables
        </h2>
        <div class="h-1 w-20 bg-gradient-to-r from-orange-600 to-orange-400 mx-auto my-6"></div>
        <p class="mt-4 text-lg text-muted-foreground">Aqua serves as a versatile building block for a wide range of applications.</p>
      </div>
      <div class="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
        <For each={features}>
          {(feature) => (
            <div class="flex flex-col items-center text-center p-6 rounded-lg transition-all duration-300 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 hover:shadow-xl border border-transparent hover:border-orange-200/50 dark:hover:border-orange-800/30">
              <div class="flex flex-col gap-2">
                <div class="mb-4 rounded-full bg-orange-500/10 p-3 shadow-inner w-fit mx-auto">{feature.icon}</div>
                <h3 class="text-xl font-headline font-semibold">{feature.title}</h3>
                <p class="mt-2 text-muted-foreground">{feature.description}</p>
                {feature.link && (
                  <Button  onClick={()=>{
                  

                    const url = feature.link;
  window.open(url, "_blank");
                  }}  variant="outline" class="border-orange-500/30 hover:border-orange-500 hover:bg-orange-500/5 transition-all duration-300 rounded-lg">
                    <span class="flex items-center">
                      {feature.cta}
                      <ArrowUpRight class="ml-2 h-4 w-4 text-orange-500" />
                    </span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  </section> 
);

}

const aquaTreeJSON = `{
  "revisions": {
    "0x54be8a35206dea3cf153ee1152dfb258b4e6af5d30c68ad2f060b9ab275d3065": {
      "file_hash": "a9041193cecffad533b8eaee36f419a1f2406fc8e6a01c2014d4ee7002723c42",
      "file_nonce": "64156222dc68977bb36dde2e1cd2a294749f0c6efb88742bf8cb2e4b32b88724",
      "forms_amount": "0.3",
      "forms_currency": "ETH",
      "forms_receiver": "0x4a79b0d4b8feda7af5902da2d15d73a7e5fdefd4",
      "forms_sender": "0xbdc64c49bf736cfe1b8233b083d3d632f26feb27",
      "leaves": [
        "a5dd17a31728982d7d349d94d2efb7f0f7dc582a01ada0a1b5602caffd7edbed",
        "b456e8f4eb7373ea03584cb9ebd66d2c1c023dada91282d6ff6311af7c40e94b",
        "130625d45114805fdfe7b6c84635ccf20d6284039f1385a1196f492eb888d26b",
        "831d23b3883442d5d261da2ac9d41339b12bc9052a1ccef27917cb570cbc0232",
        "fee6445323587d801908747e6e5c526a4feda60ae958994805761810a1b76eba",
        "6e44f260490db970aa88fc21969f9018efb09b68e2e105765740fde4c82fff8e",
        "b63814557ff2b5f44b0e7b467000e53cf79b33f46279bfb43dc383b7979d4501",
        "d781acf7ba880ecae581ffd8debcb4f5cb430bc2f237e27a6098471a9f7ffa60",
        "43fcaef3dc4b2a2d0550543b638048edcfb710da9276da109a9e011ed1a53ed1",
        "39ccd407bb105ed3be74df4a546d9b10c4f6c80e48b559102b04fa2b29aa83b4"
      ],
      "local_timestamp": "20250424133946",
      "previous_verification_hash": "",
      "revision_type": "form",
      "version": "https://aqua-protocol.org/docs/v3/schema_2 | SHA256 | Method: tree"
    }
  },
  "file_index": {
    "0x54be8a35206dea3cf153ee1152dfb258b4e6af5d30c68ad2f060b9ab275d3065": "./cheque.json"
  },
  "tree": {
    "hash": "0x54be8a35206dea3cf153ee1152dfb258b4e6af5d30c68ad2f060b9ab275d3065",
    "children": []
  },
  "treeMapping": {
    "paths": {
      "0x54be8a35206dea3cf153ee1152dfb258b4e6af5d30c68ad2f060b9ab275d3065": [
        "0x54be8a35206dea3cf153ee1152dfb258b4e6af5d30c68ad2f060b9ab275d3065"
      ]
    },
    "latestHash": "0x54be8a35206dea3cf153ee1152dfb258b4e6af5d30c68ad2f060b9ab275d3065"
  }
}`;

const HowItWorksSection: Component = () => (
  <section id="how-it-works" class="py-20 md:py-28 bg-orange-50/20 dark:bg-orange-900/10 relative overflow-hidden">
    {/* Decorative elements */}
    <div class="absolute top-0 left-0 w-96 h-96 bg-orange-500/5 rounded-full filter blur-3xl"></div>
    <div class="absolute bottom-0 right-0 w-80 h-80 bg-orange-400/5 rounded-full filter blur-3xl"></div>

    <div class="container mx-auto px-4 relative z-10">
      <div class="text-center max-w-3xl mx-auto">
        <h2 class="text-3xl font-bold font-headline sm:text-4xl md:text-5xl">
          How It <span class="bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">Works</span>
        </h2>
        <div class="h-1 w-20 bg-gradient-to-r from-orange-600 to-orange-400 mx-auto my-6"></div>
      </div>

      <div class="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left column with text */}
        <div class="space-y-6">
          <div class="p-6 rounded-xl bg-white/70 dark:bg-black/30 border border-orange-200/50 dark:border-orange-800/30 shadow-lg backdrop-blur-sm">
            <div class="flex items-start gap-4">
              <div class="p-3 rounded-full bg-orange-500/10 shadow-inner">
                <FileCheck class="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <h3 class="text-xl font-semibold mb-2">Portable Hash-Chains</h3>
                <p class="text-muted-foreground text-sm">Aqua creates AquaTrees that record a complete history of data revisions with cryptographic precision.</p>
              </div>
            </div>
          </div>

          <div class="p-6 rounded-xl bg-white/70 dark:bg-black/30 border border-orange-200/50 dark:border-orange-800/30 shadow-lg backdrop-blur-sm">
            <div class="flex items-start gap-4">
              <div class="p-3 rounded-full bg-orange-500/10 shadow-inner">
                <Clock class="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <h3 class="text-xl font-semibold mb-2">Immutable Timestamps</h3>
                <p class="text-muted-foreground text-sm">Optional Ethereum timestamping provides additional verification and immutability.</p>
              </div>
            </div>
          </div>

          <div class="p-6 rounded-xl bg-white/70 dark:bg-black/30 border border-orange-200/50 dark:border-orange-800/30 shadow-lg backdrop-blur-sm">
            <div class="flex items-start gap-4">
              <div class="p-3 rounded-full bg-orange-500/10 shadow-inner">
                <LockKeyhole class="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <h3 class="text-xl font-semibold mb-2">Decentralized Trust</h3>
                <p class="text-muted-foreground text-sm">Aqua liberates certification from institutional gatekeepers through open cryptographic standards.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column with code */}
        <div class="relative">
          <div class="rounded-xl overflow-hidden shadow-2xl border border-orange-200 dark:border-orange-800/30">
            <div class="absolute inset-0 bg-gradient-to-tr from-orange-500/10 to-transparent pointer-events-none"></div>
            <div class="bg-black/90 text-white h-[430px] font-mono text-sm overflow-hidden">
              <div class="p-6 flex justify-between items-center mb-3 h-[40px] box-border">
                <div class="flex items-center">
                  <div class="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
                  <div class="w-4 h-4 rounded-full bg-yellow-500 mr-2"></div>
                  <div class="w-4 h-4 rounded-full bg-green-500"></div>
                </div>
                <div class="text-orange-300 text-xs">aquatree.json</div>
              </div>
              <div class="box-border h-[380px] overflow-y-auto px-6">
                {/* <pre class="text-orange-100 text-xs">
                  <code>{aquaTreeJSON}</code>
                </pre> */}

                <JsonCodeBlock code={aquaTreeJSON} />
                

              </div>
            </div>
          </div>
          <div class="absolute -bottom-4 -right-4 w-24 h-24 bg-orange-500/20 rounded-full filter blur-xl"></div>
          <div class="absolute -top-4 -left-4 w-32 h-32 bg-orange-400/10 rounded-full filter blur-xl"></div>
        </div>
      </div>
    </div>
  </section>
);

const prototypes = [
  {
    name: 'Federated Wiki Infrastructure',
    description: 'A notarized wiki system with built-in trust (PKC, Protocol v1.2).',
    link: 'https://github.com/inblockio/aqua-pkc',
    icon: <BookOpen class="h-10 w-10 text-orange-500" />,
    cta: 'View on GitHub',
  },
  {
    name: 'Chrome Extension for Verification',
    description: 'A tool for name resolution and AquaTree validation (Aqua Verifier, Protocol v1.2).',
    link: 'https://chromewebstore.google.com/detail/aqua-verifier/gadnjidhhadchnegnpadkibmjlgihiaj',
    icon: <Chrome class="h-10 w-10 text-orange-500" />,
    cta: 'View in Store',
  },
  {
    name: 'Firewall-Like Systems',
    description: "Automated access control enforcement integrated with Aqua ('Guardian,' Protocol v1.2).",
    link: "https://github.com/inblockio/aqua-guardian",
    icon: <Server class="h-10 w-10 text-orange-500" />,
    cta: 'View on GitHub',
  },
  {
    name: 'Document Signing Service',
    description: "A platform for signing and verifying files ('Aquafire').",
    link: 'https://aquafier.inblock.io',
    icon: <PenSquare class="h-10 w-10 text-orange-500" />,
    cta: 'Visit Aquafire',
  },
  {
    name: 'Decentralized Identity Solution',
    description: 'A new approach to identity management (Aqua Identity).',
    link: 'https://github.com/inblockio/aqua-identity',
    icon: <Fingerprint class="h-10 w-10 text-orange-500" />,
    cta: 'View on GitHub',
  },
];

const PrototypesSection: Component = () => (
  <section id="prototypes" class="py-20 md:py-28 bg-background relative overflow-hidden">
    <div class="absolute top-20 right-20 w-72 h-72 bg-orange-500/5 rounded-full filter blur-3xl"></div>
    <div class="absolute bottom-40 left-20 w-64 h-64 bg-orange-400/5 rounded-full filter blur-3xl"></div>

    <div class="container mx-auto px-4 relative z-10">
      <div class="text-center max-w-2xl mx-auto">
        <h2 class="text-3xl font-bold font-headline sm:text-4xl md:text-5xl">
          What's Been <span class="bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">Built</span>
        </h2>
        <div class="h-1 w-20 bg-gradient-to-r from-orange-600 to-orange-400 mx-auto my-6"></div>
        <p class="mt-4 text-lg text-muted-foreground">The potential of Aqua is being explored through practical implementations.</p>
      </div>
      <div class="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        <For each={prototypes}>
          {(proto) => (
            <Card class="flex flex-col text-center items-center p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-orange-100 dark:border-orange-900/20 hover:border-orange-200 dark:hover:border-orange-800/30 bg-white/80 dark:bg-black/50 backdrop-blur-sm">
              <CardHeader class="flex flex-col p-0 w-full items-center">
                <div class="mb-4 rounded-full bg-orange-500/10 p-4 shadow-inner">{proto.icon}</div>
                <CardTitle class="font-headline text-xl">{proto.name}</CardTitle>
              </CardHeader>
              <CardContent class="flex-1 py-4 px-0">
                <p class="text-muted-foreground">{proto.description}</p>
              </CardContent>
              <CardFooter class="p-0">
                {proto.link && (
                  <Button onClick={()=>{
                    // as="a" href={proto.link}
                    const url = proto.link;
                    window.open(url, "_blank");
                  }}  variant="outline" class="border-orange-500/30 hover:border-orange-500 hover:bg-orange-500/5 transition-all duration-300">
                    <span class="flex items-center">
                      {proto.cta}
                      <ArrowUpRight class="ml-2 h-4 w-4 text-orange-500" />
                    </span>
                  </Button>
                )}
              </CardFooter>
            </Card>
          )}
        </For>
      </div>
    </div>
  </section>
);

const visionPoints = [
  {
    title: 'An Open Framework',
    description: 'Empowering organizations to build private, decentralized solutions for data certification and verification without central authorities.',
  },
  {
    title: 'A Verifiable Data Structure',
    description: 'Creating tamper-evident records that link and certify data with cryptographic precision, ensuring integrity across distributed systems.',
  },
  {
    title: 'A Protocol for Provenance',
    description: 'Establishing unbreakable chains of custody that guarantee data origins and transformations with mathematical certainty.',
  },
  {
    title: 'A Foundation for Trust',
    description: 'Building the infrastructure for a new digital ecosystem where trust is inherent to the system, not dependent on institutional guarantees.',
  },
];

const VisionSection: Component = () => (
  <section id="vision" class="py-20 md:py-28 bg-orange-50/20 dark:bg-orange-900/10 relative overflow-hidden">
    <div class="absolute top-0 right-0 w-96 h-96 bg-orange-500/5 rounded-full filter blur-3xl"></div>
    <div class="absolute bottom-0 left-0 w-80 h-80 bg-orange-400/5 rounded-full filter blur-3xl"></div>

    <div class="container mx-auto px-4 relative z-10">
      <div class="text-center max-w-3xl mx-auto">
        <h2 class="text-3xl font-bold font-headline sm:text-4xl md:text-5xl">
          The Vision of <span class="bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">Aqua</span>
        </h2>
        <div class="h-1 w-20 bg-gradient-to-r from-orange-600 to-orange-400 mx-auto my-6"></div>
        <p class="mt-4 text-lg text-muted-foreground">
          Aqua represents a paradigm shift in how we establish trust in digital environments. Our vision extends beyond simple notarization to reimagine how data integrity can
          transform industries:
        </p>
      </div>
      <div class="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
        <For each={visionPoints}>
          {(point) => (
            <div class="flex items-start space-x-4 p-6 rounded-lg bg-white/50 dark:bg-black/20 border border-orange-200/50 dark:border-orange-800/30 shadow-md hover:shadow-lg transition-all duration-300">
              <Check class="h-6 w-6 text-orange-500 mt-1 flex-shrink-0" />
              <div>
                <h3 class="text-xl font-headline font-semibold">{point.title}</h3>
                <p class="text-muted-foreground mt-1">{point.description}</p>
              </div>
            </div>
          )}
        </For>
      </div>
      <div class="text-center max-w-3xl mx-auto mt-16">
        <p class="text-lg text-muted-foreground">
          We're building more than a protocol—we're creating the foundation for a new era of digital trust. Join us in shaping this future by exploring, building, and contributing
          to Aqua Protocol Version 3.
        </p>
        <div class="mt-8">
          <Button onClick={()=>{
            const url = "https://github.com/inblockio/aqua-docs"
            window.open(url, "_blank");
          }}  variant="outline" class="border-orange-500/30 hover:border-orange-500 hover:bg-orange-500/5 transition-all duration-300">
            <span class="flex items-center">
              Explore Our Documentation
              <ArrowUpRight class="ml-2 h-4 w-4 text-orange-500" />
            </span>
          </Button>
        </div>
      </div>
    </div>
  </section>
);

const pricingPlans = [
  {
    name: 'Free',
    description: "Perfect for exploring Aqua's capabilities",
    price: '$0',
    duration: 'forever',
    icon: <Sparkles class="h-8 w-8 text-orange-500" />,
    features: ['Basic document notarization', 'Up to 5 AquaTrees', 'Public verification', 'Community support'],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Pro',
    description: 'For individuals and small teams',
    price: '$19',
    duration: 'per month',
    icon: <Rocket class="h-8 w-8 text-orange-500" />,
    features: ['Unlimited document notarization', 'Up to 100 AquaTrees', 'Private verification', 'Priority support', 'API access', 'Custom branding'],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    description: 'For organizations with advanced needs',
    price: 'Custom',
    duration: '',
    icon: <Zap class="h-8 w-8 text-orange-500" />,
    features: ['Unlimited everything', 'Dedicated infrastructure', 'Advanced security features', 'SLA guarantees', 'Dedicated account manager', 'Custom integrations'],
    cta: 'Contact Sales',
    popular: false,
  },
];

const PricingSection: Component = () => {

    const navigate = useNavigate();
 return ( <section id="pricing" class="py-20 md:py-28 bg-background relative overflow-hidden">
    <div class="absolute top-20 left-0 w-72 h-72 bg-orange-500/5 rounded-full filter blur-3xl"></div>
    <div class="absolute bottom-40 right-0 w-64 h-64 bg-orange-400/5 rounded-full filter blur-3xl"></div>

    <div class="container mx-auto px-4 relative z-10">
      <div class="text-center max-w-3xl mx-auto">
        <h2 class="text-3xl font-bold font-headline sm:text-4xl md:text-5xl">
          Simple, Transparent <span class="bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">Pricing</span>
        </h2>
        <div class="h-1 w-20 bg-gradient-to-r from-orange-600 to-orange-400 mx-auto my-6"></div>
        <p class="mt-4 text-lg text-muted-foreground">Choose the plan that's right for you and start building with Aqua Protocol today.</p>
      </div>

      <div class="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        <For each={pricingPlans}>
          {(plan) => (
            <Card class={`flex flex-col h-full border ${plan.popular ? 'border-orange-500 shadow-lg shadow-orange-500/20' : 'border-border'} relative overflow-hidden`}>
              {plan.popular && (
                <div class="absolute top-0 right-0">
                  <div class="bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-bl-lg">Popular</div>
                </div>
              )}
              <CardHeader>
                <div class="mb-4 rounded-full bg-orange-500/10 p-3 w-fit">{plan.icon}</div>
                <CardTitle class="text-2xl font-headline">{plan.name}</CardTitle>
                <div class="mt-2">
                  <span class="text-3xl font-bold">{plan.price}</span>
                  {plan.duration && <span class="text-muted-foreground"> {plan.duration}</span>}
                </div>
                <p class="text-muted-foreground mt-2">{plan.description}</p>
              </CardHeader>
              <CardContent class="flex-grow">
                <ul class="space-y-3">
                  <For each={plan.features}>
                    {(feature) => (
                      <li class="flex items-start">
                        <Check class="h-5 w-5 text-orange-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    )}
                  </For>
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  class={`w-full ${plan.popular ? 'bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white' : 'border-orange-500/50 hover:border-orange-500 hover:bg-orange-500/5'}`}
                  variant={plan.popular ? 'default' : 'outline'}
                  
                  onClick={()=>{
                    if(plan.name === 'Enterprise'){
                      navigate("#contact");
                    }else{
                      navigate("/signup");
                    }
                }}
                >
                  {plan.cta}
                  <ArrowRight class="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          )}
        </For>
      </div>

      <div class="mt-16 bg-orange-50/50 dark:bg-orange-900/10 border border-orange-200/50 dark:border-orange-800/30 rounded-xl p-8 text-center">
        <h3 class="text-xl font-semibold mb-2">Need a custom solution?</h3>
        <p class="text-muted-foreground max-w-2xl mx-auto">
          We offer tailored solutions for organizations with specific requirements. Contact our sales team to discuss your needs.
        </p>
        <Button onClick={()=>{
             navigate("#contact");
        }}  variant="outline" class="mt-6 border-orange-500/30 hover:border-orange-500 hover:bg-orange-500/5">
          <span class="flex items-center">
            Contact Sales
            <ArrowUpRight class="ml-2 h-4 w-4 text-orange-500" />
          </span>
        </Button>
      </div>
    </div>
  </section>
);

}

const ContactSection: Component = () => {
  const handleSubmit = (e: Event) => {
    e.preventDefault();
    // Handle form submission
    console.log('Form submitted');
  };

  return (
    <section id="contact" class="py-20 md:py-28 bg-background relative overflow-hidden">
      <div class="absolute top-40 left-0 w-72 h-72 bg-orange-500/5 rounded-full filter blur-3xl"></div>
      <div class="absolute bottom-20 right-0 w-80 h-80 bg-orange-400/5 rounded-full filter blur-3xl"></div>

      <div class="container mx-auto px-4 relative z-10">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div class="flex flex-col">
            <h2 class="text-3xl font-bold font-headline sm:text-4xl md:text-5xl">
              Ready to build with <span class="bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">Aqua</span>?
            </h2>
            <div class="h-1 w-20 bg-gradient-to-r from-orange-600 to-orange-400 my-6"></div>
            <p class="mt-4 text-lg text-muted-foreground">
              Have a question or want a demo? Reach out to us via email or fill out the form and our team will get back to you shortly.
            </p>
            <div class="mt-8 space-y-4">
              <a href="mailto:demo@inblock.io" class="flex items-center text-lg text-orange-500 hover:text-orange-600 transition-colors group">
                <div class="p-2 rounded-full bg-orange-500/10 mr-3 group-hover:bg-orange-500/20 transition-colors">
                  <Mail class="h-5 w-5" />
                </div>
                demo@inblock.io
              </a>
            </div>
          </div>
          <Card class="p-8 bg-white/80 dark:bg-black/50 shadow-lg border border-orange-200/50 dark:border-orange-800/30 backdrop-blur-sm">
            <form class="space-y-6" onSubmit={handleSubmit}>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Input placeholder="Your Name" />
                <Input type="email" placeholder="Your Email" />
              </div>
              <Input placeholder="Subject" />
              <Textarea placeholder="Your Message" rows={5} />
              <Button
                type="submit"
                size="lg"
                class="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white transition-all duration-300 shadow-md hover:shadow-lg"
              >
                Send Message
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </section>
  );
};

const Home: Component = () => {
  return (
    <MainLayout>
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PrototypesSection />
      <VisionSection />
      <PricingSection />
      <ContactSection />
    </MainLayout>
  );
};

export default Home;