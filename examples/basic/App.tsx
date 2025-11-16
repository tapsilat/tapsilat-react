import { TapsilatProvider, useTapsilatOrder } from '../../src';

const CheckoutButton = () => {
  const { createOrder, order } = useTapsilatOrder();

  const handleCheckout = async () => {
    const result = await createOrder({
      amount: 100,
      currency: 'TRY',
      locale: 'tr',
      basket_items: [],
      billing_address: {
        address: 'Demo Address',
        city: 'Istanbul',
        contact_name: 'Demo User',
        country: 'TR',
        zip_code: '34000',
      },
      buyer: {
        name: 'Demo',
        surname: 'User',
        email: 'demo@example.com',
      },
    } as any);

    console.log('Checkout URL:', result.checkout_url);
  };

  return (
    <button type="button" onClick={handleCheckout} disabled={order.loading}>
      {order.loading ? 'Creating order…' : 'Create Tapsilat Order'}
    </button>
  );
};

export const App = () => (
  <TapsilatProvider config={{ bearerToken: 'replace-me', baseURL: 'https://panel.tapsilat.dev/api/v1' }}>
    <CheckoutButton />
  </TapsilatProvider>
);
