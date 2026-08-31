import { Tabs } from 'expo-router'
import { Text } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Colors } from '../../src/theme'

export default function AppLayout() {
  return (
    <Tabs
      // Back from the settings stack should return to Profile (the previous
      // route), not jump to the first tab.
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 88,
          paddingBottom: 24,
          paddingTop: 12,
        },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size }) => <Feather name="compass" size={size} color={color} />,
          tabBarLabel: ({ children }) => (
            <Text testID="tab-discover" style={{ fontSize: 10, color: 'transparent' }}>{children}</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          tabBarIcon: ({ color, size }) => <Feather name="message-circle" size={size} color={color} />,
          tabBarLabel: ({ children }) => (
            <Text testID="tab-matches" style={{ fontSize: 10, color: 'transparent' }}>{children}</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
          tabBarLabel: ({ children }) => (
            <Text testID="tab-profile" style={{ fontSize: 10, color: 'transparent' }}>{children}</Text>
          ),
        }}
      />
      {/* Settings stack: hidden from the tab bar (href: null) but rendered
          inside the Tabs navigator so the bar stays visible on its screens. */}
      <Tabs.Screen name="settings" options={{ href: null }} />
      {/* Profile detail stack (person/[userId]) — same pattern as settings:
          no tab of its own, tab bar stays visible. */}
      <Tabs.Screen name="person" options={{ href: null }} />
    </Tabs>
  )
}
