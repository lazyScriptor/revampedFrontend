import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DateRangeFilter } from '../DateRangeFilter';

describe('DateRangeFilter Component', () => {
  it('renders presets and handles preset selection', () => {
    const handleChange = vi.fn();
    render(
      <DateRangeFilter
        from="2026-01-01"
        to="2026-01-31"
        onChange={handleChange}
        showLabel={true}
      />
    );

    expect(screen.getByText('DATE RANGE')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('7 days')).toBeInTheDocument();
    expect(screen.getByText('30 days')).toBeInTheDocument();
    expect(screen.getByText('All time')).toBeInTheDocument();

    // Click "All time" preset
    fireEvent.click(screen.getByText('All time'));
    expect(handleChange).toHaveBeenCalledWith({ from: '', to: '' });
  });
});
