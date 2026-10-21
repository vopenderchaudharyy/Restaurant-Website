import { Link, NavLink } from 'react-router-dom';
import {
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  FileText,
  Headphones,
  LockKeyhole,
  Mail,
  MapPin,
  Printer,
  RefreshCcw,
  Scale,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import Reveal from '../components/Reveal.jsx';

export const LEGAL_EFFECTIVE_DATE = '21 October 2026';

const operator = {
  name: 'MenuMate',
  grievanceOfficer: 'Vopender Chaudhary',
  email: 'vopenderchaudhary@gmai.com',
  phone: '+91 88946 16815',
  phoneHref: 'tel:+918894616815',
  address: 'North Pateri, Satna, Madhya Pradesh, India',
};

const legalNavigation = [
  ['/legal', 'Legal centre'],
  ['/terms', 'Terms of Use'],
  ['/privacy', 'Privacy Policy'],
  ['/cancellation-refunds', 'Cancellation & Refunds'],
  ['/delivery-policy', 'Delivery Policy'],
  ['/grievance', 'Grievance Redressal'],
];

function Section({ id, title, children }) {
  return (
    <section id={id} className="legal-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function LegalShell({ eyebrow, title, intro, icon: Icon, highlights = [], children }) {
  return (
    <div className="legal-page">
      <header className="legal-hero">
        <div className="container legal-hero-inner">
          <Reveal className="legal-hero-copy">
            <span className="eyebrow">{eyebrow}</span>
            <h1>{title}</h1>
            <p>{intro}</p>
            <div className="legal-meta">
              <span>
                <Clock3 size={15} /> Effective {LEGAL_EFFECTIVE_DATE}
              </span>
              <span>
                <FileText size={15} /> Version 1.0
              </span>
            </div>
          </Reveal>
          <Reveal className="legal-hero-mark" delay={80} aria-hidden="true">
            <Icon size={44} strokeWidth={1.5} />
          </Reveal>
        </div>
      </header>

      <div className="container legal-layout">
        <aside className="legal-sidebar" aria-label="Legal documents">
          <span>MenuMate policies</span>
          <nav>
            {legalNavigation.map(([path, label]) => (
              <NavLink key={path} to={path} end={path === '/legal'}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="legal-help-card">
            <Headphones size={20} />
            <strong>Need help with an order?</strong>
            <p>Keep your order ID ready so we can investigate quickly.</p>
            <Link to="/grievance">Contact support</Link>
          </div>
        </aside>

        <main className="legal-content" tabIndex={-1}>
          {highlights.length > 0 && (
            <div className="legal-highlights" aria-label="Policy highlights">
              {highlights.map((item) => (
                <div key={item}>
                  <CheckCircle2 size={17} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}
          <div className="legal-document">{children}</div>
          <div className="legal-document-actions">
            <button type="button" onClick={() => window.print()}>
              <Printer size={16} /> Print this policy
            </button>
            <Link to="/grievance">
              Questions about this policy <ArrowUpRight size={15} />
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}

export function LegalCentrePage() {
  const cards = [
    {
      to: '/terms',
      icon: Scale,
      title: 'Terms of Use',
      text: 'The rules for accounts, restaurants, orders, payments and acceptable use.',
    },
    {
      to: '/privacy',
      icon: LockKeyhole,
      title: 'Privacy Policy',
      text: 'What information we use, why we need it and the choices available to you.',
    },
    {
      to: '/cancellation-refunds',
      icon: RefreshCcw,
      title: 'Cancellation & Refunds',
      text: 'When an order can be cancelled and how eligible payment reversals are handled.',
    },
    {
      to: '/delivery-policy',
      icon: Truck,
      title: 'Delivery Policy',
      text: 'Delivery estimates, customer responsibilities and what happens when plans change.',
    },
    {
      to: '/grievance',
      icon: Headphones,
      title: 'Grievance Redressal',
      text: 'How to raise a complaint, the information to include and our response timeline.',
    },
  ];
  return (
    <LegalShell
      eyebrow="Trust, clearly explained"
      title="The details behind every order."
      intro="These documents explain how MenuMate works for customers and restaurant partners. We have written them to be readable, practical and easy to revisit."
      icon={ShieldCheck}
      highlights={['Plain-language policies', 'One support route', 'Consumer rights preserved']}
    >
      <section className="legal-centre-intro">
        <span className="eyebrow">Choose a document</span>
        <h2>Know what to expect.</h2>
        <p>
          MenuMate is a marketplace that helps customers discover restaurants and place orders. Each
          restaurant remains responsible for preparing its food, menu accuracy and food safety,
          while MenuMate operates the ordering experience and platform support described in these
          policies.
        </p>
      </section>
      <div className="legal-card-grid">
        {cards.map(({ to, icon: CardIcon, title, text }) => (
          <Link to={to} key={to} className="legal-card">
            <span>
              <CardIcon size={21} />
            </span>
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
            <ArrowUpRight size={17} />
          </Link>
        ))}
      </div>
      <div className="legal-notice">
        <BadgeCheck size={21} />
        <p>
          MenuMate is currently in a controlled preview. Features described as unavailable,
          test-mode or planned do not become available merely because they are mentioned in a
          policy.
        </p>
      </div>
    </LegalShell>
  );
}

export function TermsPage() {
  return (
    <LegalShell
      eyebrow="Agreement with MenuMate"
      title="Terms of Use"
      intro="These terms govern access to MenuMate by customers, restaurant partners and visitors. By creating an account or using the platform, you agree to them."
      icon={Scale}
      highlights={[
        'Marketplace terms',
        'Transparent order rules',
        'Indian consumer rights preserved',
      ]}
    >
      <Section id="platform" title="1. About MenuMate">
        <p>
          MenuMate provides a digital marketplace through which users can discover participating
          restaurants, view menus, place orders, make reservations and manage account activity.
          Restaurants are independent businesses. They control their menus, prices, availability,
          preparation, licences and food quality.
        </p>
        <p>
          The operator contact details are listed in the{' '}
          <Link to="/grievance">Grievance Redressal</Link> page. Some services are currently offered
          as a controlled preview and may use test payments.
        </p>
      </Section>
      <Section id="eligibility" title="2. Eligibility and accounts">
        <ul>
          <li>
            You must be legally capable of entering into a binding agreement under Indian law.
          </li>
          <li>You must provide accurate account and delivery information and keep it current.</li>
          <li>
            You are responsible for activity performed through your account and for keeping access
            secure.
          </li>
          <li>
            Contact us promptly if you suspect unauthorised use. Password-reset links are time
            limited and single use.
          </li>
        </ul>
      </Section>
      <Section id="restaurants" title="3. Restaurant information">
        <p>
          Restaurant partners must keep menu descriptions, prices, dietary labels, service areas,
          opening status and estimated preparation times accurate. Partners must hold every licence,
          registration and approval required for their food business, including an applicable FSSAI
          licence or registration, and provide verification information when requested.
        </p>
        <p>
          Images are illustrative. Natural variation in ingredients, preparation and presentation
          may occur. Users with allergies or medical dietary requirements should contact the
          restaurant before ordering; a dietary label does not guarantee an allergen-free kitchen.
        </p>
      </Section>
      <Section id="orders" title="4. Orders, prices and acceptance">
        <ul>
          <li>
            The checkout screen shows item prices, taxes and applicable delivery or platform charges
            before confirmation.
          </li>
          <li>An order request is subject to restaurant availability and platform confirmation.</li>
          <li>
            A restaurant may reject or cancel an order when an item is unavailable, the address is
            outside its area, or fulfilment is not reasonably possible.
          </li>
          <li>
            Obvious pricing or catalogue errors may be corrected. If this affects a confirmed order,
            we will offer cancellation and an eligible refund.
          </li>
        </ul>
      </Section>
      <Section id="payments" title="5. Payments">
        <p>
          Available methods are shown at checkout. Online payments may be processed by an authorised
          payment provider such as Razorpay. MenuMate does not ask you to provide a card PIN or UPI
          PIN to its support team. Production payment collection remains unavailable while the
          platform is in test mode.
        </p>
      </Section>
      <Section id="cancellations" title="6. Cancellations, refunds and delivery">
        <p>
          Customer cancellation is available while an order remains in the “Placed” state and before
          preparation begins. Later requests are reviewed based on food preparation, fulfilment
          status and applicable consumer rights. The detailed rules form part of these terms and
          appear in our <Link to="/cancellation-refunds">Cancellation & Refund Policy</Link> and{' '}
          <Link to="/delivery-policy">Delivery Policy</Link>.
        </p>
      </Section>
      <Section id="acceptable-use" title="7. Acceptable use">
        <p>You must not misuse the platform, including by:</p>
        <ul>
          <li>placing fraudulent orders, abusing refunds or impersonating another person;</li>
          <li>probing, disrupting or attempting unauthorised access to the platform;</li>
          <li>uploading unlawful, misleading, infringing or harmful material; or</li>
          <li>
            using automated methods to scrape or reproduce the service without written permission.
          </li>
        </ul>
      </Section>
      <Section id="reviews" title="8. Reviews and user content">
        <p>
          Reviews must reflect a genuine experience and must not contain threats, hate, personal
          data, advertising or unlawful content. You retain ownership of content you submit and
          grant MenuMate a non-exclusive licence to host and display it for operating and promoting
          the service. We may moderate content that violates these terms.
        </p>
      </Section>
      <Section id="responsibility" title="9. Responsibility and availability">
        <p>
          We use reasonable care to operate the platform, but availability and estimates may be
          affected by restaurants, traffic, weather, connectivity and third-party services. Nothing
          in these terms excludes a right or remedy that cannot lawfully be excluded, including
          rights under applicable consumer law. Any liability will be determined under applicable
          law and the facts of the claim.
        </p>
      </Section>
      <Section id="changes" title="10. Suspension, changes and governing law">
        <p>
          We may restrict an account or restaurant listing to protect users, investigate abuse or
          comply with law. Material changes to these terms will be posted with a revised effective
          date. These terms are governed by Indian law. Courts with lawful jurisdiction in Satna,
          Madhya Pradesh may hear disputes, while statutory consumer forums and remedies remain
          available.
        </p>
      </Section>
    </LegalShell>
  );
}

export function PrivacyPage() {
  return (
    <LegalShell
      eyebrow="Your information"
      title="Privacy Policy"
      intro="This policy describes the personal data MenuMate processes, the purposes for using it and how you can exercise your choices."
      icon={LockKeyhole}
      highlights={[
        'Passwords stored as hashes',
        'Secure session cookie',
        'Access and correction requests supported',
      ]}
    >
      <Section id="scope" title="1. Scope and data fiduciary">
        <p>
          This policy applies to MenuMate customers, visitors and restaurant partners. For personal
          data processed to operate this platform, {operator.name} acts as the data fiduciary. Our
          authorised contact for privacy questions is listed on the{' '}
          <Link to="/grievance">Grievance Redressal</Link> page.
        </p>
      </Section>
      <Section id="collection" title="2. Information we process">
        <ul>
          <li>
            <strong>Account:</strong> name, email address, phone number, password hash, role and
            account dates.
          </li>
          <li>
            <strong>Orders and reservations:</strong> selected items, restaurant, amount, delivery
            or pickup choice, address, instructions, status and booking details.
          </li>
          <li>
            <strong>Restaurant partner:</strong> business name, contact details, address, menu,
            prices, photos, availability and operational settings.
          </li>
          <li>
            <strong>Support and content:</strong> messages, reviews, ratings and information
            supplied with a complaint.
          </li>
          <li>
            <strong>Security and payment:</strong> session identifiers, payment references and
            transaction status. Card and UPI credentials are handled by the payment provider and are
            not stored by MenuMate.
          </li>
          <li>
            <strong>Local device storage:</strong> cart, favourites, saved restaurants, a device
            session identifier and short-lived payment-recovery information.
          </li>
        </ul>
      </Section>
      <Section id="purposes" title="3. Why we use this information">
        <ul>
          <li>to create and secure accounts, authenticate users and recover passwords;</li>
          <li>to place, fulfil, track, cancel and support orders and reservations;</li>
          <li>to operate restaurant storefronts, menus and availability;</li>
          <li>to send service communications, including welcome and password-reset messages;</li>
          <li>to notify the platform operator of successful sign-ins for operational awareness;</li>
          <li>
            to prevent fraud, enforce platform rules, investigate complaints and comply with law;
            and
          </li>
          <li>
            to understand service performance using aggregated or de-identified information where
            possible.
          </li>
        </ul>
      </Section>
      <Section id="sharing" title="4. When information is shared">
        <p>We share only what is reasonably required for the stated purpose:</p>
        <ul>
          <li>
            with the selected restaurant, including order items and fulfilment contact details;
          </li>
          <li>with a delivery provider when delivery service is activated and assigned;</li>
          <li>
            with infrastructure and service providers, such as hosting, database, email,
            image-storage and payment providers;
          </li>
          <li>
            with professional advisers, regulators or authorities where required by law or to
            protect legal rights; and
          </li>
          <li>
            as part of a genuine business restructuring, subject to appropriate safeguards and
            notice where required.
          </li>
        </ul>
        <p>We do not sell personal data for money.</p>
      </Section>
      <Section id="retention" title="5. Retention">
        <p>
          We retain information only for as long as it is needed for the purpose described, to
          maintain transaction and tax records, resolve disputes, prevent fraud and meet legal
          obligations. Session records expire automatically. Password-reset records expire after a
          short period. Deletion requests may be limited where records must be retained by law or
          for an active claim.
        </p>
      </Section>
      <Section id="security" title="6. Security">
        <p>
          MenuMate uses measures such as password hashing, HTTP-only session cookies, access
          controls, validation and rate limiting. No online system is risk free. If you believe your
          account has been compromised, reset your password and contact us promptly.
        </p>
      </Section>
      <Section id="choices" title="7. Your choices and rights">
        <p>
          Subject to applicable law, you may ask for a summary of personal data being processed,
          request correction or erasure, withdraw consent where processing depends on consent, and
          raise a grievance. You can update your name and phone number from your account. For other
          requests, use the grievance contact and provide enough information to verify your account
          securely.
        </p>
      </Section>
      <Section id="children" title="8. Children">
        <p>
          MenuMate is not designed for children to create independent accounts or place orders. A
          parent or lawful guardian should manage any use involving a child. We do not knowingly use
          a child’s personal data for targeted advertising or behavioural monitoring.
        </p>
      </Section>
      <Section id="updates" title="9. Policy updates and contact">
        <p>
          We may update this policy as services or legal requirements change. The current version
          and effective date will remain available here. Privacy questions and rights requests can
          be sent through the process on our <Link to="/grievance">Grievance Redressal page</Link>.
        </p>
      </Section>
    </LegalShell>
  );
}

export function CancellationRefundPage() {
  return (
    <LegalShell
      eyebrow="Order support"
      title="Cancellation & Refund Policy"
      intro="This policy explains the point at which an order may be cancelled and how we assess refunds when an order does not go as expected."
      icon={RefreshCcw}
      highlights={[
        'Cancel before preparation',
        'Review for missing or unsafe food',
        'Refunds return to the original method',
      ]}
    >
      <Section id="customer-cancellation" title="1. Cancellation by a customer">
        <p>
          You can cancel an order from your account while its status is <strong>Placed</strong>.
          Once the restaurant starts preparation, self-service cancellation closes because food may
          already have been prepared specifically for you. Contact support immediately if an
          exceptional issue arises.
        </p>
      </Section>
      <Section id="restaurant-cancellation" title="2. Cancellation by a restaurant or MenuMate">
        <p>
          A restaurant or MenuMate may cancel when an item is unavailable, the restaurant cannot
          fulfil the order, the address is outside the service area, payment cannot be confirmed,
          the request appears fraudulent, or safety or legal concerns arise. Any captured payment
          eligible for a reversal will be submitted for a full refund.
        </p>
      </Section>
      <Section id="eligible-refunds" title="3. When a refund may be available">
        <ul>
          <li>a paid order is cancelled before fulfilment;</li>
          <li>the order is confirmed as not delivered;</li>
          <li>paid items are materially missing or different from the confirmed order;</li>
          <li>food is reasonably shown to be unsafe, contaminated or unfit for consumption; or</li>
          <li>a verified duplicate payment or payment error occurred.</li>
        </ul>
        <p>
          Refunds are assessed against the order record and available evidence. A preference issue,
          natural variation in food, incorrect address supplied by the customer, or inability to
          receive the delivery does not automatically qualify for a refund, without limiting
          statutory rights.
        </p>
      </Section>
      <Section id="report" title="4. How to report an issue">
        <p>
          Contact us as soon as possible and include the order ID, affected items, a clear
          explanation and photographs where relevant. For food quality or safety complaints,
          reporting within 24 hours helps preserve evidence. Do not consume food you reasonably
          believe is unsafe.
        </p>
      </Section>
      <Section id="method" title="5. Refund method and timing">
        <p>
          An approved online-payment refund is returned to the original payment method. After the
          refund is accepted by the payment provider, banks and payment networks control the final
          credit time; it commonly takes several business days. We will provide the available
          reference or status. Cash-payment resolutions, when cash payments are activated, may
          require verified bank or UPI details and will be communicated before processing.
        </p>
        <p>
          MenuMate currently uses test-mode payments. Test transactions do not move real money and
          do not create a real bank refund.
        </p>
      </Section>
      <Section id="chargebacks" title="6. Chargebacks and unresolved complaints">
        <p>
          Please contact us first so we can investigate with the restaurant and payment provider.
          This does not prevent you from using remedies available through your bank, payment
          provider or applicable consumer law. Escalation details appear on the{' '}
          <Link to="/grievance">Grievance Redressal page</Link>.
        </p>
      </Section>
    </LegalShell>
  );
}

export function DeliveryPolicyPage() {
  return (
    <LegalShell
      eyebrow="From kitchen to customer"
      title="Delivery Policy"
      intro="This policy explains delivery availability, estimated times and the responsibilities shared by customers, restaurants and delivery providers."
      icon={Truck}
      highlights={[
        'Restaurant-specific service areas',
        'Live status milestones',
        'Clear support for delivery issues',
      ]}
    >
      <Section id="availability" title="1. Delivery availability">
        <p>
          Delivery is available only when the selected restaurant is published, accepting orders and
          can serve the address entered at checkout. Service areas, fees, minimum orders and opening
          status may differ by restaurant. Pickup or dine-in may be shown as alternatives.
        </p>
      </Section>
      <Section id="estimates" title="2. Estimated delivery time">
        <p>
          The time shown is an estimate based on the restaurant’s preparation range and available
          fulfilment information. It is not a guaranteed arrival time. Traffic, weather, order
          volume, ingredient availability, access restrictions and other events can cause delays.
          Order tracking shows the latest recorded status.
        </p>
      </Section>
      <Section id="customer" title="3. Customer responsibilities">
        <ul>
          <li>provide a complete, accurate and serviceable address and phone number;</li>
          <li>
            mention relevant access instructions without sharing unnecessary sensitive information;
          </li>
          <li>remain reachable and available to receive the order; and</li>
          <li>check the package promptly and report a material problem with the order ID.</li>
        </ul>
      </Section>
      <Section id="handoff" title="4. Restaurant and delivery responsibility">
        <p>
          The restaurant is responsible for preparing and packaging the food safely and accurately.
          The party performing delivery is responsible for reasonable care during transport and
          handoff. During the controlled pilot, fulfilment may be handled directly by the
          restaurant; an independent MenuMate rider network is not yet active.
        </p>
      </Section>
      <Section id="failed" title="5. Unsuccessful delivery">
        <p>
          If the recipient cannot be reached or the address is inaccurate or inaccessible,
          reasonable contact attempts may be made. The order may then be returned, left only with
          the customer’s clear instruction where safe, or marked unsuccessful. Refund eligibility
          depends on the cause, food status and applicable consumer rights.
        </p>
      </Section>
      <Section id="safety" title="6. Packaging, tampering and food safety">
        <p>
          Refuse or photograph packaging that appears materially opened, damaged or tampered with
          and contact support promptly. Keep the packaging and affected items while the complaint is
          reviewed. Food safety concerns may also be reported through the official FSSAI Food Safety
          Connect service.
        </p>
      </Section>
      <Section id="support" title="7. Delays and support">
        <p>
          For a substantial delay, missing delivery or incorrect status, contact us with your order
          ID. We will review the order record and coordinate with the restaurant or fulfilment
          provider. Any eligible refund follows the{' '}
          <Link to="/cancellation-refunds">Cancellation & Refund Policy</Link>.
        </p>
      </Section>
    </LegalShell>
  );
}

export function GrievancePage() {
  return (
    <LegalShell
      eyebrow="Customer care"
      title="Grievance Redressal"
      intro="Tell us what happened and give us the information needed to investigate. We will acknowledge your complaint and keep a traceable record."
      icon={Headphones}
      highlights={[
        'Acknowledgement within 48 hours',
        'Target resolution within one month',
        'Order ID keeps the case traceable',
      ]}
    >
      <section className="grievance-contact" aria-labelledby="grievance-officer">
        <div>
          <span className="eyebrow">Grievance officer</span>
          <h2 id="grievance-officer">{operator.grievanceOfficer}</h2>
          <p>MenuMate customer and restaurant-partner grievances</p>
        </div>
        <div className="grievance-contact-list">
          <a href={`mailto:${operator.email}`}>
            <Mail size={18} />
            <span>
              <small>Email</small>
              {operator.email}
            </span>
          </a>
          <a href={operator.phoneHref}>
            <Headphones size={18} />
            <span>
              <small>Phone</small>
              {operator.phone}
            </span>
          </a>
          <div>
            <MapPin size={18} />
            <span>
              <small>Postal address</small>
              {operator.address}
            </span>
          </div>
        </div>
      </section>
      <Section id="raise" title="1. Raise a complaint">
        <p>
          Email or call the grievance officer. Use a clear subject such as “Order complaint — OD-…”
          or “Privacy request”. Include your name, account email or phone, order or reservation ID,
          the date of the event, a concise description and the resolution requested. Share
          photographs or payment references only when relevant. Never send a password, OTP, UPI PIN
          or full card number.
        </p>
      </Section>
      <Section id="timeline" title="2. What happens next">
        <ol>
          <li>We aim to acknowledge receipt within 48 hours and provide a complaint reference.</li>
          <li>We review the platform record and may request limited additional information.</li>
          <li>
            Where needed, we coordinate with the restaurant, delivery party or payment provider.
          </li>
          <li>
            We aim to resolve the grievance within one month from receipt, subject to applicable law
            and the complexity of the matter.
          </li>
        </ol>
      </Section>
      <Section id="urgent" title="3. Urgent food-safety concerns">
        <p>
          Stop consuming food you reasonably believe is unsafe, preserve the food and packaging
          where practical, and contact us and the restaurant immediately. You may also use the{' '}
          <a href="https://foscos.fssai.gov.in/consumergrievance/" target="_blank" rel="noreferrer">
            FSSAI Food Safety Connect portal <ArrowUpRight size={13} />
          </a>
          .
        </p>
      </Section>
      <Section id="external" title="4. External consumer support">
        <p>
          If you are not satisfied with our response, your statutory remedies remain available. You
          may contact the{' '}
          <a href="https://consumerhelpline.gov.in/" target="_blank" rel="noreferrer">
            National Consumer Helpline <ArrowUpRight size={13} />
          </a>{' '}
          or another competent consumer authority. Using our internal process does not waive any
          legal right.
        </p>
      </Section>
      <Section id="privacy-grievance" title="5. Privacy requests">
        <p>
          For access, correction, erasure or another privacy request, write “Privacy request” in the
          subject and identify the account involved. We may ask for proportionate verification
          before disclosing or changing account data. See the{' '}
          <Link to="/privacy">Privacy Policy</Link> for details.
        </p>
      </Section>
    </LegalShell>
  );
}
