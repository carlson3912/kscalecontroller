import React, {useState, useRef, useEffect} from 'react';
import { View, Text, PanResponder, StyleSheet } from 'react-native';

type Joystick2DProps = {
    joystick2D: {x: number, y: number};
    setJoystick2D: (joystick2D: {x: number, y: number}) => void;
}

export const Joystick2D = ({joystick2D, setJoystick2D}: Joystick2DProps) => {
    const [coordinates, setCoordinates] = useState({x: 0, y: 0});
    const joystickSize = 120;
    const knobSize = 40;
    const maxDistance = (joystickSize) / 2;
    const centerX = joystickSize / 2;
    const centerY = joystickSize / 2;

    const panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        const {dx, dy} = gestureState;
        updateJoystick2D(dx, dy);
      },
      onPanResponderRelease: (evt, gestureState) => {
        setJoystick2D({x: 0, y: 0});
        setCoordinates({x: 0, y: 0});
      },
      onPanResponderTerminate: () => {
        setJoystick2D({x: 0, y: 0});
        setCoordinates({x: 0, y: 0});
      },
    });

    const updateJoystick2D = (dx: number, dy: number) => {
      const pxX = coordinates.x + dx;
      const pxY = coordinates.y - dy;
  
      const distance = Math.sqrt(pxX * pxX + pxY * pxY);
  
      let clampedX = pxX;
      let clampedY = pxY;
  
      if (distance > maxDistance) {
          const angle = Math.atan2(pxY, pxX);
          clampedX = Math.cos(angle) * maxDistance;
          clampedY = Math.sin(angle) * maxDistance;
      }
      setCoordinates({x: pxX, y: pxY});
      // Store normalized values in range [-1, 1]
      setJoystick2D({
          x: clampedX / 60,
          y: clampedY / 60,
      });
  };
  

    return (
      <View style={[styles.joystick2D, {width: joystickSize, height: joystickSize}]}>
        <View style={[styles.joystickBase, {width: joystickSize, height: joystickSize}]} {...panResponder.panHandlers}>
          <View style={[styles.joystickKnob, {
            width: knobSize,
            height: knobSize,
            left: centerX + (joystick2D.x * 60) - knobSize / 2,
            top: centerY - (joystick2D.y * 60) - knobSize / 2,
          }]} />
        </View>
      </View>
    );
  };

const styles = StyleSheet.create({
  joystick2D: {
    alignItems: 'center',
  },
  joystick1D: {
    alignItems: 'center',
  },
  joystickBase: {
    position: 'relative',
    backgroundColor: '#f2dccba3',
    borderRadius: 1000,
    borderWidth: 3,
    borderColor: '#c74515',
    justifyContent: 'center',
    alignItems: 'center',
  },
  joystickKnob: {
    position: 'absolute',
    backgroundColor: '#c74515',
    borderRadius: 1000,
    borderWidth: 2,
    borderColor: '#c74515',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  joystickLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#495057',
    marginTop: 8,
  }
})