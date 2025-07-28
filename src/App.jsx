import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, AccessibilityInfo } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import NetInfo from '@react-native-community/netinfo';
import DeviceInfo from 'react-native-device-info';
import SystemStatus from './components/SystemStatus';
import GameList from './components/GameList';
import NetworkOptimizer from './components/NetworkOptimizer';

const { BackgroundProcess, SystemSettings, GameDetector } = NativeModules;

const BoostGameFaster = () => {
  const tailwind = useTailwind();
  const [systemStatus, setSystemStatus] = useState({
    cpuUsage: 50,
    ramUsage: 60,
    fps: 30,
    ping: 100,
  });
  const [games, setGames] = useState([]);
  const [vpnServer, setVpnServer] = useState('Auto');
  const [networkState, setNetworkState] = useState({ isConnected: true, type: 'wifi' });
  const [runningApps, setRunningApps] = useState([]);

  // Fetch running apps
  useEffect(() => {
    BackgroundProcess.getRunningApps()
      .then(apps => setRunningApps(apps))
      .catch(error => Alert.alert('Error', error.message));
  }, []);

  // Fetch installed games
  useEffect(() => {
    GameDetector.getInstalledGames()
      .then(games => setGames(games))
      .catch(error => {
        Alert.alert('Error', error.message);
        // Fallback to mock games if detection fails
        setGames([
          { name: 'FPS Shooter', packageName: 'com.fps.shooter', status: 'Ready', resolution: '1920x1080', fpsCap: '60' },
          { name: 'RPG Adventure', packageName: 'com.rpg.adventure', status: 'Ready', resolution: '1280x720', fpsCap: '30' },
          { name: 'Racing Game', packageName: 'com.racing.game', status: 'Ready', resolution: '1600x900', fpsCap: '60' },
        ]);
      });
  }, []);

  // Simulate system boost with native modules
  const boostSystem = () => {
    // Close background apps
    BackgroundProcess.closeBackgroundApps()
      .then(closedApps => {
        setSystemStatus({
          cpuUsage: Math.max(10, systemStatus.cpuUsage - 20),
          ramUsage: Math.max(10, systemStatus.ramUsage - 20),
          fps: Math.min(60, systemStatus.fps + 15),
          ping: Math.max(20, systemStatus.ping - 30),
        });
        setRunningApps(runningApps.filter(app => !closedApps.some(closed => closed.name === app.name)));

        // Enable high performance mode
        SystemSettings.enableHighPerformanceMode()
          .then(message => {
            Alert.alert('Boost Complete', `Closed ${closedApps.length} background apps. ${message}`);
          })
          .catch(error => {
            Alert.alert('Warning', error.message);
          });
      })
      .catch(error => Alert.alert('Error', 'Failed to close apps: ' + error.message));
  };

  // Update GFX settings
  const updateGFX = (packageName, resolution, fpsCap) => {
    setGames(games.map(game =>
      game.packageName === packageName ? { ...game, resolution, fpsCap } : game
    ));
  };

  // Launch game
  const launchGame = (packageName) => {
    GameDetector.launchGame(packageName)
      .then(message => Alert.alert('Success', message))
      .catch(error => Alert.alert('Error', error.message));
  };

  // Monitor network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetworkState({ isConnected: state.isConnected, type: state.type });
    });
    return () => unsubscribe();
  }, []);

  // Simulate real-time system status updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemStatus(prev => ({
        cpuUsage: Math.min(100, prev.cpuUsage + Math.floor(Math.random() * 5 - 2)),
        ramUsage: Math.min(100, prev.ramUsage + Math.floor(Math.random() * 5 - 2)),
        fps: Math.min(60, prev.fps + Math.floor(Math.random() * 3 - 1)),
        ping: Math.max(20, prev.ping + Math.floor(Math.random() * 10 - 5)),
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Accessibility: Announce boost action
  const handleBoostAccessibility = () => {
    boostSystem();
    AccessibilityInfo.announceForAccessibility('System boosted successfully');
  };

  return (
    <ScrollView style={tailwind('bg-gray-900')}>
      <View style={tailwind('p-4')}>
        <Text style={tailwind('text-4xl font-bold text-center text-white mb-6')}>
          Boost Game Faster
        </Text>

        {/* Boost Button */}
        <Animated.View entering={FadeIn} exiting={FadeOut}>
          <TouchableOpacity
            style={tailwind('bg-blue-600 p-4 rounded-lg mb-8 mx-auto')}
            onPress={handleBoostAccessibility}
            accessible={true}
            accessibilityLabel="Boost system performance"
          >
            <Text style={tailwind('text-white text-center font-bold text-lg')}>
              Boost Now
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Network Optimizer */}
        <NetworkOptimizer
          vpnServer={vpnServer}
          setVpnServer={setVpnServer}
          ping={systemStatus.ping}
          networkState={networkState}
        />

        {/* System Status */}
        <SystemStatus systemStatus={systemStatus} />

        {/* Game List */}
        <GameList games={games} updateGFX={updateGFX} launchGame={launchGame} />
      </View>
    </ScrollView>
  );
};

export default BoostGameFaster;
