import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

type LoadingOverlayProps = {
  message?: string;
};

export function LoadingOverlay({ message = 'Loading...' }: LoadingOverlayProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#3C6E71" />
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(210, 174, 237, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  content: {
    backgroundColor: '#d2aeed',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  message: {
    marginTop: 10,
    color: '#284B63',
    fontSize: 16,
    textAlign: 'center',
  },
}); 