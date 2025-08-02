import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Orientation from 'react-native-orientation-locker';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../components/ThemeContext';

interface Robot {
  id: string;
  name: string;
  status: 'online' | 'offline';
  ip: string;
}

interface CalibrateScreenProps {
  navigation: any;
  route: any;
}

function CalibrateScreen({ navigation, route }: CalibrateScreenProps) {
  const { theme } = useTheme();
  const [currentStep, setCurrentStep] = useState(1);
  const [isConnected, setIsConnected] = useState(false);
  const [calibrationData, setCalibrationData] = useState<{[key: string]: number}>({});
  const [isWaitingForSuccess, setIsWaitingForSuccess] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [tryingConnection, setTryingConnection] = useState(false);
  const isManualCloseRef = useRef(false);

  // Use ref to track current step for the message handler
  const currentStepRef = useRef(1);
  
  const robot: Robot = route.params?.robot || {
    id: '1',
    name: 'Default Robot',
    status: 'online',
    ip: '10.33.12.44:8765'
  };

  const socketRef = useRef<WebSocket | null>(null);

  // Update ref when state changes
  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  // Connect to robot on mount
  useFocusEffect(
    React.useCallback(() => {
      connectToRobot();
      return () => {
        if (socketRef.current) {
            isManualCloseRef.current = true;
            socketRef.current.close();
          }
      };
    }, [])
  );

  // Start zero_start when connected or step changes
  useEffect(() => {
    if (isConnected && !isWaitingForSuccess) {
      startCalibrationStep();
    }
  }, [isConnected, currentStep]);

  const connectToRobot = () => {
    try {
      setTryingConnection(true);
      const url = `ws://${robot.ip}`;
      console.log(`Connecting to: ${url}`);
      socketRef.current = new WebSocket(url);

      socketRef.current.onopen = () => {
        isManualCloseRef.current = false;
        console.log("Connected to robot");
        setIsConnected(true);
        setTryingConnection(false);
      };

      socketRef.current.onclose = () => {
        console.log("Disconnected from robot");
        setIsConnected(false);
        setTryingConnection(false);
        if(!isManualCloseRef.current) {
          setShowDisconnectModal(true); // Show modal on disconnect
        }
      };

      socketRef.current.onerror = (error) => {
        console.log("Robot connection error:", error);
        setIsConnected(false);
        setTryingConnection(false);
      };

      socketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleRobotMessage(data);
      };
    } catch (error) {
      console.log('Connection error:', error);
      setTryingConnection(false);
    }
  };

  const handleRobotMessage = useCallback((data: any) => {
    console.log('Received from robot:', data);
    
    if (data.type === 'zero_start') {
      // Update calibration data with received payload
      setCalibrationData(data.payload || {});
    } else if (data.type === 'zero_end' && data.success) {
      // Calibration step completed successfully
      setIsWaitingForSuccess(false);
      const currentStepValue = currentStepRef.current;
      if (currentStepValue < 10) {
        setCurrentStep(currentStepValue + 1);
      } else {
        // All steps completed
        navigation.goBack();
      }
    }
  }, [navigation]);

  const startCalibrationStep = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const stepToSend = currentStepRef.current;
      console.log(`Starting calibration for step ${stepToSend}`);
      socketRef.current.send(JSON.stringify({
        type: 'zero_start',
        pos_id: stepToSend - 1 // Convert to 0-based index
      }));
    }
  };

  const handleDone = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const stepToSend = currentStepRef.current;
      console.log(`Completing calibration for step ${stepToSend}`);
      setIsWaitingForSuccess(true);
      socketRef.current.send(JSON.stringify({
        type: 'zero_end'
      }));
    }
  };

  const handleRetry = () => {
    setShowDisconnectModal(false);
    connectToRobot(); // This will resume from currentStepRef.current
  };

  const handleGoHome = () => {
    isManualCloseRef.current = true;
    if (socketRef.current) {
      socketRef.current.close();
    }
    navigation.navigate('Home');
  };

  // Generate table rows from calibration data
  const tableRows = Object.entries(calibrationData).map(([key, value]) => ({
    joint: key,
    expectedValue: '0.0', // Hardcoded expected values
    actualValue: value.toFixed(2)
  }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.background} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.secondary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backButton, { color: theme.highlight }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.primary }]}>Step {currentStep}/10</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Connection Status */}
      <View style={styles.statusContainer}>
        {/* <Text style={[styles.statusText, { color: isConnected ? 'green' : 'red' }]}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </Text> */}
        {isWaitingForSuccess ? (
          <Text style={[styles.waitingText, { color: theme.warning }]}>Waiting for response from robot...</Text>
        ) : (
          <Text style={[styles.waitingText, { color: theme.primary }]}>Copy the pose in the image</Text>
        )}
      </View>

      {/* Robot Image */}
      <View style={styles.imageContainer}>
        <Image 
          source={require('../assets/images/robot.webp')}
          style={styles.robotImage}
          resizeMode="contain"
        />
      </View>

      {/* Calibration Table */}
      <View style={styles.tableContainer}>
        <View style={[styles.table, { backgroundColor: theme.card, borderColor: theme.secondary }]}>
          {/* Table Header */}
          <View style={[styles.tableRow, { borderBottomColor: theme.secondary }]}>
            <View style={[styles.tableHeaderCell, { backgroundColor: theme.secondary }]}>
              <Text style={[styles.tableHeaderText, { color: theme.primary }]}>Motor</Text>
            </View>
            <View style={[styles.tableHeaderCell, { backgroundColor: theme.secondary }]}>
              <Text style={[styles.tableHeaderText, { color: theme.primary }]}>Expected Value</Text>
            </View>
            <View style={[styles.tableHeaderCell, { backgroundColor: theme.secondary }]}>
              <Text style={[styles.tableHeaderText, { color: theme.primary }]}>Actual Value</Text>
            </View>
          </View>

          {/* Dynamic Table Rows */}
          {tableRows.map((row, index) => (
            <View key={index} style={[styles.tableRow, { borderBottomColor: theme.secondary }]}>
              <View style={[styles.tableCell, { borderRightColor: theme.secondary }]}>
                <Text style={[styles.tableCellText, { color: theme.secondary }]}>{row.joint}</Text>
              </View>
              <View style={[styles.tableCell, { borderRightColor: theme.secondary }]}>
                <Text style={[styles.tableCellText, { color: theme.secondary }]}>{row.expectedValue}</Text>
              </View>
              <View style={styles.tableCell}>
                <Text style={[styles.tableCellText, { color: theme.secondary }]}>{row.actualValue}</Text>
              </View>
            </View>
          ))}

          {/* Show message if no data */}
          {tableRows.length === 0 && (
            <View style={[styles.tableRow, { borderBottomColor: theme.secondary }]}>
              <View style={[styles.tableCell, { flex: 3 }]}>
                <Text style={[styles.tableCellText, { color: theme.secondary }]}>Waiting for robot data...</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Done Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[
            styles.doneButton, 
            { backgroundColor: isConnected ? theme.highlight : theme.secondary }
          ]} 
          onPress={handleDone}
          disabled={!isConnected || isWaitingForSuccess}
        >
          <Text style={[styles.doneButtonText, { color: theme.primary }]}>
            {isWaitingForSuccess ? 'Processing...' : 'Done'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showDisconnectModal}
        transparent={true}
        animationType="fade"
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.secondary }]}>
            <Text style={[styles.modalTitle, { color: theme.primary }]}>Connection Lost</Text>
            <Text style={[styles.modalMessage, { color: theme.secondary }]}>
              The connection to {robot.name} was lost. Would you like to retry or go back to home?
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: theme.highlight }]}
                onPress={handleRetry}
              >
                <Text style={[styles.retryButtonText, { color: theme.primary }]}>Retry</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: theme.secondary }]}
                onPress={handleGoHome}
              >
                <Text style={[styles.homeButtonText, { color: theme.primary }]}>Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {tryingConnection && (
        <View style={[styles.loadingOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]}>
          <View style={[styles.loadingContainer, { backgroundColor: theme.card, borderColor: theme.secondary }]}>
            <ActivityIndicator size="large" color={theme.highlight} />
            <Text style={[styles.loadingText, { color: theme.primary }]}>Connecting to robot...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 40,
  },
  statusContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  waitingText: {
    fontSize: 12,
    marginTop: 4,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  robotImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  tableContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  table: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tableHeaderCell: {
    flex: 1,
    padding: 16,
  },
  tableHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableCell: {
    flex: 1,
    padding: 16,
    borderRightWidth: 1,
  },
  tableCellText: {
    fontSize: 14,
    textAlign: 'center',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  doneButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  doneButtonText: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 15,
    padding: 30,
    margin: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 15,
    textAlign: 'center',
  },
});

export default CalibrateScreen; 