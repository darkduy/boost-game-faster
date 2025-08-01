import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import { NativeModules } from 'react-native';

const { BoostMode, BackgroundProcess } = NativeModules;

const GameList = ({ isDarkMode }) => {
    const tailwind = useTailwind();
    const [games, setGames] = useState([]);
    const [selectedGame, setSelectedGame] = useState(null);

    // Load games lazily
    const loadGames = useCallback(async () => {
        try {
            const installedApps = await new Promise((resolve) => {
                BoostMode.getInstalledApps((error, apps) => {
                    if (error) {
                        Alert.alert('Error', error);
                        resolve([]);
                    } else {
                        resolve(apps.filter(app => app.isGame));
                    }
                });
            });
            setGames(installedApps);
        } catch (e) {
            Alert.alert('Error', `Failed to load games: ${e.message}`);
        }
    }, []);

    useEffect(() => {
        loadGames();
    }, [loadGames]);

    // Optimize selected game
    const optimizeGame = useCallback((game) => {
        setSelectedGame(game);
        BoostMode.suggestGraphicsSettings((error, settings) => {
            if (error) {
                Alert.alert('Error', error);
                return;
            }
            BoostMode.enableBoostMode('EXTREME', settings, (error, message) => {
                if (error) {
                    Alert.alert('Error', error);
                } else {
                    Alert.alert('Success', message);
                    BackgroundProcess.closeBackgroundApps('EXTREME', (error, message) => {
                        if (error) {
                            Alert.alert('Error', error);
                        }
                    });
                }
            });
        });
    }, []);

    const renderGameItem = useCallback(
        ({ item }) => (
            <TouchableOpacity
                style={tailwind(`bg-gray-800 p-4 mb-2 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`)}
                onPress={() => optimizeGame(item)}
            >
                <Text style={tailwind(`text-lg ${isDarkMode ? 'text-white' : 'text-black'}`)}>
                    {item.name}
                </Text>
            </TouchableOpacity>
        ),
        [isDarkMode, optimizeGame]
    );

    return (
        <View style={tailwind('flex-1 p-4')}>
            <Text style={tailwind(`text-xl mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`)}>
                Installed Games
            </Text>
            <FlatList
                data={games}
                renderItem={renderGameItem}
                keyExtractor={item => item.packageName}
                initialNumToRender={5}
                windowSize={1}
            />
            {selectedGame && (
                <Text style={tailwind(`text-lg mt-4 ${isDarkMode ? 'text-white' : 'text-black'}`)}>
                    Optimizing: {selectedGame.name}
                </Text>
            )}
        </View>
    );
};

export default GameList;
