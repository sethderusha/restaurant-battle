import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = () => {
    if (username.trim()) {
      login(username.trim());
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Restaurant Battle</Text>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <TouchableOpacity 
          style={styles.button}
          onPress={handleLogin}
        >
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => router.push('/signup')}
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>Don't have an account? Sign up</Text>
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