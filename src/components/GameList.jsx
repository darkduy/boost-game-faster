import React from 'react';
import { View, Text, TouchableOpacity, Picker } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

const GameList = ({ games, updateGFX, launchGame }) => {
  const tailwind = useTailwind();

  return (
    <View style={tailwind('bg-gray-800 p-6 rounded-lg')}>
      <Text style={tailwind('text-2xl font-semibold text-white mb-4')}>
        Your Games
      </Text>
      {games.map(game => (
        <Animated.View
          key={game.name}
          entering={FadeIn}
          exiting={FadeOut}
          style={tailwind('bg-gray-700 p-4 rounded-lg mb-4')}
        >
          <View style={tailwind('flex-row justify-between items-center mb-2')}>
            <Text style={tailwind('font-semibold text-white')}>
              {game.name}
            </Text>
            <TouchableOpacity
              onPress={() => launchGame(game.name)}
              style={tailwind('bg-green-600 p-2 rounded')}
              accessible={true}
              accessibilityLabel={`Launch ${game.name}`}
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
            selectedValue={game.resolution}
            onValueChange={value => updateGFX(game.name, value, game.fpsCap)}
            style={tailwind('bg-gray-600 text-white p-1 rounded mb-2')}
            accessibilityLabel={`Select resolution for ${game.name}`}
          >
            <Picker.Item label="1920x1080" value="1920x1080" />
            <Picker.Item label="1280x720" value="1280x720" />
            <Picker.Item label="1600x900" value="1600x900" />
          </Picker>
          <Text style={tailwind('text-sm text-white')}>
            FPS Cap:
          </Text>
          <Picker
            selectedValue={game.fpsCap}
            onValueChange={value => updateGFX(game.name, game.resolution, value)}
            style={tailwind('bg-gray-600 text-white p-1 rounded')}
            accessibilityLabel={`Select FPS cap for ${game.name}`}
          >
            <Picker.Item label="30 FPS" value="30" />
            <Picker.Item label="60 FPS" value="60" />
            <Picker.Item label="120 FPS" value="120" />
          </Picker>
        </Animated.View>
      ))}
    </View>
  );
};

export default GameList;
