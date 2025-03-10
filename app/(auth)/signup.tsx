import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function Signup() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const router = useRouter();
  const { signup } = useAuth();

  const handleSignup = () => {
    if (username.trim() && displayName.trim()) {
      signup(username.trim(), displayName.trim());
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Display Name"
          value={displayName}
          onChangeText={setDisplayName}
        />
        <TouchableOpacity 
          style={styles.button}
          onPress={handleSignup}
        >
          <Text style={styles.buttonText}>Sign Up</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => router.push('/login')}
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>Already have an account? Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
    color: '#284B63',
  },
  form: {
    width: '100%',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#3C6E71',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#3C6E71',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  linkText: {
    color: '#284B63',
    fontSize: 16,
  },
}); 