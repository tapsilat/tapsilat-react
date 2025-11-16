# Tapsilat React

React provider and hooks that wrap the [`@tapsilat/tapsilat-js`](https://www.npmjs.com/package/@tapsilat/tapsilat-js) SDK. The goal is to make it trivial to configure the Tapsilat client once and consume payment APIs throughout your component tree with ergonomic hooks.

## Installation

```bash
npm install tapsilat-react @tapsilat/tapsilat-js
```

Because this is a React helper library you should also have `react` (and usually `react-dom`) installed in your host application.

## Quick start

```tsx
import { TapsilatProvider, useTapsilatOrder } from 'tapsilat-react';

const CheckoutButton = () => {
  const { createOrder, order } = useTapsilatOrder();
  const { loading } = order;

  const handleCheckout = async () => {
    const newOrder = await createOrder({
      amount: 150.75,
      currency: 'TRY',
      locale: 'tr',
      basket_items: [],
      billing_address: {
        address: 'Beyoglu',
        city: 'Istanbul',
        contact_name: 'John Doe',
        country: 'TR',
        zip_code: '34000',
      },
      buyer: {
        name: 'John',
        surname: 'Doe',
        email: 'john.doe@example.com',
      },
    } as any); // provide the real payload in production

    window.location.href = newOrder.checkout_url ?? '/thank-you';
  };

  return (
    <button onClick={handleCheckout} disabled={loading}>
      {loading ? 'Redirecting…' : 'Pay with Tapsilat'}
    </button>
  );
};

const App = () => (
  <TapsilatProvider
    config={{
      bearerToken: process.env.NEXT_PUBLIC_TAPSILAT_TOKEN!,
      baseURL: 'https://panel.tapsilat.dev/api/v1',
    }}
  >
    <CheckoutButton />
  </TapsilatProvider>
);
```

### Available hooks

- `useTapsilat()` – returns the raw SDK instance, resolved config, and a `refreshClient` helper for rotating credentials.
- `useTapsilatClient()` – shorthand for `useTapsilat().client` when you need direct SDK access.
- `useTapsilatOrder()` – tracks the async state of `createOrder` and `getOrderStatus`, exposing `order` and `status` result objects.
- `useTapsilatWebhook()` – convenient signature verification helper for server components / API routes.
- `useTapsilatHealth()` – runs the SDK health check endpoint and exposes loading/result state.

## Local development

Install dependencies, run the test harness, and build distributable artifacts:

```bash
npm install
npm test
npm run build
```

`npm test` runs the Vitest suite that exercises the provider and hooks. `npm run build` bundles the library with `tsup`, emitting both ESM and CJS outputs plus TypeScript declarations.

## Examples

A minimal usage example (without any bundler assumptions) lives in `examples/basic/App.tsx`. It mirrors the snippet above and can be copied into your application.

## License

MIT © Tapsilat
