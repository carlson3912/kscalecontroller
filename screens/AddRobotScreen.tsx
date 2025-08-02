import React, { useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
} from 'react-native';
import { RobotStorage } from '../utils/storage';
import { useTheme } from '../components/ThemeContext';

interface AddRobotScreenProps {
  navigation: any;
}

function AddRobotScreen({ navigation }: AddRobotScreenProps) {
  const { theme } = useTheme();
  const [robotName, setRobotName] = useState('');
  const [ipAddress, setIpAddress] = useState('');

  const handleSave = () => {
    if (robotName && ipAddress) {
      try {
        const newRobot = RobotStorage.addRobot({
          name: robotName,
          ip: ipAddress,
        });
        
        console.log('Robot saved:', newRobot);
        navigation.goBack();
      } catch (error) {
        console.error('Error saving robot:', error);
        // You could show an alert here for duplicate names
      }
    }
  };

  const handleQRCode = () => {
    // TODO: Implement QR code scanning
    console.log('QR Code option selected');
  };

  const handleMicrophone = () => {
    // TODO: Implement microphone pairing
    console.log('Microphone option selected');
  };

  const handleManual = () => {
    // TODO: Implement manual pairing
    console.log('Manual option selected');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.background} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.secondary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backButton, { color: theme.highlight }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.primary }]}>Add New Robot</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Name Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Name</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: theme.card, borderColor: theme.secondary, color: theme.primary }]}
            value={robotName}
            onChangeText={setRobotName}
            placeholder="Enter robot name"
            placeholderTextColor={theme.secondary}
          />
        </View>

        {/* IP Address Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>IP Address</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: theme.card, borderColor: theme.secondary, color: theme.primary }]}
            value={ipAddress}
            onChangeText={setIpAddress}
            placeholder="Enter IP address (e.g., 192.168.1.100:8765)"
            placeholderTextColor={theme.secondary}
            keyboardType="numeric"
          />
        </View>

        {/* Passkey Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Passkey</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.secondary }]}>
            Choose how to authenticate with your robot
          </Text>
          
          {/* QR Code Option */}
          <TouchableOpacity 
            style={[styles.optionCard, { backgroundColor: theme.card, borderColor: theme.secondary }]} 
            onPress={handleQRCode}
          >
            <View style={styles.optionContent}>
              <Text style={styles.optionIcon}>📱</Text>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: theme.primary }]}>Use QR Code</Text>
                <Text style={[styles.optionDescription, { color: theme.secondary }]}>
                  Scan the QR code displayed on your robot
                </Text>
              </View>
              <Text style={[styles.optionArrow, { color: theme.highlight }]}>→</Text>
            </View>
          </TouchableOpacity>

          {/* Microphone Option */}
          <TouchableOpacity 
            style={[styles.optionCard, { backgroundColor: theme.card, borderColor: theme.secondary }]} 
            onPress={handleMicrophone}
          >
            <View style={styles.optionContent}>
              <Text style={styles.optionIcon}>🎤</Text>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: theme.primary }]}>Use Microphone</Text>
                <Text style={[styles.optionDescription, { color: theme.secondary }]}>
                  Listen for the pairing sound from your robot
                </Text>
              </View>
              <Text style={[styles.optionArrow, { color: theme.highlight }]}>→</Text>
            </View>
          </TouchableOpacity>

          {/* Manual Option */}
          <TouchableOpacity 
            style={[styles.optionCard, { backgroundColor: theme.card, borderColor: theme.secondary }]} 
            onPress={handleManual}
          >
            <View style={styles.optionContent}>
              <Text style={styles.optionIcon}>⌨️</Text>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: theme.primary }]}>Manual</Text>
                <Text style={[styles.optionDescription, { color: theme.secondary }]}>
                  Enter the passkey manually
                </Text>
              </View>
              <Text style={[styles.optionArrow, { color: theme.highlight }]}>→</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Save Button */}
      <View style={[styles.buttonContainer, { borderTopColor: theme.secondary }]}>
        <TouchableOpacity 
          style={[
            styles.saveButton, 
            { backgroundColor: (robotName && ipAddress) ? theme.highlight : theme.secondary }
          ]}
          onPress={handleSave}
          disabled={!robotName || !ipAddress}
        >
          <Text style={[styles.saveButtonText, { color: theme.primary }]}>Save Robot</Text>
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  optionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  optionArrow: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonContainer: {
    padding: 20,
    borderTopWidth: 1,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AddRobotScreen; 