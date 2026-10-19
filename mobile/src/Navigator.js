import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from './context/AuthContext';
import { useApp } from './context/AppContext';
import { theme as T } from './theme';

import WelcomeScreen from './screens/auth/WelcomeScreen';
import SignInScreen from './screens/auth/SignInScreen';
import SignUpScreen from './screens/auth/SignUpScreen';
import FeedScreen from './screens/FeedScreen';
import SearchScreen from './screens/SearchScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import MessagesScreen from './screens/MessagesScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import PostDetailScreen from './screens/PostDetailScreen';
import UserProfileScreen from './screens/UserProfileScreen';
import HashtagScreen from './screens/HashtagScreen';
import SavedScreen from './screens/SavedScreen';

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

const navTheme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: T.bg, card: T.bg, border: T.border, text: T.text, primary: T.accent } };

const ICONS = {
  Home:          ['home', 'home-outline'], // X uses solid when active
  Search:        ['search', 'search-outline'],
  Notifications: ['notifications', 'notifications-outline'],
  Messages:      ['mail', 'mail-outline']
};

function AuthFlow() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: T.bg } }}>
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="SignIn" component={SignInScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
    </AuthStack.Navigator>
  );
}

function MainTabs() {
  const { state } = useApp();
  const unreadNotifs = (state.notifications || []).filter(n => !n.read).length;
  const unreadMsgs = (state.conversations || []).reduce((acc, c) => acc + c.messages.filter(m => m.from !== 'me' && !m.read).length, 0);

  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: { backgroundColor: T.bg, borderTopColor: T.border, height: 60, paddingBottom: 8, paddingTop: 8 },
      tabBarActiveTintColor: T.text,
      tabBarInactiveTintColor: T.subText,
      tabBarLabelStyle: { display: 'none' }, // X hides labels
      tabBarIcon: ({ color, focused }) => {
        const [on, off] = ICONS[route.name] || ['ellipse', 'ellipse-outline'];
        return <Ionicons name={focused ? on : off} size={28} color={color} />;
      }
    })}>
      <Tab.Screen name="Home" component={FeedScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ tabBarBadge: unreadNotifs > 0 ? unreadNotifs : undefined, tabBarBadgeStyle: { backgroundColor: T.accent, color: '#FFF' } }} />
      <Tab.Screen name="Messages" component={MessagesScreen} options={{ tabBarBadge: unreadMsgs > 0 ? unreadMsgs : undefined, tabBarBadgeStyle: { backgroundColor: T.accent, color: '#FFF' } }} />
      
      {/* Hidden Tabs (Accessible via navigation, but not shown on bottom bar) */}
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarButton: () => null }} />
    </Tab.Navigator>
  );
}

function Root() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: T.bg } }}>
      <RootStack.Screen name="MainTabs" component={MainTabs} />
      <RootStack.Screen name="PostDetail" component={PostDetailScreen} />
      <RootStack.Screen name="UserProfile" component={UserProfileScreen} />
      <RootStack.Screen name="Hashtag" component={HashtagScreen} />
      <RootStack.Screen name="Saved" component={SavedScreen} />
    </RootStack.Navigator>
  );
}

export default function Navigator() {
  const { user, ready } = useAuth();
  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={T.accent} size="large" />
      </View>
    );
  }
  return (
    <NavigationContainer theme={navTheme}>
      {user ? <Root /> : <AuthFlow />}
    </NavigationContainer>
  );
}
