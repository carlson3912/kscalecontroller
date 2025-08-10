import React, {useRef, useCallback} from 'react';
import { View, StyleSheet } from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';

type Joystick2DProps = {
    // coordinates of joystick on the screen
    joystick2D: {x: number, y: number};
    setJoystick2D: (joystick2D: {x: number, y: number}) => void;
}

type HandlerProps = {
  handlerRef?: React.Ref<any>;
  simultaneousHandlers?: any;
};

export const Joystick2D = ({joystick2D, setJoystick2D, ...rest}: Joystick2DProps & HandlerProps) => {   
    const joystickSize = 120;
    const knobSize = 40;
    const maxDistance = (joystickSize) / 2;
    const centerX = joystickSize / 2;
    const centerY = joystickSize / 2;

    const updateJoystick2D = useCallback((dx: number, dy: number) => {
      const pxX = dx;
      const pxY = -dy;
  
      const distance = Math.sqrt(pxX * pxX + pxY * pxY);
  
      let clampedX = pxX;
      let clampedY = pxY;
  
      if (distance > maxDistance) {
          const angle = Math.atan2(pxY, pxX);
          clampedX = Math.cos(angle) * maxDistance;
          clampedY = Math.sin(angle) * maxDistance;
      }
      // Store normalized values in range [-1, 1]
      setJoystick2D({
          x: clampedX / 60,
          y: clampedY / 60,
      });
  }, [setJoystick2D]);

    const onGestureEvent = useCallback((event: PanGestureHandlerGestureEvent) => {
      const { translationX, translationY, state } = event.nativeEvent as any;
      updateJoystick2D(translationX, translationY);
    }, [updateJoystick2D]);

    const onHandlerStateChange = useCallback((event: PanGestureHandlerGestureEvent) => {
      const { state } = event.nativeEvent as any;
      // When gesture ends or is cancelled, reset
      // 5 = END, 3 = CANCEL in old handler enums; handler lib exports State, but keep lean
      if (state === 5 || state === 3) {
        setJoystick2D({ x: 0, y: 0 });
      }
    }, [setJoystick2D]);

    return (
      <View style={[styles.joystick2D, {width: joystickSize, height: joystickSize}]}> 
        <PanGestureHandler
          ref={(rest as any).handlerRef}
          simultaneousHandlers={(rest as any).simultaneousHandlers}
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
        >
          <View style={[styles.joystickBase, {width: joystickSize, height: joystickSize}]}> 
            <View style={[styles.joystickKnob, {
              width: knobSize,
              height: knobSize,
              left: centerX + (joystick2D.x * 60) - knobSize / 2,
              top: centerY - (joystick2D.y * 60) - knobSize / 2,
            }]} />
          </View>
        </PanGestureHandler>
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