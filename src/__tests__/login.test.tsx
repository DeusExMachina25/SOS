import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import LoginPage from '../app/login/page';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    prefetch: vi.fn(),
    replace: vi.fn(),
  }),
}));

// Mock framer-motion to prevent JSDOM animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock Supabase client
vi.mock('@/utils/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
    },
  },
}));

describe('LoginPage client input mode switching and validation', () => {
  it('defaults to email mode with email placeholder and no +91 prefix', () => {
    render(<LoginPage />);
    
    const input = screen.getByPlaceholderText('phone number or email') as HTMLInputElement;
    expect(input.value).toBe('');
    
    // +91 should not be visible initially
    const prefix = screen.queryByText('+91');
    expect(prefix).toBeNull();
  });

  it('switches to phone mode with +91 prefix when >5 digits are typed', () => {
    render(<LoginPage />);
    const input = screen.getByPlaceholderText('phone number or email') as HTMLInputElement;

    // Type 5 digits - should remain email mode
    fireEvent.change(input, { target: { value: '12345' } });
    expect(screen.queryByText('+91')).toBeNull();

    // Type 6 digits - should switch to phone mode and show prefix
    fireEvent.change(input, { target: { value: '123456' } });
    const prefix = screen.getByText('+91');
    expect(prefix).toBeDefined();
  });

  it('caps phone numbers at 10 digits and strips extra leading country codes', () => {
    render(<LoginPage />);
    const input = screen.getByPlaceholderText('phone number or email') as HTMLInputElement;

    // Type a number starting with +91, it should clean it
    fireEvent.change(input, { target: { value: '+919876543210' } });
    expect(input.value).toBe('9876543210');

    // Type a 12 digit number starting with 91, it should clean it
    fireEvent.change(input, { target: { value: '919876543210' } });
    expect(input.value).toBe('9876543210');

    // Trying to type more than 10 digits should cap it at 10
    fireEvent.change(input, { target: { value: '98765432109999' } });
    expect(input.value).toBe('9876543210');
  });

  it('switches back to email mode when characters or @ are present', () => {
    render(<LoginPage />);
    const input = screen.getByPlaceholderText('phone number or email') as HTMLInputElement;

    // Switch to phone first
    fireEvent.change(input, { target: { value: '987654' } });
    expect(screen.getByText('+91')).toBeDefined();

    // Add @ symbol
    fireEvent.change(input, { target: { value: '987654@' } });
    expect(screen.queryByText('+91')).toBeNull();

    // Change to a regular email address
    fireEvent.change(input, { target: { value: 'test@sos.com' } });
    expect(screen.queryByText('+91')).toBeNull();
  });
});
