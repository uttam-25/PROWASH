import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AdminHomeScreen from '../screens/admin/AdminHomeScreen';

const Stack = createNativeStackNavigator();

export default function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
      {/* Additional admin screens added in Phase 2 */}
    </Stack.Navigator>
  );
}
