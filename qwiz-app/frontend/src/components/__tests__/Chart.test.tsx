import React from 'react';
import { render, screen } from '@testing-library/react';
import { ColumnChart } from '../Chart';

describe('ColumnChart Component', () => {
  it('renders chart with data', () => {
    const data = [
      { label: 'A', value: 10 },
      { label: 'B', value: 20 },
      { label: 'C', value: 15 },
    ];

    render(<ColumnChart data={data} />);

    // Check if labels are rendered
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();

    // Check if values are rendered
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('handles empty data', () => {
    const { container } = render(<ColumnChart data={[]} />);
    expect(container.querySelector('.grid')).toBeInTheDocument();
  });

  it('highlights correct answer', () => {
    const data = [
      { label: 'A', value: 5, highlight: true },
      { label: 'B', value: 3, highlight: false },
    ];

    const { container } = render(<ColumnChart data={data} />);

    // Check for highlight class on first bar
    const bars = container.querySelectorAll('[class*="bg-"]');
    expect(bars[0]).toHaveClass('bg-indigo-600');
    expect(bars[1]).toHaveClass('bg-gray-300');
  });
});
