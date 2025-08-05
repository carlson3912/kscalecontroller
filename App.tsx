import React from 'react';
import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Orientation from 'react-native-orientation-locker';
import HomeScreen from './screens/HomeScreen'
import ControllerScreen from './screens/ControllerScreen';
import RobotsScreen from './screens/RobotsScreen';
import CalibrateScreen from './screens/CalibrateScreen';
import AddRobotScreen from './screens/AddRobotScreen';
import { View } from 'react-native';
import { ThemeProvider } from './components/ThemeContext';
import { useTheme } from './components/ThemeContext';
const Stack = createStackNavigator();

function App() {
  React.useEffect(() => {
    Orientation.lockToPortrait();
  }, []);

  return (
    <ThemeProvider>
      <AppContainer />
    </ThemeProvider>
  );
}

function AppContainer() {
  const { theme } = useTheme(); // from ThemeContext

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            transitionSpec: {
              open: { animation: 'timing', config: { duration: 0 } },
              close: { animation: 'timing', config: { duration: 0 } },
            },
            cardStyle: { backgroundColor: theme.background }, // this matters!
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Robots" component={RobotsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Controller" component={ControllerScreen} options={{ headerShown: false }} />
          {/* <Stack.Screen name="Controller" component={VideoScreen} options={{ headerShown: false }} /> */}
          <Stack.Screen name="Calibrate" component={CalibrateScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AddRobot" component={AddRobotScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}


export default App;