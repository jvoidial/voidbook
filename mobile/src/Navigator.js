import React from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from './context/AuthContext';
import { theme as T } from './theme';

import WelcomeScreen from './screens/auth/WelcomeScreen';
import SignInScreen from './screens/auth/SignInScreen';
import SignUpScreen from './screens/auth/SignUpScreen';
import FeedScreen from './screens/FeedScreen';
import FriendsScreen from './screens/FriendsScreen';
import MessagesScreen from './screens/MessagesScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import GroupsScreen from './screens/GroupsScreen';
import MarketplaceScreen from './screens/MarketplaceScreen';
import WatchScreen from './screens/WatchScreen';
import ProfileScreen from './screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const AuthStack = createNativeStackNavigator();

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background:T.bg, card:T.bg,
            border:T.border, text:T.text, primary:T.accent }
};

const ICONS = {
  Feed:          ['home-outline', 'home'],
  Friends:       ['people-outline', 'people'],
  Messages:      ['chatbubble-outline', 'chatbubble'],
  Notifications: ['notifications-outline', 'notifications'],
  Groups:        ['people-circle-outline', 'people-circle'],
  Market:        ['cart-outline', 'cart'],
  Watch:         ['play-circle-outline', 'play-circle'],
  Profile:       ['person-outline', 'person']
};

function AuthFlow() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown:false, contentStyle:{ backgroundColor:T.bg } }}>
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="SignIn"  component={SignInScreen} />
      <AuthStack.Screen name="SignUp"  component={SignUpScreen} />
    </AuthStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: { backgroundColor:T.bg, borderTopColor:T.border,
                     height:64, paddingBottom:8, paddingTop:8 },
      tabBarActiveTintColor: T.accent,
      tabBarInactiveTintColor: T.muted,
      tabBarLabelStyle: { fontSize:10, fontWeight:'600' },
      tabBarIcon: ({ color, focused, size }) => {
        const [off, on] = ICONS[route.name] || ['ellipse-outline','ellipse'];
        return <Ionicons name={focused ? on : off} size={22} color={color} />;
      }
    })}>
      <Tab.Screen name="Feed"          component={FeedScreen} />
      <Tab.Screen name="Friends"       component={FriendsScreen} />
      <Tab.Screen name="Messages"      component={MessagesScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Groups"        component={GroupsScreen} />
      <Tab.Screen name="Market"        component={MarketplaceScreen} />
      <Tab.Screen name="Watch"         component={WatchScreen} />
      <Tab.Screen name="Profile"       component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function Navigator() {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <View style={{ flex:1, backgroundColor:T.bg, alignItems:'center', justifyContent:'center' }}>
        <ActivityIndicator color={T.accent} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      {user ? <MainTabs /> : <AuthFlow />}
    </NavigationContainer>
  );
}
