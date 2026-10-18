import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// Dashboard
import AdminHomeScreen from '../screens/admin/AdminHomeScreen';

// Bookings stack
import AdminBookingsScreen from '../screens/admin/AdminBookingsScreen';
import AdminBookingDetailsScreen from '../screens/admin/AdminBookingDetailsScreen';

// Services stack
import AdminServicesScreen from '../screens/admin/AdminServicesScreen';
import AddServiceScreen from '../screens/admin/AddServiceScreen';
import EditServiceScreen from '../screens/admin/EditServiceScreen';

// Customers stack
import AdminCustomersScreen from '../screens/admin/AdminCustomersScreen';
import AdminCustomerDetailsScreen from '../screens/admin/AdminCustomerDetailsScreen';
import AdminVehiclesScreen from '../screens/admin/AdminVehiclesScreen';

// More stack
import AdminPaymentsScreen from '../screens/admin/AdminPaymentsScreen';
import AdminCalendarScreen from '../screens/admin/AdminCalendarScreen';
import AdminScheduleScreen from '../screens/admin/AdminScheduleScreen';
import AdminReportsScreen from '../screens/admin/AdminReportsScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';

import colors from '../theme/colors';
import typography from '../theme/typography';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ─── Nested Stacks ──────────────────────────────────────────────────────────

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
    </Stack.Navigator>
  );
}

function BookingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminBookings" component={AdminBookingsScreen} />
      <Stack.Screen name="AdminBookingDetails" component={AdminBookingDetailsScreen} />
    </Stack.Navigator>
  );
}

function ServicesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminServices" component={AdminServicesScreen} />
      <Stack.Screen name="AddService" component={AddServiceScreen} />
      <Stack.Screen name="EditService" component={EditServiceScreen} />
    </Stack.Navigator>
  );
}

function CustomersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminCustomers" component={AdminCustomersScreen} />
      <Stack.Screen name="AdminCustomerDetails" component={AdminCustomerDetailsScreen} />
      <Stack.Screen name="AdminVehicles" component={AdminVehiclesScreen} />
    </Stack.Navigator>
  );
}

function MoreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} />
      <Stack.Screen name="AdminPayments" component={AdminPaymentsScreen} />
      <Stack.Screen name="AdminCalendar" component={AdminCalendarScreen} />
      <Stack.Screen name="AdminSchedule" component={AdminScheduleScreen} />
      <Stack.Screen name="AdminReports" component={AdminReportsScreen} />
    </Stack.Navigator>
  );
}

// ─── Main Tab Navigator ─────────────────────────────────────────────────────

export default function AdminNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.ocean,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.midnight,
          borderTopColor: 'rgba(255,255,255,0.1)',
          borderTopWidth: 1,
          elevation: 8,
          shadowColor: colors.black,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: typography.fontSizes.xs,
          fontWeight: typography.fontWeights.medium,
        },
        tabBarActiveTintColor: colors.aqua,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
      })}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardStack}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'grid' : 'grid-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tab.Screen
        name="BookingsTab"
        component={BookingsStack}
        options={{
          tabBarLabel: 'Bookings',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tab.Screen
        name="ServicesTab"
        component={ServicesStack}
        options={{
          tabBarLabel: 'Services',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'sparkles' : 'sparkles-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tab.Screen
        name="CustomersTab"
        component={CustomersStack}
        options={{
          tabBarLabel: 'Customers',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tab.Screen
        name="MoreTab"
        component={MoreStack}
        options={{
          tabBarLabel: 'More',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'ellipsis-horizontal' : 'ellipsis-horizontal-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
