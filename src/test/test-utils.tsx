import React from 'react';
import type { RenderOptions } from '@testing-library/react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import type { User } from 'firebase/auth';

interface WrapperProps {
  children: React.ReactNode;
  user?: User | null;
}

const AllTheProviders = ({ children, user = null }: WrapperProps) => {
  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      loading: false,
      logout: async () => {},
    }}>
      {children}
    </AuthContext.Provider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { user?: User | null }
) => {
  const { user, ...renderOptions } = options || {};
  return render(ui, {
    wrapper: (props) => <AllTheProviders {...props} user={user} />,
    ...renderOptions,
  });
};

export * from '@testing-library/react';
export { customRender as render };
