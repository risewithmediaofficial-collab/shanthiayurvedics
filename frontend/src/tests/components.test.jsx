/**
 * Unit tests for common UI components:
 *   - Badge
 *   - Button
 *   - Input
 *   - EmptyState
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Badge } from '../components/common/Badge.jsx';
import { Button } from '../components/common/Button.jsx';
import { Input } from '../components/common/Input.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';

describe('Badge component', () => {
  it('renders children correctly', () => {
    render(<Badge>Delivered</Badge>);
    expect(screen.getByText('Delivered')).toBeInTheDocument();
  });

  it('applies default classes and variants', () => {
    const { container } = render(<Badge variant="success">Completed</Badge>);
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('text-emerald-700');
  });

  it('applies different variants correctly', () => {
    const { container, rerender } = render(<Badge variant="danger">Failed</Badge>);
    expect(container.querySelector('span')).toHaveClass('text-rose-700');

    rerender(<Badge variant="warning">Pending</Badge>);
    expect(container.querySelector('span')).toHaveClass('text-amber-800');

    rerender(<Badge variant="info">Processing</Badge>);
    expect(container.querySelector('span')).toHaveClass('text-sky-700');
  });

  it('applies size classes properly', () => {
    const { container, rerender } = render(<Badge size="sm">Small</Badge>);
    expect(container.querySelector('span')).toHaveClass('text-[10px]');

    rerender(<Badge size="lg">Large</Badge>);
    expect(container.querySelector('span')).toHaveClass('text-sm');
  });
});

describe('Button component', () => {
  it('renders button label and fires onClick', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Submit Order</Button>);

    const button = screen.getByRole('button', { name: /submit order/i });
    expect(button).toBeInTheDocument();

    await userEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables the button when disabled prop is true', async () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);

    const button = screen.getByRole('button', { name: /disabled/i });
    expect(button).toBeDisabled();

    await userEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('shows loading state and prevents click when isLoading is true', async () => {
    const handleClick = vi.fn();
    render(<Button isLoading onClick={handleClick}>Save Changes</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();

    await userEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders variants like secondary and danger correctly', () => {
    const { container, rerender } = render(<Button variant="danger">Delete</Button>);
    expect(container.querySelector('button')).toHaveClass('bg-rose-600');

    rerender(<Button variant="secondary">Cancel</Button>);
    expect(container.querySelector('button')).toHaveClass('bg-white');
  });
});

describe('Input component', () => {
  it('renders label and handles typing', async () => {
    const handleChange = vi.fn();
    render(
      <Input
        label="Patient Name"
        placeholder="Enter name"
        onChange={handleChange}
      />
    );

    const input = screen.getByPlaceholderText('Enter name');
    expect(screen.getByText('Patient Name')).toBeInTheDocument();

    await userEvent.type(input, 'Sarmila');
    expect(input).toHaveValue('Sarmila');
    expect(handleChange).toHaveBeenCalled();
  });

  it('displays required asterisk when required is true', () => {
    render(<Input label="Mobile Number" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('displays error message when error prop is passed', () => {
    render(<Input label="Pincode" error="Pincode must be 6 digits" />);
    expect(screen.getByText('Pincode must be 6 digits')).toBeInTheDocument();
  });

  it('displays helper text when no error is present', () => {
    render(<Input label="Address" helperText="Door no, street, landmark" />);
    expect(screen.getByText('Door no, street, landmark')).toBeInTheDocument();
  });

  it('toggles password visibility when toggle button is clicked', async () => {
    render(
      <Input
        label="Password"
        type="password"
        placeholder="Enter password"
        showPasswordToggle
      />
    );

    const input = screen.getByPlaceholderText('Enter password');
    expect(input).toHaveAttribute('type', 'password');

    const toggleBtn = screen.getByRole('button', { name: /show password/i });
    await userEvent.click(toggleBtn);
    expect(input).toHaveAttribute('type', 'text');

    const hideBtn = screen.getByRole('button', { name: /hide password/i });
    await userEvent.click(hideBtn);
    expect(input).toHaveAttribute('type', 'password');
  });
});

describe('EmptyState component', () => {
  it('renders default empty state text', () => {
    render(<EmptyState />);
    expect(screen.getByText('No records found')).toBeInTheDocument();
    expect(screen.getByText(/There are no items to display/i)).toBeInTheDocument();
  });

  it('renders custom title, description, and triggers onAction button', async () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        title="No Orders Found"
        description="Try adjusting your filters or date range"
        actionLabel="Create First Order"
        onAction={handleAction}
      />
    );

    expect(screen.getByText('No Orders Found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your filters or date range')).toBeInTheDocument();

    const actionBtn = screen.getByRole('button', { name: /create first order/i });
    expect(actionBtn).toBeInTheDocument();

    await userEvent.click(actionBtn);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});
