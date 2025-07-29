import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, TextInput, Alert, Platform } from 'react-native';
import { Picker } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';

const { GameDetector } = NativeModules;

const GameList = ({ games, updateGFX, launchGame, addManualGame }) => {
  const tailwind = useTailwind();
  const [manualGameName, setManualGameName] = useState('');
  const [manualPackageName, setManualPackageName] = useState('');
  const [allApps, setAllApps] = useState([]);
  const [showAppPicker, setShowAppPicker] = useState(false);

  // Fetch all installed apps for manual selection
  useEffect(() => {
    GameDetector.getAllInstalledApps()
      .then(apps => setAllApps(apps))
      .catch(error => Alert.alert('Error', 'Failed to load installed apps: ' + error.message));
    // Inform user about Game Mode limitations
    if (Platform.OS === 'android' && Platform.Version < 33) {
      Alert.alert(
        'Game Mode Notice',
        'Game Mode is only available on Android 13+. For older devices, high performance mode (max brightness) will be used.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  const handleAddGame = () => {
    if (!manualGameName || !manualPackageName) {
      Alert.alert('Error', 'Please enter both game name and package name or select an app.');
      return;
    }
    addManualGame(manualGameName, manualPackageName);
    setManualGameName('');
    setManualPackageName('');
    setShowAppPicker(false);
    Alert.alert('Success', `${manualGameName} added to game list.`);
  };

  const handleAppSelection = (app) => {
    setManualGameName(app.name);
    setManualPackageName(app.packageName);
  };

  const renderGame = ({ item }) => (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      style={tailwind('bg-gray-700 p-4 rounded-lg mb-4')}
    >
      <View style={tailwind('flex-row justify-between items-center mb-2')}>
        <Text style={tailwind('font-semibold text-white')}>
          {item.name}
        </Text>
        <TouchableOpacity
          onPress={() => launchGame(item.packageName)}
          style={tailwind('bg-green-600 p-2 rounded')}
          accessible={true}
          accessibilityLabel={`Launch ${item.name}`}
        >
          <Text style={tailwind('text-white font-bold')}>
            Launch
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={tailwind('text-sm text-white')}>
        Resolution:
      </Text>
      <Picker
        selectedValue={item.resolution}
        onValueChange={value => updateGFX(item.packageName, value, item.fpsCap)}
        style={tailwind('bg-gray-600 text-white p-1 rounded mb-2')}
        accessibilityLabel={`Select resolution for ${item.name}`}
      >
        <Picker.Item label="1920x1080" value="1920x1080" />
        <Picker.Item label="1280x720" value="1280x720" />
        <Picker.Item label="1600x900" value="1600x900" />
      </Picker>
      <Text style={tailwind('text-sm text-white')}>
        FPS Cap:
      </Text>
      <Picker
        selectedValue={item.fpsCap}
        onValueChange={value => updateGFX(item.packageName, item.resolution, value)}
        style={tailwind('bg-gray-600 text-white p-1 rounded')}
        accessibilityLabel={`Select FPS cap for ${item.name}`}
      >
        <Picker.Item label="30 FPS" value="30" />
        <Picker.Item label="60 FPS" value="60" />
        <Picker.Item label="120 FPS" value="120" />
      </Picker>
    </Animated.View>
  );

  return (
    <View style={tailwind('bg-gray-800 p-6 rounded-lg')}>
      <Text style={tailwind('text-2xl font-semibold text-white mb-4')}>
        Your Games
      </Text>
      <Text style={tailwind('text-sm text-gray-400 mb-4')}>
        Note: Resolution and FPS settings are suggestions and may require in-game adjustments.
      </Text>
      <View style={tailwind('mb-4')}>
        <TouchableOpacity
          style={tailwind('bg-gray-600 p-2 rounded mb-2')}
          onPress={() => setShowAppPicker(!showAppPicker)}
          accessible={true}
          accessibilityLabel="Select an app"
        >
          <Text style={tailwind('text-white text-center')}>
            {manualGameName || 'Select an App'}
          </Text>
        </TouchableOpacity>
        {showAppPicker && (
          <FlatList
            data={allApps}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={tailwind('p-2 bg-gray-700 rounded mb-1')}
                onPress={() => handleAppSelection(item)}
              >
                <Text style={tailwind('text-white')}>{item.name}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={item => item.packageName}
            style={tailwind('max-h-40')}
          />
        )}
        <TextInput
          style={tailwind('bg-gray-600 text-white p-2 rounded mb-2')}
          placeholder="Game Name"
          placeholderTextColor="gray"
          value={manualGameName}
          onChangeText={setManualGameName}
          accessible={true}
          accessibilityLabel="Enter game name"
        />
        <TextInput
          style={tailwind('bg-gray-600 text-white p-2 rounded mb-2')}
          placeholder="Package Name (e.g., com.example.game)"
          placeholderTextColor="gray"
          value={manualPackageName}
          onChangeText={setManualPackageName}
          accessible={true}
          accessibilityLabel="Enter package name"
        />
        <TouchableOpacity
          style={tailwind('bg-blue-600 p-2 rounded')}
          onPress={handleAddGame}
          accessible={true}
          accessibilityLabel="Add game manually"
        >
          <Text style={tailwind('text-white text-center font-bold')}>
            Add Game Manually
          </Text>
        </TouchableOpacity>
      </View>
      {games.length === 0 ? (
        <ActivityIndicator color="white" />
      ) : (
        <FlatList
          data={games}
          renderItem={renderGame}
          keyExtractor={item => item.packageName}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

export default GameList;
