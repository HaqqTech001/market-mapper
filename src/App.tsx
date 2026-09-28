import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ResponsiveShell } from './components/layout/ResponsiveShell';

// Auth Screens
import { SplashScreen } from './screens/auth/SplashScreen';
import { SignInScreen } from './screens/auth/SignInScreen';
import { RegisterScreen } from './screens/auth/RegisterScreen';
import { VerifyAccountScreen } from './screens/auth/VerifyAccountScreen';
import { ForgotPasswordScreen } from './screens/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from './screens/auth/ResetPasswordScreen';

// Core Screens
import { HomeScreen } from './screens/main/HomeScreen';
import { MapScreen } from './screens/main/MapScreen';
import { MissionsScreen } from './screens/main/MissionsScreen';
import { ChatScreen } from './screens/main/ChatScreen';
import { MoreScreen } from './screens/main/MoreScreen';
import { NotificationsScreen } from './screens/main/NotificationsScreen';
import { OfflineDataScreen } from './screens/main/OfflineDataScreen';
import { RevisitsScreen } from './screens/main/RevisitsScreen';
import { FieldGuideScreen } from './screens/main/FieldGuideScreen';
import { ProfileScreen } from './screens/main/ProfileScreen';
import { AdminScreen } from './screens/main/AdminScreen';

const ScreenRouter: React.FC = () => {
  const { currentRoute } = useApp();

  switch (currentRoute) {
    case 'splash':
      return <SplashScreen />;
    case 'sign_in':
      return <SignInScreen />;
    case 'register':
      return <RegisterScreen />;
    case 'verify_account':
      return <VerifyAccountScreen />;
    case 'forgot_password':
      return <ForgotPasswordScreen />;
    case 'reset_password':
      return <ResetPasswordScreen />;
    case 'home':
      return <HomeScreen />;
    case 'map':
      return <MapScreen />;
    case 'missions':
      return <MissionsScreen />;
    case 'chat':
      return <ChatScreen />;
    case 'more':
      return <MoreScreen />;
    case 'notifications':
      return <NotificationsScreen />;
    case 'offline':
      return <OfflineDataScreen />;
    case 'revisits':
      return <RevisitsScreen />;
    case 'guide':
      return <FieldGuideScreen />;
    case 'profile':
      return <ProfileScreen />;
    case 'admin':
      return <AdminScreen />;
    default:
      return <HomeScreen />;
  }
};

export default function App() {
  return (
    <AppProvider>
      <ResponsiveShell>
        <ScreenRouter />
      </ResponsiveShell>
    </AppProvider>
  );
}
