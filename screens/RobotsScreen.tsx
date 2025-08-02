import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { RobotStorage } from '../utils/storage';
import { Robot } from '../utils/storage';
import { useTheme } from '../components/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';

interface RobotsScreenProps {
  navigation: any;
}

function RobotsScreen({ navigation }: RobotsScreenProps) {
  const { theme } = useTheme();
  const [robots, setRobots] = useState<Robot[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRobot, setEditingRobot] = useState<Robot | null>(null);
  const [editName, setEditName] = useState('');

  const loadRobots = () => {
    setRobots(RobotStorage.getRobots());
  };
  useFocusEffect(
    useCallback(() => {
      loadRobots();
    }, [])
  );

  const handleManualControl = (robot: any) => {
    navigation.navigate('Controller', { robot });
  };

  const handleAddNewRobot = () => {
    navigation.navigate('AddRobot');
  };

  const handleEditRobot = (robot: Robot) => {
    setEditingRobot(robot);
    setEditName(robot.name);
    setEditModalVisible(true);
  };

  const handleSaveEdit = () => {
    if (!editingRobot || !editName.trim()) {
      Alert.alert('Error', 'Please enter a valid name');
      return;
    }

    try {
      // Check if the new name already exists (excluding the current robot)
      const existingRobot = robots.find(r => r.name === editName.trim() && r.name !== editingRobot.name);
      if (existingRobot) {
        Alert.alert('Error', `Robot with name "${editName.trim()}" already exists`);
        return;
      }

      RobotStorage.updateRobot(editingRobot.name, { name: editName.trim() });
      loadRobots();
      setEditModalVisible(false);
      setEditingRobot(null);
      setEditName('');
    } catch (error) {
      Alert.alert('Error', 'Failed to update robot');
    }
  };

  const handleDeleteRobot = () => {
    if (!editingRobot) return;

    Alert.alert(
      'Delete Robot',
      `Are you sure you want to delete "${editingRobot.name}"? You will need to create a new passkey to reconnect.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            try {
              RobotStorage.deleteRobot(editingRobot.name);
              loadRobots();
              setEditModalVisible(false);
              setEditingRobot(null);
              setEditName('');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete robot');
            }
          },
        },
      ]
    );
  };

  const handleCancelEdit = () => {
    setEditModalVisible(false);
    setEditingRobot(null);
    setEditName('');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.background} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.secondary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backButton, { color: theme.highlight }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.primary }]}>Your Robots</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Robots List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {robots.map((robot) => (
          <View key={robot.name} style={[styles.robotCard, { backgroundColor: theme.card, borderColor: theme.secondary }]}>
            {/* Edit Button */}
            <TouchableOpacity 
              style={[styles.editButton, { backgroundColor: theme.highlight }]}
              onPress={() => handleEditRobot(robot)}
            >
              <Text style={[styles.editButtonText, { color: theme.primary }]}>Edit</Text>
            </TouchableOpacity>
            <View style={styles.robotInfo}>
              <Text style={[styles.robotName, { color: theme.primary }]}>{robot.name}</Text>
              <Text style={[styles.robotIp, { color: theme.secondary }]}>{robot.ip}</Text>
            </View>
            <View style={styles.robotButtons}>
              <TouchableOpacity 
                style={styles.robotButton}
                onPress={() => navigation.navigate('Calibrate', { robot })}
              >
                <Text style={[styles.robotButtonText, { color: theme.highlight }]}>Calibrate →</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.robotButton} 
                onPress={() => handleManualControl(robot)}
              >
                <Text style={[styles.robotButtonText, { color: theme.highlight }]}>Manual Control →</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Add New Robot Card */}
        <TouchableOpacity 
          style={[styles.addRobotCard, { backgroundColor: theme.card, borderColor: theme.highlight }]} 
          onPress={handleAddNewRobot}
        >
          <Text style={[styles.addRobotText, { color: theme.highlight }]}>Add New Robot</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelEdit}
      >
        <View style={[styles.modalOverlay, {backgroundColor: theme.background}]}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.secondary }]}>
            <Text style={[styles.modalTitle, { color: theme.primary }]}>Edit Robot</Text>
            
            <Text style={[styles.modalLabel, { color: theme.primary }]}>Robot Name:</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.secondary, color: theme.primary, borderColor: theme.secondary }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter robot name"
              placeholderTextColor={theme.secondary}
              autoFocus={true}
            />

            <View style={styles.modalButtons}>
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity 
                  style={[styles.cancelButton, { borderColor: theme.secondary }]}
                  onPress={handleCancelEdit}
                >
                  <Text style={[styles.cancelButtonText, { color: theme.primary }]}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, { backgroundColor: theme.secondary }]}
                  onPress={handleSaveEdit}
                >
                  <Text style={[styles.saveButtonText, { color: theme.primary }]}>Save</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.deleteButtonFullWidth, { backgroundColor: theme.warning }]}
                onPress={handleDeleteRobot}
              >
                <Text style={[styles.deleteButtonText, { color: theme.primary }]}>Remove Robot</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  content: {
    margin: 16
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
    width: 40, // Same width as back button for centering
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  robotCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    position: 'relative',
  },
  editButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    zIndex: 1,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  robotInfo: {
    marginBottom: 8,
    marginTop: 8,
  },
  robotName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  robotIp: {
    fontSize: 14,
    marginBottom: 4,
  },
  robotButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 5,
  },
  robotButton: {
    flex: 1,
    alignItems: 'center',
  },
  robotButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  addRobotCard: {
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  addRobotText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 12,
    padding: 24,
    margin: 20,
    borderWidth: 1,
    minWidth: 300,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  modalInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  modalButtons: {
    flexDirection: 'column',
    gap: 8,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'solid'
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonFullWidth: {
    flex: 0,
    width: '100%',
  },
  deleteButtonText: {
    fontWeight: 'bold',
  },
  cancelButtonText: {
    fontWeight: 'bold',
  },
  saveButtonText: {
    fontWeight: 'bold',
  },
});

export default RobotsScreen; 