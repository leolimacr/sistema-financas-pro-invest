import React from 'react';
import { useAppState } from './hooks/useAppState';
import AppRoutes from './routes/AppRoutes';
import AppLoadingScreen from './components/AppLoadingScreen';

const App: React.FC = () => {
  const state = useAppState();

  if (state.authLoading && !state.user) {
    return <AppLoadingScreen />;
  }

  return <AppRoutes state={state} />;
};

export default App;
