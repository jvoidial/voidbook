import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import FeedScreen from './screens/FeedScreen';
import FriendsScreen from './screens/FriendsScreen';
import MessagesScreen from './screens/MessagesScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import GroupsScreen from './screens/GroupsScreen';
import MarketplaceScreen from './screens/MarketplaceScreen';
import WatchScreen from './screens/WatchScreen';
import ProfileScreen from './screens/ProfileScreen';
import { theme as T } from './theme';

const Tab = createBottomTabNavigator();
const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background:T.bg, card:T.bg,
            border:T.border, text:T.text, primary:T.accent }
};
const icons = { Feed:'⌂', Friends:'👥', Messages:'✉️', Notifications:'🔔',
                Groups:'📚', Market:'🛒', Watch:'▶', Profile:'👤' };

export default function Navigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor:T.bg, borderTopColor:T.border,
                       height:64, paddingBottom:8, paddingTop:8 },
        tabBarActiveTintColor: T.accent,
        tabBarInactiveTintColor: T.muted,
        tabBarLabelStyle: { fontSize:10 },
        tabBarIcon: ({ color }) => <Text style={{ color, fontSize:18 }}>{icons[route.name]}</Text>
      })}>
        <Tab.Screen name="Feed" component={FeedScreen} />
        <Tab.Screen name="Friends" component={FriendsScreen} />
        <Tab.Screen name="Messages" component={MessagesScreen} />
        <Tab.Screen name="Notifications" component={NotificationsScreen} />
        <Tab.Screen name="Groups" component={GroupsScreen} />
        <Tab.Screen name="Market" component={MarketplaceScreen} />
        <Tab.Screen name="Watch" component={WatchScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
