import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MOCK_MATCHES = [
  { id: '1', name: 'Sarah', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400' },
  { id: '2', name: 'Jessica', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400' },
  { id: '3', name: 'Emily', image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400' },
];

const MOCK_CHATS = [
  { 
    id: '1', 
    user: { name: 'Michael', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400' },
    lastMessage: 'Hey! How are you?',
    time: '10:00 AM',
    unread: 2,
  },
  { 
    id: '2', 
    user: { name: 'David', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400' },
    lastMessage: 'Are we still on for tonight?',
    time: 'Yesterday',
    unread: 0,
  },
];

const MessagesScreen = ({ navigation }) => {
  const handleChatPress = (user) => {
    navigation.navigate('Chat', { user });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity>
          <Ionicons name="search" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>New Matches</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.matchesList}>
            {MOCK_MATCHES.map((match) => (
              <TouchableOpacity key={match.id} style={styles.matchItem} onPress={() => handleChatPress(match)}>
                <Image source={{ uri: match.image }} style={styles.matchImage} />
                <Text style={styles.matchName}>{match.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conversations</Text>
          {MOCK_CHATS.map((chat) => (
            <TouchableOpacity key={chat.id} style={styles.chatItem} onPress={() => handleChatPress(chat.user)}>
              <Image source={{ uri: chat.user.image }} style={styles.chatAvatar} />
              <View style={styles.chatContent}>
                <View style={styles.chatHeader}>
                  <Text style={styles.chatName}>{chat.user.name}</Text>
                  <Text style={styles.chatTime}>{chat.time}</Text>
                </View>
                <Text style={styles.chatMessage} numberOfLines={1}>{chat.lastMessage}</Text>
              </View>
              {chat.unread > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{chat.unread}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000000',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginLeft: 24,
    marginBottom: 16,
  },
  matchesList: {
    paddingLeft: 24,
  },
  matchItem: {
    marginRight: 20,
    alignItems: 'center',
  },
  matchImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#000000',
  },
  matchName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F9F9F9',
  },
  chatAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  chatTime: {
    fontSize: 12,
    color: '#999999',
  },
  chatMessage: {
    fontSize: 14,
    color: '#666666',
  },
  unreadBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default MessagesScreen;
