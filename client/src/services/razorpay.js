let loading;
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    const timer = setTimeout(() => failed(), 15000);
    function failed() {
      clearTimeout(timer);
      script.remove();
      loading = undefined;
      reject(new Error('Could not load Razorpay. Check your connection and try again.'));
    }
    script.onerror = failed;
    script.onload = () => {
      clearTimeout(timer);
      if (!window.Razorpay) return failed();
      resolve();
    };
    document.head.appendChild(script);
  });
  return loading;
}
export async function openRazorpay(session, customer) {
  await loadCheckout();
  return new Promise((resolve, reject) => {
    const checkout = new window.Razorpay({
      key: session.keyId,
      order_id: session.gatewayOrderId,
      amount: session.amount,
      currency: session.currency,
      name: 'MenuMate',
      description: 'Restaurant order · Test payment',
      prefill: { name: customer.name, contact: customer.phone },
      theme: { color: '#284d37' },
      handler: resolve,
      modal: {
        ondismiss: () =>
          reject(
            new Error('Checkout closed. Your bag is saved. Check payment status before retrying.'),
          ),
      },
    });
    checkout.on('payment.failed', () => {
      checkout.close();
      reject(
        new Error('Payment was not completed. Your bag is saved; you can retry this checkout.'),
      );
    });
    checkout.open();
  });
}
