import React, {useState, useRef, useEffect, useCallback} from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import {Joystick2D} from '../components/Joystick';
import {Slider1D} from '../components/Slider';
import { useFocusEffect } from '@react-navigation/native';
import Orientation from 'react-native-orientation-locker';
import { useTheme } from '../components/ThemeContext';


interface Robot {
  id: string;
  name: string;
  status: 'online' | 'offline';
  ip: string;
}

interface ControllerScreenProps {
  navigation: any;
  route: any;
}

function ControllerScreen({ navigation, route }: ControllerScreenProps) {
  const { theme } = useTheme();
  const [isConnected, setIsConnected] = useState(false);
  const [slider1D, setSlider1D] = useState(0);
  const [joystick2D, setJoystick2D] = useState({x: 0, y: 0});
  const [showSettings, setShowSettings] = useState(false);
  const [scale, setScale] = useState('1.0');
  const socketRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const joystick2DRef = useRef({x: 0, y: 0});
  const slider1DRef = useRef(0);
  const scaleRef = useRef('1.0');

  // Get robot from navigation params
  const robot: Robot = route.params?.robot || {
    id: '1',
    name: 'Default Robot',
    status: 'online',
    ip: '10.33.12.44:8765'
  };

  useFocusEffect(
    useCallback(() => {
      // Screen just focused
      Orientation.unlockAllOrientations();
      connect();
      return () => {
        // Cleanup logic when screen is unfocused (navigated away, blurred, etc.)
        Orientation.lockToPortrait();
        disconnect(); // ← your custom cleanup
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }, [])
  );

  useEffect(() => {
    joystick2DRef.current = joystick2D;
    sendVector();
  }, [joystick2D]);

  useEffect(() => {
    slider1DRef.current = slider1D;
    sendVector();
  }, [slider1D]);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);



  const connect = () => {
    try {
      // Use robot's IP to construct WebSocket URL
      const url = `ws://${robot.ip}`;
      console.log(`Connecting to: ${url}`);
      socketRef.current = new WebSocket(url);

      socketRef.current.onopen = () => {
        console.log("onopen")
        setIsConnected(true);
      };

      socketRef.current.onclose = () => {
        console.log("onclose")
        setIsConnected(false);
      };

      socketRef.current.onerror = error => {
        console.log("onerror", error)
      };
    } catch (error) {
      Alert.alert('Connection Error', 'Failed to connect: ' + error);
    }
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  };

  const sendVector = () => {
    // Use ref values instead of state values
    const currentJoystick = joystick2DRef.current;
    const currentSlider = slider1DRef.current;
    const currentScale = parseFloat(scaleRef.current);
    
    // Check if all inputs are at zero
    const isAllZero = currentJoystick.x === 0 && currentJoystick.y === 0 && currentSlider === 0;
    
    // Always send data - either non-zero values or zero values
    const vectorData = {
      type: "vector",
      vector: {
        x: currentJoystick.x * currentScale,
        y: currentJoystick.y * currentScale,
        z: currentSlider * currentScale
      }
    };
    
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(vectorData));
    }
    
    // If all inputs are zero, set a timeout for the next send
    if(isAllZero && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      setTimeout(() => {
        sendVector();
      }, 500);
    }
  };

  const openSettings = () => {
    setShowSettings(true);
  };

  const closeSettings = () => {
    setShowSettings(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" /> */}
      
      {/* Top Controls - Settings and Back at the very top */}
      <View style={styles.topControls}>
        <TouchableOpacity onPress={() => {navigation.goBack(); disconnect()}}>
          <Text style={[styles.backButton, { color: theme.highlight }]}>←</Text>
        </TouchableOpacity>
        <View style={styles.topRight}>
          <Text style={[styles.statusText, { color: isConnected ? "green" : theme.warning }]}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
          <View style={[styles.statusIndicator, { backgroundColor: isConnected ? "green" : theme.warning }]} />
          <TouchableOpacity style={styles.settingsButton} onPress={openSettings}>
            <Text style={styles.settingsButtonText}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Joysticks */}
      <View style={styles.bottomJoysticks}>
        <Joystick2D joystick2D={joystick2D} setJoystick2D={setJoystick2D} />
        <View style={styles.rightControls}>
          <TouchableOpacity style={[styles.stopButton, { backgroundColor: theme.warning }]}>
            <Text style={[styles.stopButtonText, { color: theme.primary }]}>STOP</Text>
          </TouchableOpacity>
          <Slider1D slider1D={slider1D} setSlider1D={setSlider1D} />
        </View>
      </View>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        transparent={true}
        animationType="fade"
        onRequestClose={closeSettings}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.primary }]}>Settings</Text>
              <TouchableOpacity onPress={closeSettings}>
                <Text style={[styles.closeButton, { color: theme.secondary }]}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.settingItem}>
              <Text style={[styles.settingLabel, { color: theme.primary }]}>Scale:</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.background, borderColor: theme.secondary, color: theme.primary }]}
                value={scale}
                onChangeText={setScale}
                keyboardType="numeric"
                placeholder="1.0"
                placeholderTextColor={theme.secondary}
              />
            </View>

            <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.highlight }]} onPress={closeSettings}>
              <Text style={[styles.saveButtonText, { color: theme.primary }]}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backButton: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 8,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 12,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  settingsButton: {
    padding: 8,
  },
  settingsButtonText: {
    fontSize: 20,
  },

  robotName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  robotIp: {
    fontSize: 14,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  connectButton: {
    // backgroundColor will be set inline
  },
  buttonText: {
    fontWeight: 'bold',
  },
  bottomJoysticks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    flex: 1,
    alignItems: 'flex-end',
  },
  rightControls: {
    alignItems: 'flex-end',
  },
  stopButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  stopButtonText: {
    fontWeight: 'bold',
    fontSize: 18,
    textTransform: 'uppercase',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 20,
    padding: 4,
  },
  settingItem: {
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
  },
  saveButton: {
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ControllerScreen; 