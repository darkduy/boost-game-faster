import React, { memo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import { GraphicsSettingsUtils } from '../utils/GraphicsSettingsUtils';

// Native modules
const { BoostMode } = NativeModules;

// Memoized component to prevent unnecessary re-renders
const GameList = memo(({ games, optimizeGame, graphicsSettings }) => {
  const tailwind = useTailwind();

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
        Alert.alert('Success', `BoostMode enabled for ${game.name} with custom graphics settings. Swipe from left to view FPS/ping.`);
      });
    },
    [graphicsSettings, optimizeGame]
  );

  // Render individual game item
  const renderItem = useCallback(
    ({ item }) => (
      <TouchableOpacity
        style={tailwind('bg-gray-800 p-4 mb-2 rounded-lg')}
        onPress={() => startGameWithBoostMode(item)}
      >
        <Text style={tailwind('text-white text-lg')}>{item.name}</Text>
      </TouchableOpacity>
    ),
    [startGameWithBoostMode]
  );

  return (
    <View style={tailwind('flex-1')}>
      <Text style={tailwind('text-white text-xl mb-4')}>Installed Games</Text>
      {games.length === 0 ? (
        <Text style={tailwind('text-gray-400')}>No games detected</Text>
      ) : (
        <FlatList
          data={games}
          renderItem={renderItem}
          keyExtractor={(item) => item.packageName}
          initialNumToRender={10} // Optimize initial render
          maxToRenderPerBatch={10} // Optimize scrolling
        />
      )}
    </View>
  );
});

export default GameList;
