import React, { memo, useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, TextInput, Modal, Picker } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import { SecurityUtils } from '../utils/SecurityUtils';
import { GraphicsSettingsUtils } from '../utils/GraphicsSettingsUtils';

// Native modules
const { BoostMode, GameDetector } = NativeModules;

// Memoized component to prevent unnecessary re-renders
const GameList = memo(({ games, optimizeGame, graphicsSettings, isDarkMode }) => {
  const tailwind = useTailwind();
  const [filter, setFilter] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [allApps, setAllApps] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);

  // Filter games by name or genre
  const filteredGames = games.filter(
    (game) =>
      game.name.toLowerCase().includes(SecurityUtils.sanitizeInput(filter.toLowerCase())) ||
      (game.genre && game.genre.toLowerCase().includes(SecurityUtils.sanitizeInput(filter.toLowerCase())))
  );

  // Save game-specific BoostMode settings
  const saveGameSettings = useCallback(
    async (game, settings) => {
      try {
        const sanitizedSettings = {
          resolution: SecurityUtils.sanitizeInput(settings.resolution),
          texture: SecurityUtils.sanitizeInput(settings.texture),
          effects: SecurityUtils.sanitizeInput(settings.effects),
          fpsLimit: SecurityUtils.sanitizeInput(settings.fpsLimit),
        };
        await SecurityUtils.storeSecureData(`gameSettings_${game.packageName}`, sanitizedSettings);
      } catch (e) {
        Alert.alert('Error', `Failed to save settings for ${SecurityUtils.sanitizeInput(game.name)}: ${e.message}`);
      }
    },
    []
  );

  // Start game with BoostMode and optimized graphics settings
  const startGameWithBoostMode = useCallback(
    (game) => {
      const validatedSettings = GraphicsSettingsUtils.validateSettings(graphicsSettings);
      BoostMode.enableBoostMode(validatedSettings, (error) => {
        if (error) {
          GraphicsSettingsUtils.handlePermissionError(error, Linking, Alert);
          return;
        }
        optimizeGame(game);
        saveGameSettings(game, validatedSettings);
        Alert.alert('Success', `BoostMode enabled for ${SecurityUtils.sanitizeInput(game.name)} with custom graphics settings. Swipe from left to view FPS/ping.`);
      });
    },
    [graphicsSettings, optimizeGame, saveGameSettings]
  );

  // Load all installed apps for manual selection
  const loadAllApps = useCallback(() => {
    GameDetector.getAllInstalledApps((error, apps) => {
      if (error) {
        Alert.alert('Error', `Failed to load apps: ${error}`);
        return;
      }
      const sanitizedApps = apps.map(app => ({
        name: SecurityUtils.sanitizeInput(app.name),
        packageName: SecurityUtils.sanitizeInput(app.packageName),
        genre: SecurityUtils.sanitizeInput(app.genre || 'Unknown'),
      }));
      setAllApps(sanitizedApps);
      setIsModalVisible(true);
    });
  }, []);

  // Add selected app to game list
  const addAppToList = useCallback(async () => {
    if (!selectedApp) {
      Alert.alert('Error', 'Please select an app.');
      return;
    }
    const newGame = allApps.find(app => app.packageName === selectedApp);
    if (!newGame) {
      Alert.alert('Error', 'Invalid app selected.');
      return;
    }
    const updatedGames = [...games, newGame];
    try {
      await SecurityUtils.storeSecureData('cachedGames', updatedGames);
      optimizeGame(newGame); // Trigger optimization for the new app
      Alert.alert('Success', `${newGame.name} added to list.`);
      setIsModalVisible(false);
      setSelectedApp(null);
    } catch (e) {
      Alert.alert('Error', `Failed to add app: ${e.message}`);
    }
  }, [selectedApp, allApps, games, optimizeGame]);

  // Render individual game item
  const renderItem = useCallback(
    ({ item }) => (
      <TouchableOpacity
        style={tailwind(`bg-gray-800 p-4 mb-2 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`)}
        onPress={() => startGameWithBoostMode(item)}
      >
        <Text style={tailwind(`text-lg ${isDarkMode ? 'text-white' : 'text-black'}`)}>
          {SecurityUtils.sanitizeInput(item.name)} {item.genre ? `(${SecurityUtils.sanitizeInput(item.genre)})` : ''}
        </Text>
      </TouchableOpacity>
    ),
    [startGameWithBoostMode, isDarkMode]
  );

  return (
    <View style={tailwind('flex-1')}>
      <Text style={tailwind(`text-xl mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`)}>Installed Games</Text>
      <TextInput
        style={tailwind(`border p-2 mb-2 rounded-lg ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-black'}`)}
        placeholder="Filter by name or genre"
        placeholderTextColor={isDarkMode ? '#aaa' : '#666'}
        value={filter}
        onChangeText={(text) => setFilter(SecurityUtils.sanitizeInput(text))}
      />
      <TouchableOpacity
        style={tailwind(`bg-blue-500 p-2 mb-4 rounded-lg`)}
        onPress={loadAllApps}
      >
        <Text style={tailwind('text-white text-center font-bold')}>Add Application</Text>
      </TouchableOpacity>
      {filteredGames.length === 0 ? (
        <Text style={tailwind(`text-gray-400 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`)}>No games or apps found</Text>
      ) : (
        <FlatList
          data={filteredGames}
          renderItem={renderItem}
          keyExtractor={(item) => item.packageName}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
        />
      )}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={tailwind('flex-1 justify-center items-center bg-black bg-opacity-50')}>
          <View style={tailwind(`bg-gray-900 p-4 rounded-lg w-3/4 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`)}>
            <Text style={tailwind(`text-lg mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`)}>Select Application</Text>
            <Picker
              selectedValue={selectedApp}
              style={tailwind(`bg-gray-700 rounded mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`)}
              onValueChange={(value) => setSelectedApp(value)}
            >
              <Picker.Item label="Select an app" value={null} />
              {allApps.map((app) => (
                <Picker.Item
                  key={app.packageName}
                  label={app.name}
                  value={app.packageName}
                />
              ))}
            </Picker>
            <View style={tailwind('flex-row justify-between')}>
              <TouchableOpacity
                style={tailwind('bg-green-500 p-2 rounded-lg')}
                onPress={addAppToList}
              >
                <Text style={tailwind('text-white font-bold')}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={tailwind('bg-red-500 p-2 rounded-lg')}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={tailwind('text-white font-bold')}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
});

export default GameList;
