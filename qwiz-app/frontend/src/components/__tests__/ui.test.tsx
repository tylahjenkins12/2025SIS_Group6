import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, Input, Badge, ConfirmDialog } from '../ui';

describe('Button Component', () => {
  it('renders and handles clicks', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);

    const button = screen.getByRole('button', { name: /click me/i });
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('Input Component', () => {
  it('accepts user input', () => {
    render(<Input placeholder="Enter code" />);
    const input = screen.getByPlaceholderText('Enter code') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'ABC123' } });

    expect(input.value).toBe('ABC123');
  });
});

describe('Badge Component', () => {
  it('renders with different variants', () => {
    const { rerender } = render(<Badge variant="success">Success</Badge>);
    expect(screen.getByText('Success')).toBeInTheDocument();

    rerender(<Badge variant="error">Error</Badge>);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });
});

describe('ConfirmDialog Component', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    title: 'Confirm',
    message: 'Are you sure?',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    render(<ConfirmDialog {...mockProps} />);
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ConfirmDialog {...mockProps} isOpen={false} />);
    expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
  });

  it('calls callbacks on button clicks', () => {
    render(<ConfirmDialog {...mockProps} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockProps.onClose).toHaveBeenCalled();

    jest.clearAllMocks();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(mockProps.onConfirm).toHaveBeenCalled();
    expect(mockProps.onClose).toHaveBeenCalled();
  });
});
