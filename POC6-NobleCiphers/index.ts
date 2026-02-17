// Polyfill crypto.getRandomValues BEFORE anything else
// This MUST come first so @noble/ciphers has access to Web Crypto API
import './crypto-polyfill';

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
