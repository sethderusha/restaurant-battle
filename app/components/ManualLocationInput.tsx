import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ManualLocationInputProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (latitude: number, longitude: number) => void;
  error?: string | null;
}

export function ManualLocationInput({ visible, onClose, onSubmit, error }: ManualLocationInputProps) {
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = () => {
    setValidationError(null);
    
    // Validate inputs
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      setValidationError('Please enter valid numbers for latitude and longitude');
      return;
    }
    
    if (lat < -90 || lat > 90) {
      setValidationError('Latitude must be between -90 and 90');
      return;
    }
    
    if (lng < -180 || lng > 180) {
      setValidationError('Longitude must be between -180 and 180');
      return;
    }
    
    setIsSubmitting(true);
    onSubmit(lat, lng);
    setIsSubmitting(false);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Enter Your Location</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.form}>
            <Text style={styles.instructionText}>
              Please enter your location coordinates to find restaurants near you.
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="Latitude (e.g., 40.7128)"
              value={latitude}
              onChangeText={setLatitude}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Longitude (e.g., -74.0060)"
              value={longitude}
              onChangeText={setLongitude}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
            
            {(validationError || error) && (
              <Text style={styles.errorText}>{validationError || error}</Text>
            )}
            
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={isSubmitting}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#333',
    borderRadius: 10,
    width: '80%',
    maxWidth: 500,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  form: {
    padding: 20,
  },
  instructionText: {
    color: '#fff',
    marginBottom: 15,
    fontSize: 14,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    color: '#fff',
  },
  errorText: {
    color: '#ff6b6b',
    marginBottom: 15,
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  submitButton: {
    backgroundColor: '#4a90e2',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
}); 