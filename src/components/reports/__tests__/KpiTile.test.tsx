import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { KpiTile } from '../KpiTile';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

describe('KpiTile Component', () => {
  it('renders label and formatted value correctly with icon and tone', () => {
    render(
      <KpiTile
        label="Total Revenue"
        value="LKR 1,250,000.00"
        tone="success"
        hint="+12.5% vs last month"
        icon={<TrendingUpIcon data-testid="kpi-icon" />}
      />
    );

    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('LKR 1,250,000.00')).toBeInTheDocument();
    expect(screen.getByText('+12.5% vs last month')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-icon')).toBeInTheDocument();
  });

  it('renders hint and neutral state', () => {
    render(
      <KpiTile
        label="Active Rentals"
        value="42 units"
        hint="Across 18 customers"
      />
    );

    expect(screen.getByText('Active Rentals')).toBeInTheDocument();
    expect(screen.getByText('42 units')).toBeInTheDocument();
    expect(screen.getByText('Across 18 customers')).toBeInTheDocument();
  });
});
