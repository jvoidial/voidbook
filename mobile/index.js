// MUST be first — WebRTC globals for LiveKit
import { registerGlobals } from '@livekit/react-native';
registerGlobals();

import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
