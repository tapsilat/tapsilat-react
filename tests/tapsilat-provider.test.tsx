import { PropsWithChildren, useEffect } from 'react';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { OrderCreateRequest } from '@tapsilat/tapsilat-js';

import { TapsilatProvider, type TapsilatProviderProps } from '../src/provider';
import { useTapsilat, useTapsilatOrder } from '../src/hooks';

const sdkMocks = vi.hoisted(() => {
  const createOrderMock = vi.fn();
  const getOrderStatusMock = vi.fn();
  const verifyWebhookMock = vi.fn();
  const healthCheckMock = vi.fn();

  const TapsilatSDKMock = vi.fn(function MockTapsilatSDK(this: any, config: any) {
    this.config = config;
    this.createOrder = createOrderMock;
    this.getOrderStatus = getOrderStatusMock;
    this.verifyWebhook = verifyWebhookMock;
    this.healthCheck = healthCheckMock;
  });

  return { createOrderMock, getOrderStatusMock, verifyWebhookMock, healthCheckMock, TapsilatSDKMock };
});

vi.mock('@tapsilat/tapsilat-js', () => ({
  TapsilatSDK: sdkMocks.TapsilatSDKMock,
}));

const { createOrderMock, getOrderStatusMock, verifyWebhookMock, healthCheckMock, TapsilatSDKMock } = sdkMocks;

const ProviderHarness = ({ children, config }: PropsWithChildren<{ config: TapsilatProviderProps['config'] }>) => (
  <TapsilatProvider config={config}>{children}</TapsilatProvider>
);

describe('TapsilatProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createOrderMock.mockReset();
    getOrderStatusMock.mockReset();
    verifyWebhookMock.mockReset();
    healthCheckMock.mockReset();
  });

  it('exposes config through useTapsilat', () => {
    const Probe = () => {
      const { config } = useTapsilat();
      return <span data-testid="token">{config.bearerToken}</span>;
    };

    render(
      <ProviderHarness config={{ bearerToken: 'test-token', baseURL: 'https://example.dev' }}>
        <Probe />
      </ProviderHarness>
    );

    expect(screen.getByTestId('token')).toHaveTextContent('test-token');
    expect(TapsilatSDKMock).toHaveBeenCalledWith({ bearerToken: 'test-token', baseURL: 'https://example.dev' });
  });

  it('creates orders and captures state through useTapsilatOrder', async () => {
    const orderResponse = { reference_id: 'ref_123' };
    const statusResponse = { referenceId: 'ref_123', status: 'completed', lastUpdatedAt: '2025-11-19' };
    createOrderMock.mockResolvedValue(orderResponse);
    getOrderStatusMock.mockResolvedValue(statusResponse);

    const payload = { amount: 100 } as OrderCreateRequest;

    const Probe = () => {
      const { createOrder, fetchOrderStatus, order, status } = useTapsilatOrder();

      useEffect(() => {
        const run = async () => {
          await createOrder(payload);
          await fetchOrderStatus('ref_123');
        };
        void run();
      }, [createOrder, fetchOrderStatus]);

      return (
        <>
          <span data-testid="order-ref">{order.data?.reference_id ?? 'pending'}</span>
          <span data-testid="order-status">{status.data?.status ?? 'pending'}</span>
        </>
      );
    };

    render(
      <ProviderHarness config={{ bearerToken: 'order-token' }}>
        <Probe />
      </ProviderHarness>
    );

    await waitFor(() => expect(screen.getByTestId('order-ref')).toHaveTextContent('ref_123'));
    await waitFor(() => expect(screen.getByTestId('order-status')).toHaveTextContent('completed'));

    expect(createOrderMock).toHaveBeenCalledWith(payload);
    expect(getOrderStatusMock).toHaveBeenCalledWith('ref_123');
  });

  it('refreshes the SDK instance when refreshClient is invoked', async () => {
    const initialConfig = { bearerToken: 'initial-token', baseURL: 'https://sandbox.dev' };

    const wrapper = ({ children }: PropsWithChildren) => (
      <TapsilatProvider config={initialConfig}>{children}</TapsilatProvider>
    );

    const { result } = renderHook(() => useTapsilat(), { wrapper });

    await act(async () => {
      await result.current.refreshClient({ bearerToken: 'rotated-token' });
    });

    expect(result.current.config.bearerToken).toBe('rotated-token');
    expect(TapsilatSDKMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(TapsilatSDKMock).toHaveBeenLastCalledWith({ bearerToken: 'rotated-token', baseURL: 'https://sandbox.dev' });
  });
});
