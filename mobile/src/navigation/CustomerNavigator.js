import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// Screens — Home stack
import CustomerHomeScreen from '../screens/customer/CustomerHomeScreen';
import MyVehiclesScreen from '../screens/customer/MyVehiclesScreen';
import AddVehicleScreen from '../screens/customer/AddVehicleScreen';
import EditVehicleScreen from '../screens/customer/EditVehicleScreen';

// Screens — Services stack (booking flow)
import ServicesScreen from '../screens/customer/ServicesScreen';
import ServiceDetailsScreen from '../screens/customer/ServiceDetailsScreen';
import BookWashScreen from '../screens/customer/BookWashScreen';
import SelectDateTimeScreen from '../screens/customer/SelectDateTimeScreen';
import BookingReviewScreen from '../screens/customer/BookingReviewScreen';
import PaymentScreen from '../screens/customer/PaymentScreen';
import BookingSuccessScreen from '../screens/customer/BookingSuccessScreen';

// Screens — Bookings stack
import MyBookingsScreen from '../screens/customer/MyBookingsScreen';
import BookingDetailsScreen from '../screens/customer/BookingDetailsScreen';

// Screens — Notifications
import NotificationsScreen from '../screens/customer/NotificationsScreen';

// Screens — Profile stack
import ProfileScreen from '../screens/customer/ProfileScreen';
import EditProfileScreen from '../screens/customer/EditProfileScreen';

import colors from '../theme/colors';
import typography from '../theme/typography';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ─── Nested Stacks ─────────────────────────────────────────────────────────

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CustomerHome" component={CustomerHomeScreen} />
      <Stack.Screen name="MyVehicles" component={MyVehiclesScreen} />
      <Stack.Screen name="AddVehicle" component={AddVehicleScreen} />
      <Stack.Screen name="EditVehicle" component={EditVehicleScreen} />
    </Stack.Navigator>
  );
}

function ServicesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Services" component={ServicesScreen} />
      <Stack.Screen name="ServiceDetails" component={ServiceDetailsScreen} />
      <Stack.Screen name="BookWash" component={BookWashScreen} />
      <Stack.Screen name="SelectDateTime" component={SelectDateTimeScreen} />
      <Stack.Screen name="BookingReview" component={BookingReviewScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="BookingSuccess" component={BookingSuccessScreen} options={{ gestureEnabled: false, headerBackVisible: false }} />
    </Stack.Navigator>
  );
}

function BookingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
      <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    </Stack.Navigator>
  );
}

// ─── Book CTA Tab Icon ──────────────────────────────────────────────────────

function BookTabIcon({ color, focused }) {
  return (
    <View style={styles.bookIcon}>
      <Ionicons name="car-sport" size={26} color={colors.white} />
    </View>
  );
}

// ─── Main Tab Navigator ─────────────────────────────────────────────────────

export default function CustomerNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.ocean,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          elevation: 8,
          shadowColor: colors.black,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: typography.fontSizes.xs,
          fontWeight: typography.fontWeights.medium,
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="ServicesTab"
        component={ServicesStack}
        options={{
          tabBarLabel: 'Services',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'sparkles' : 'sparkles-outline'} size={22} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="BookTab"
        component={ServicesStack}
        options={{
          tabBarLabel: '',
          tabBarShowLabel: false,
          tabBarIcon: ({ color, focused }) => <BookTabIcon color={color} focused={focused} />,
          tabBarItemStyle: {
            justifyContent: 'center',
            alignItems: 'center',
          },
        }}
      />

      <Tab.Screen
        name="BookingsTab"
        component={BookingsStack}
        options={{
          tabBarLabel: 'Bookings',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={22} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsScreen}
        options={{
          tabBarLabel: 'Alerts',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={22} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bookIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.ocean,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    elevation: 4,
    shadowColor: colors.ocean,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
});
