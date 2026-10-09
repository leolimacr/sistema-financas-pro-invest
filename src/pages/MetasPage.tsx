import React from 'react';
import GoalManager from '../components/tools/goals/GoalManager';
import { useFirebase } from '../hooks/useFirebase';
import { auth } from '../firebase'; // Importa a instância de autenticação

const MetasPage: React.FC = () => {
  const { userMeta } = useFirebase(auth.currentUser?.uid);

  return <GoalManager userId={auth.currentUser?.uid || undefined} userMeta={userMeta} />;
};

export default MetasPage;