import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from '../../layout/sidebar';

const mockUsePathname = vi.fn(() => '/recordings');
const mockUseAuth = vi.fn(() => ({
  user: { id: 'test-user', email: 'test@example.com' },
  logout: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('Sidebar', () => {
  it('should render navigation links', () => {
    render(<Sidebar />);
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Recordings')).toBeInTheDocument();
    expect(screen.getByText('Record')).toBeInTheDocument();
  });

  it('should display user email', () => {
    render(<Sidebar />);
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });
});
