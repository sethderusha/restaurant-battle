import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

type BattleHistoryItem = {
  winner: string;
  loser: string;
  timestamp: number;
};

export default function Profile() {
  const router = useRouter();
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logout();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.displayName}>{user.displayName}</Text>
        <Text style={styles.username}>@{user.username}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.preferencesList}>
          <Text style={styles.preferenceItem}>
            Price Range: {'$'.repeat(user.preferences.priceRange[0])} - {'$'.repeat(user.preferences.priceRange[1])}
          </Text>
          <Text style={styles.preferenceItem}>
            Search Radius: {user.preferences.radius}m
          </Text>
          <Text style={styles.preferenceItem}>
            Favorite Cuisines:
          </Text>
          {user.preferences.cuisinePreferences.map((cuisine: string, index: number) => (
            <Text key={index} style={styles.cuisineTag}>
              {cuisine}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Battle History</Text>
        {user.battleHistory.map((battle: BattleHistoryItem, index: number) => (
          <View key={index} style={styles.battleItem}>
            <Text style={styles.battleWinner}>{battle.winner} 🏆</Text>
            <Text style={styles.battleLoser}>vs {battle.loser}</Text>
            <Text style={styles.battleDate}>
              {new Date(battle.timestamp).toLocaleDateString()}
            </Text>
          </View>
        ))}
      </View>

      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#d2aeed',
  },
  header: {
    padding: 20,
    backgroundColor: '#284B63',
    alignItems: 'center',
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  username: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#284B63',
    marginBottom: 15,
  },
  preferencesList: {
    marginLeft: 10,
  },
  preferenceItem: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333333',
  },
  cuisineTag: {
    fontSize: 14,
    color: '#3C6E71',
    backgroundColor: '#E0E0E0',
    padding: 5,
    borderRadius: 5,
    marginRight: 10,
    marginBottom: 5,
    alignSelf: 'flex-start',
  },
  battleItem: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  battleWinner: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3C6E71',
  },
  battleLoser: {
    fontSize: 14,
    color: '#666666',
    marginTop: 5,
  },
  battleDate: {
    fontSize: 12,
    color: '#999999',
    marginTop: 5,
  },
  logoutButton: {
    margin: 20,
    backgroundColor: '#D32F2F',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 