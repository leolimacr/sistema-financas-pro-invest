import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import DownloadQrModal from '../components/DownloadQrModal';
import { useAuth } from '../contexts/AuthContext';
import { useEntitlement } from '../hooks/useEntitlement';

const PublicLayout: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { effectiveTier } = useEntitlement();
  const [isDownloadQrOpen, setIsDownloadQrOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface-secondary dark:bg-slate-950 text-text-primary dark:text-slate-100">
      <AppHeader
        isAuthenticated={isAuthenticated}
        userMeta={null}
        userDisplayName={user?.displayName || undefined}
        isPrivacyMode={false}
        onTogglePrivacy={() => {}}
        onLogout={() => {}}
        onOpenMobileMenu={() => {}}
        isNotificationsOpen={false}
        onOpenNotifications={() => {}}
        onOpenDownloadQr={() => setIsDownloadQrOpen(true)}
      />
      <main>
        <Outlet />
      </main>

      <DownloadQrModal
        isOpen={isDownloadQrOpen}
        onClose={() => setIsDownloadQrOpen(false)}
      />
    </div>
  );
};

export default PublicLayout;
