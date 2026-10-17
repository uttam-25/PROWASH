import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../hooks/useAuth';
import LoadingView from '../components/LoadingView';
import AuthNavigator from './AuthNavigator';
import CustomerNavigator from './CustomerNavigator';
import AdminNavigator from './AdminNavigator';
import SplashScreen from '../screens/auth/SplashScreen';

// Deep link config for password reset
const linking = {
  prefixes: ['prowash://'],
  config: {
    screens: {
      Auth: {
        screens: {
          ResetPassword: 'reset-password/:token',
        },
      },
    },
  },
};

const Root = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingView message="Loading PROWASH…" />;
  }

  return (
    <NavigationContainer linking={linking}>
      <Root.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // Unauthenticated — show splash then auth flow
          <>
            <Root.Screen name="Splash" component={SplashScreen} />
            <Root.Screen name="Auth" component={AuthNavigator} />
            {/* Allow direct navigation to named auth screens */}
            <Root.Screen name="Welcome" component={require('../screens/auth/WelcomeScreen').default} />
            <Root.Screen name="Login" component={require('../screens/auth/LoginScreen').default} />
            <Root.Screen name="Register" component={require('../screens/auth/RegisterScreen').default} />
            <Root.Screen name="ForgotPassword" component={require('../screens/auth/ForgotPasswordScreen').default} />
            <Root.Screen name="ResetPassword" component={require('../screens/auth/ResetPasswordScreen').default} />
          </>
        ) : user.role === 'admin' ? (
          <>
            <Root.Screen name="AdminHome" component={AdminNavigator} />
          </>
        ) : (
          <>
            <Root.Screen name="CustomerHome" component={CustomerNavigator} />
          </>
        )}
      </Root.Navigator>
    </NavigationContainer>
  );
}
