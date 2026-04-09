import 'react-native-gesture-handler';
import {AppRegistry} from 'react-native';

import App from './src/app/App';
import {
  appDiagnostics,
  installGlobalErrorHandlers,
} from './src/services/logging/AppDiagnostics';
import {name as appName} from './app.json';

installGlobalErrorHandlers();
void appDiagnostics.recordBreadcrumb('Bootstrap', 'Index initialized', {
  appName,
});

AppRegistry.registerComponent(appName, () => App);
