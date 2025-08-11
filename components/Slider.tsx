import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';

type Slider1DProps = {
    slider1D: number;
    setSlider1D: (slider1D: number) => void;
}

type HandlerProps = {
  handlerRef?: React.Ref<any>;
  simultaneousHandlers?: any;
};

export const Slider1D = ({slider1D, setSlider1D, ...rest}: Slider1DProps & HandlerProps) => {
  
    const sliderWidth = 200;
    const sliderHeight = 40;
    const knobSize = 30;
    const maxDistance = (sliderWidth - knobSize) / 2;
    const centerX = sliderWidth / 2;

   

    const updateSlider1D = (dx: number) => {
        // dx is already relative to initial touch
        // We need to convert it to slider coordinates
        
        const newX = dx;
        const distance = Math.abs(newX);
        
        if (distance <= maxDistance) {
          // Within range - use proportional values
          setSlider1D(newX/100);
        } else {
          // Outside range - clamp to edge
          const normalizedX = newX > 0 ? maxDistance : -maxDistance;
          setSlider1D(normalizedX/100);
        }
      };
      const onGestureEvent = useCallback((event: PanGestureHandlerGestureEvent) => {
        const { translationX } = event.nativeEvent as any;
        updateSlider1D(translationX);
      }, [updateSlider1D]);
  
      const onHandlerStateChange = useCallback((event: PanGestureHandlerGestureEvent) => {
        const { state } = event.nativeEvent as any;
        if (state === 5 || state === 3) {
          setSlider1D(0);
        }
      }, [setSlider1D]);
    return (
      <View style={[styles.slider1D, {width: sliderWidth, height: sliderHeight}]}> 
        <PanGestureHandler
          ref={(rest as any).handlerRef}
          simultaneousHandlers={(rest as any).simultaneousHandlers}
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
        >
          <View style={[styles.sliderTrack, {width: sliderWidth, height: sliderHeight}]}> 
            <View style={[styles.sliderKnob, {
              width: knobSize,
              height: knobSize,
              left: centerX + slider1D * 100 - knobSize / 2,
              top: (sliderHeight - knobSize) / 2,
            }]} />
          </View>
        </PanGestureHandler>
      </View>
    );
  };

  const styles = StyleSheet.create({
  slider1D: {
    alignItems: 'center',
  },
  sliderTrack: {
    position: 'relative',
    backgroundColor: '#f2dccba3',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#c74515',
    justifyContent: 'center',
  },
  sliderKnob: {
    position: 'absolute',
    backgroundColor: '#c74515',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#c74515',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#495057',
    marginTop: 8,
  }
})