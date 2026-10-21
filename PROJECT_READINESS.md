# MenuMate product readiness and business plan

Status reviewed on 21 October 2026.

## Current position

MenuMate has a solid marketplace MVP foundation. Customers can discover restaurants and menus,
create accounts, manage a cart and favourites, see their records and leave verified reviews.
Restaurant owners can register a separate workspace, manage dishes and availability, publish their
storefront and process orders. Platform administrators can moderate restaurants, reviews, orders
and reservations. Express APIs, MongoDB Atlas persistence, authentication, role checks, CSRF
protection, rate limits, image validation and automated tests are in place.

The deployed application is suitable for demonstrations, restaurant onboarding trials and
controlled user testing. It is not ready to promise real delivery or accept public live payments.

## Launch blockers

1. **Transactional email configuration:** create a Resend key, verify a sending domain and set
   `RESEND_API_KEY`, `EMAIL_FROM` and `ADMIN_NOTIFICATION_EMAIL` on Render. Until then password
   recovery returns a clear temporary-unavailable response, and welcome/login emails are skipped.
2. **Real checkout:** production demo checkout and cash-on-delivery order creation are deliberately
   disabled. Razorpay integration currently accepts Test Mode keys only. Live charging, settlement
   and payout rules need a separate reviewed release.
3. **Restaurant payouts:** commissions, invoices, refund deductions, settlement statements and bank
   payouts are not implemented. A paid order currently belongs to the platform payment account.
4. **Delivery operations:** there is no rider application, dispatch assignment, GPS tracking,
   delivery-zone validation, proof of delivery or real ETA calculation.
5. **Durable photo storage:** Render's free filesystem is temporary. Partner uploads need object
   storage such as Cloudinary or S3-compatible storage before restaurants rely on them.
6. **Compliance onboarding:** the platform needs its applicable e-commerce FBO Central Licence,
   and restaurant onboarding must collect, verify and display each seller's valid FSSAI
   licence/registration number before publication. These fields and checks are not implemented.
   FSSAI's current eligibility tool identifies e-commerce as a
   [Central Licence category](https://foscos.fssai.gov.in/search-eligibility/CL), and its
   [December 2024 advisory](https://www.fssai.gov.in/upload/advisories/2024/12/674efa161d756Adobe%20Scan%203%20Dec%202024.pdf)
   reiterates that an e-commerce FBO must not list a seller without displaying that valid number.
7. **Marketplace policies:** publish Terms, Privacy, cancellation/refund, delivery and grievance
   policies. Review the official
   [Consumer Protection (E-Commerce) Rules](https://consumeraffairs.nic.in/rules-made-under-consumer-protection-act-2019?page=3)
   with a qualified adviser before launch.
8. **Tax and accounting:** determine the electronic-commerce operator's GST responsibilities,
   invoicing and restaurant settlements with a CA. Section 9(5) can place liability for notified
   services on the operator; use the [CBIC guidance](https://cbic-gst.gov.in/hindi/sectoral-faq.html)
   as a starting point, not as project-specific legal advice.
9. **Production support:** contact submissions and table reservations are still demo-only in
   production. Connect them to owner notifications and restaurant-specific availability.
10. **Operations and reliability:** add error monitoring, structured audit logs, database and image
    backups, uptime alerts, a distributed rate limiter, analytics, accessibility/browser QA and a
    tested incident/refund process.

## Who benefits

- **Customers** get one account for discovering local restaurants, comparing menus and delivery
  costs, ordering, tracking history, booking tables and leaving verified feedback.
- **Independent restaurants** get an online storefront and order-management system without first
  building their own website, payment integration and customer dashboard.
- **Small or home kitchens** can reach nearby customers after the platform adds the required
  verification and service-area controls.
- **Restaurant teams** get one menu, availability and order console, reducing phone-call ordering
  errors and making prices/status visible to customers.
- **Delivery partners** can receive local work after dispatch, identity checks, earnings and safety
  workflows are implemented.
- **The platform owner** builds a local demand network and earns from transactions and optional
  restaurant tools while retaining customer support and marketplace quality control.

## How MenuMate can earn

Use several transparent revenue streams instead of depending on one large restaurant commission:

- Charge a percentage commission on completed orders. For an early Satna pilot, model several
  rates and agree one that still leaves restaurants with a healthy contribution margin.
- Keep a clearly disclosed platform fee per customer order.
- Earn a margin on delivery fees after paying the delivery partner, while avoiding hidden charges.
- Offer optional restaurant subscriptions for advanced analytics, promotions, multiple staff
  accounts, CRM tools and lower commission rates.
- Sell clearly labelled sponsored placement in discovery results without corrupting organic ratings.
- Charge an optional booking/lead fee for confirmed table reservations or event enquiries.
- Later, offer restaurant software modules such as inventory, loyalty and direct-order storefronts.

Example unit economics for a ₹500 food basket: MenuMate could earn a restaurant commission plus a
small disclosed platform fee and delivery margin. From this it must pay payment-gateway costs,
delivery-partner earnings, discounts, refunds, support, taxes and infrastructure. The remaining
amount is contribution margin. Do not launch a discount or commission until this calculation is
positive for the target delivery radius and average order value.

## Operating process

1. Verify the restaurant, food licence, location, bank and tax details.
2. Approve the storefront, menu, prices, service radius, hours, preparation time and fulfilment modes.
3. A customer selects one restaurant, places an order and pays through the platform or selects an
   explicitly supported offline method.
4. The restaurant accepts within a fixed time, prepares the meal and updates status.
5. The restaurant or assigned rider completes delivery/pickup with traceable proof.
6. MenuMate handles support, cancellations and refunds under published rules.
7. After the refund window, MenuMate produces a settlement statement, deducts agreed commission,
   fees and tax adjustments, then pays the restaurant.
8. Verified completed orders can create ratings; recurring quality or cancellation problems trigger
   platform review.

## Recommended rollout

Start hyperlocal in Satna with 5–10 manually verified restaurants and a small delivery radius.
Run a private pilot using test payments and restaurant self-delivery/pickup. Measure menu accuracy,
acceptance time, preparation time, cancellations, repeat orders and support load. Then enable a
reviewed real-payment and settlement flow. Add managed riders and broader areas only after the first
zone has reliable unit economics and operations.

The project is moving in the right direction: its customer, restaurant-owner and platform-admin
surfaces match the correct three-sided marketplace structure. The next stage is operational and
commercial infrastructure rather than another visual redesign.
