import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert, NativeModules, NativeEventEmitter, TouchableOpacity, Linking } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import NetInfo from '@react-native-community/netinfo';
import GameList from './components/GameList';
import SystemStatus from './components/SystemStatus';
import NetworkOptimizer from './components/NetworkOptimizer';
import OnboardingScreen from './screens/OnboardingScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { GameDetector, BackgroundProcess, SystemSettings, GameTurbo } = NativeModules;

const App = () => {
  const tailwind = useTailwind();
  const [games, setGames] = useState([]);
  const [systemStatus, setSystemStatus] = useState({
    cpuUsage: 0,
    ramUsage: 0,
    fps: 0,
    ping: 0,
  });
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [networkState, setNetworkState] = useState({ isConnected: false, type: '' });
  const [vpnServer, setVpnServer] = useState('Auto');
  const [manufacturer, setManufacturer] = useState('');
  const [gameTurboEnabled, setGameTurboEnabled] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const onboardingStatus = await AsyncStorage.getItem('onboardingComplete');
        if (onboardingStatus === 'true') {
          setIsOnboardingComplete(true);
        }

        const deviceInfo = await NativeModules.DeviceInfo.getDeviceInfo();
        setManufacturer(deviceInfo.manufacturer || 'unknown');

        GameDetector.getInstalledGames((error, detectedGames) => {
          if (error) {
            Alert.alert('Error', 'Failed to detect games: ' + error);
            return;
          }
          setGames(detectedGames || []);
        });

        SystemSettings.enableHighPerformanceMode((error, message) => {
          if (error && error.includes('PERMISSION_DENIED')) {
            Alert.alert(
              'Permission Required',
              'Please allow access to system settings for high performance mode.',
              [{ text: 'OK', onPress: () => Linking.openSettings() }]
            );
          }
        });

        const eventEmitter = new NativeEventEmitter(GameDetector);
        eventEmitter.addListener('GameStatusUpdate', (status) => {
          setSystemStatus({
            cpuUsage: status.cpuUsage || 0,
            ramUsage: status.ramUsage || 0,
            fps: status.fps || 0,
            ping: status.ping || 0,
          });
        });

        const unsubscribe = NetInfo.addEventListener((state) => {
          setNetworkState({
            isConnected: state.isConnected,
            type: state.type,
          });
        });

        setTimeout(() => setIsLoading(false), 2000);
        return () => unsubscribe();
      } catch (e) {
        Alert.alert('Error', 'Failed to initialize app: ' + e.message);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  const optimizeGame = (game) => {
    BackgroundProcess.closeBackgroundApps(manufacturer, (error, closedApps) => {
      if (error) {
        if (error.includes('PERMISSION_DENIED')) {
          Alert.alert(
            'Permission Required',
            'Please allow access to usage stats to optimize performance.',
            [{ text: 'OK', onPress: () => Linking.openSettings() }]
          );
        } else {
          Alert.alert('Error', 'Failed to optimize: ' + error);
        }
        return;
      }
      Alert.alert('Success', `Optimized ${game.name}. Closed ${closedApps.length} background apps.`);
    });
  };

  const toggleGameTurbo = () => {
    if (gameTurboEnabled) {
      GameTurbo.disableGameTurbo((error) => {
        if (error) {
          Alert.alert('Error', 'Failed to disable Game Turbo: ' + error);
          return;
        }
        setGameTurboEnabled(false);
        Alert.alert('Success', 'Game Turbo disabled.');
      });
    } else {
      GameTurbo.enableGameTurbo((error) => {
        if (error) {
          if (error.includes('PERMISSION_DENIED')) {
            Alert.alert(
              'Permission Required',
              'Please allow overlay and notification permissions for Game Turbo.',
              [{ text: 'OK', onPress: () => Linking.openSettings() }]
            );
          } else {
            Alert.alert('Error', 'Failed to enable Game Turbo: ' + error);
          }
          return;
        }
        setGameTurboEnabled(true);
        Alert.alert('Success', 'Game Turbo enabled. Swipe from left to view FPS/ping overlay.');
      });
    }
  };

  if (isLoading) {
    return (
      <View style={tailwind('flex-1 justify-center items-center bg-gray-900')}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={tailwind('text-white text-lg mt-4')}>Loading...</Text>
      </View>
    );
  }

  if (!isOnboardingComplete) {
    return (
      <OnboardingScreen
        onComplete={() => {
          AsyncStorage.setItem('onboardingComplete', 'true');
          setIsOnboardingComplete(true);
        }}
      />
    );
  }

  return (
    <View style={tailwind('flex-1 bg-gray-900 p-4')}>
      <Text style={tailwind('text-3xl font-bold text-white mb-6')}>Boost Game Faster</Text>
      <TouchableOpacity
        style={tailwind(`p-3 rounded-lg ${gameTurboEnabled ? 'bg-red-500' : 'bg-green-500'}`)}
        onPress={toggleGameTurbo}
      >
        <Text style={tailwind('text-white text-center font-bold')}>
          {gameTurboEnabled ? 'Disable Game Turbo' : 'Enable Game Turbo'}
        </Text>
      </TouchableOpacity>
      <SystemStatus systemStatus={systemStatus} />
      <NetworkOptimizer
        vpnServer={vpnServer}
        setVpnServer={setVpnServer}
        ping={systemStatus.ping}
        networkState={networkState}
      />
      <GameList games={games} optimizeGame={optimizeGame} />
    </View>
  );
};

export default App;
