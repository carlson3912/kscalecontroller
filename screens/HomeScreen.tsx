import React from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { useTheme } from '../components/ThemeContext';
interface HomeScreenProps {
  navigation: any;
}

function HomeScreen({ navigation }: HomeScreenProps) {
  const { theme } = useTheme();
  console.log(theme)
  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.background}] }>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, {color: theme.primary}]}>KScale</Text>
          <Text style={[styles.subtitle, {color: theme.secondary}]}>Calibrate, Update and Control your robots</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.primaryButton, {backgroundColor: theme.highlight}]}
            onPress={() => navigation.navigate('Robots')}>
            <Text style={[styles.primaryButtonText, {color: theme.primary}]}>My Robots</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero image at the very bottom */}
      <View style={styles.imageContainer}>
        <Image 
          source={require('../assets/images/hero2.png')}
          style={styles.heroImage}
          resizeMode="cover"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 60,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  primaryButton: {
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 12,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
    width: '100%',
  },
  primaryButtonText: {
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'center',
  },
  imageContainer: {
    width: '100%',
    height:"40%",
    marginBottom: 0,
  },
  heroImage: {
    width: '100%',
    height: "100%",
  },
});

export default HomeScreen; 