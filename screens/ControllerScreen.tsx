import React, {useState, useRef, useEffect, useCallback} from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Modal,
  Switch,
} from 'react-native';
import {Joystick2D} from '../components/Joystick';
import {Slider1D} from '../components/Slider';
import { useFocusEffect } from '@react-navigation/native';
import Orientation from 'react-native-orientation-locker';
import { useTheme } from '../components/ThemeContext';
import VideoScreen from '../components/Video';
import { RTCView } from 'react-native-webrtc';

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
  const [stream, setStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [scale, setScale] = useState('1.0');
  const [vector, setVector] = useState({x: 0, y: 0, z: 0});
  const [showLocalStream, setShowLocalStream] = useState(false); // NEW: Toggle for local stream
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
      return () => {
        // Cleanup logic when screen is unfocused (navigated away, blurred, etc.)
        Orientation.lockToPortrait();
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

  const sendVector = () => {
    // Use ref values instead of state values
    const currentJoystick = joystick2DRef.current;
    const currentSlider = slider1DRef.current;
    const currentScale = parseFloat(scaleRef.current);
    
    const vectorData = {
        x: currentJoystick.x * currentScale,
        y: currentJoystick.y * currentScale,
        z: currentSlider * currentScale
    };
    setVector(vectorData);
  };

  const openSettings = () => {
    setShowSettings(true);
  };

  const closeSettings = () => {
    setShowSettings(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Video Background - Positioned absolutely to cover entire screen */}
      {stream && (
        <View style={styles.videoContainer}>
          <RTCView 
            streamURL={stream.toURL()} 
            style={styles.videoBackground}
            objectFit="cover"
          />
        </View>
      )}
      
      {/* VideoScreen component - handles WebRTC setup */}
      <VideoScreen setStream={setStream} vector={vector} setIsConnected={setIsConnected} setLocalStream={setLocalStream} showLocalStream={showLocalStream} />
      
      {/* Top Controls - Settings and Back at the very top */}
      <View style={styles.topControls}>
        <TouchableOpacity onPress={() => {navigation.goBack()}}>
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

      {/* NEW: Local Stream Preview - Above Stop Button */}
      {showLocalStream && localStream && (
        <View style={styles.localStreamContainer}>
          <RTCView 
            streamURL={localStream.toURL()} 
            style={styles.localStream}
            objectFit="cover"
          />
          <View style={styles.localStreamBorder} />
        </View>
      )}

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

            {/* NEW: Local Stream Toggle */}
            <View style={styles.settingItem}>
              <View style={styles.toggleContainer}>
                <Text style={[styles.settingLabel, { color: theme.primary, marginBottom: 0 }]}>Stream Front Camera</Text>
                <Switch
                  value={showLocalStream}
                  onValueChange={setShowLocalStream}
                  trackColor={{ false: theme.secondary, true: theme.highlight }}
                  thumbColor={showLocalStream ? theme.primary : theme.background}
                />
              </View>
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
    position: 'relative', // Add this for absolute positioning context
  },
  videoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1, // Video behind controls
  },
  videoBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  // NEW: Local Stream Styles
  localStreamContainer: {
    position: 'absolute',
    bottom: 200, // Position above the stop button
    right: 20, // Same right padding as bottomJoysticks
    zIndex: 3, // Above video and controls
  },
  localStream: {
    width: 120,
    height: 90,
    borderRadius: 8,
  },
  localStreamBorder: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 2, // Controls above video
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
    padding: 20, // This is the padding we're matching
    flex: 1,
    alignItems: 'flex-end',
    zIndex: 2, // Controls above video
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
  // NEW: Toggle Container Style
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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