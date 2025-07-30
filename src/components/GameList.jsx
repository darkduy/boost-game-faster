import React, { memo, useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import { SecurityUtils } from '../utils/SecurityUtils';
import { GraphicsSettingsUtils } from '../utils/GraphicsSettingsUtils';

// Native modules
const { BoostMode } = NativeModules;

// Memoized component to prevent unnecessary re-renders
const GameList = memo(({ games, optimizeGame, graphicsSettings, isDarkMode }) => {
  const tailwind = useTailwind();
  const [filter, setFilter] = useState('');

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
        style={tailwind(`border p-2 mb-4 rounded-lg ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-black'}`)}
        placeholder="Filter by name or genre"
        placeholderTextColor={isDarkMode ? '#aaa' : '#666'}
        value={filter}
        onChangeText={(text) => setFilter(SecurityUtils.sanitizeInput(text))}
      />
      {filteredGames.length === 0 ? (
        <Text style={tailwind(`text-gray-400 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`)}>No games found</Text>
      ) : (
        <FlatList
          data={filteredGames}
          renderItem={renderItem}
          keyExtractor={(item) => item.packageName}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
        />
      )}
    </View>
  );
});

export default GameList;
