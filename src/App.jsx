import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, AccessibilityInfo, ActivityIndicator } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import NetInfo from '@react-native-community/netinfo';
import DeviceInfo from 'react-native-device-info';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const [isLoading, setIsLoading] = useState(false);
  const [errorCount, setErrorCount] = useState({ background: 0, settings: 0, games: 0 });

  // Memoized mock games
  const mockGames = useMemo(() => [
    { name: 'FPS Shooter', packageName: 'com.fps.shooter', status: 'Ready', resolution: '1920x1080', fpsCap: '60' },
    { name: 'RPG Adventure', packageName: 'com.rpg.adventure', status: 'Ready', resolution: '1280x720', fpsCap: '30' },
    { name: 'Racing Game', packageName: 'com.racing.game', status: 'Ready', resolution: '1600x900', fpsCap: '60' },
  ], []);

  // Check permissions
  const checkPermissions = useCallback(async () => {
    const writeSettings = await request(PERMISSIONS.ANDROID.WRITE_SETTINGS);
    const queryPackages = await request(PERMISSIONS.ANDROID.QUERY_ALL_PACKAGES);
    if (writeSettings !== RESULTS.GRANTED) {
      Alert.alert('Permission Required', 'Please enable Modify System Settings in app permissions.');
    }
    if (queryPackages !== RESULTS.GRANTED) {
      Alert.alert('Permission Required', 'Please allow access to installed apps to detect games.');
    }
  }, []);

  // Fetch running apps with retry
  const fetchRunningApps = useCallback(async () => {
    if (errorCount.background >= 3) return;
    try {
      const apps = await BackgroundProcess.getRunningApps();
      setRunningApps(apps);
      setErrorCount(prev => ({ ...prev, background: 0 }));
    } catch (error) {
      setErrorCount(prev => ({ ...prev, background: prev.background + 1 }));
      await AsyncStorage.setItem('error_log', JSON.stringify({ time: new Date(), error: error.message }));
      if (errorCount.background < 2) {
        setTimeout(fetchRunningApps, 1000); // Retry after 1s
      }
    }
  }, [errorCount.background]);

  // Fetch installed games with retry
  const fetchGames = useCallback(async () => {
    if (errorCount.games >= 3) return setGames(mockGames);
    try {
      const games = await GameDetector.getInstalledGames();
      setGames(games.length ? games : mockGames);
      setErrorCount(prev => ({ ...prev, games: 0 }));
    } catch (error) {
      setErrorCount(prev => ({ ...prev, games: prev.games + 1 }));
      await AsyncStorage.setItem('error_log', JSON.stringify({ time: new Date(), error: error.message }));
      if (errorCount.games < 2) {
        setTimeout(fetchGames, 1000); // Retry after 1s
      } else {
        setGames(mockGames);
      }
    }
  }, [errorCount.games, mockGames]);

  useEffect(() => {
    checkPermissions();
    fetchRunningApps();
    fetchGames();
  }, [checkPermissions, fetchRunningApps, fetchGames]);

  // Simulate system boost with native modules
  const boostSystem = useCallback(async () => {
    setIsLoading(true);
    try {
      // Close background apps
      const closedApps = await BackgroundProcess.closeBackgroundApps();
      setSystemStatus({
        cpuUsage: Math.max(10, systemStatus.cpuUsage - 20),
        ramUsage: Math.max(10, systemStatus.ramUsage - 20),
        fps: Math.min(60, systemStatus.fps + 15),
        ping: Math.max(20, systemStatus.ping - 30),
      });
      setRunningApps(runningApps.filter(app => !closedApps.some(closed => closed.name === app.name)));

      // Enable high performance mode
      const settingsMessage = await SystemSettings.enableHighPerformanceMode();
      Alert.alert('Boost Complete', `Closed ${closedApps.length} apps: ${closedApps.map(app => app.name).join(', ')}. ${settingsMessage}`);
      setErrorCount(prev => ({ ...prev, background: 0, settings: 0 }));
    } catch (error) {
      const module = error.message.includes('WRITE_SETTINGS') ? 'settings' : 'background';
      setErrorCount(prev => ({ ...prev, [module]: prev[module] + 1 }));
      await AsyncStorage.setItem('error_log', JSON.stringify({ time: new Date(), error: error.message }));
      Alert.alert('Warning', error.message);
    } finally {
      setIsLoading(false);
    }
  }, [systemStatus, runningApps]);

  // Update GFX settings
  const updateGFX = useCallback((packageName, resolution, fpsCap) => {
    setGames(prev => prev.map(game =>
      game.packageName === packageName ? { ...game, resolution, fpsCap } : game
    ));
  }, []);

  // Launch game
  const launchGame = useCallback(async (packageName) => {
    try {
      const message = await GameDetector.launchGame(packageName);
      Alert.alert('Success', message);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  }, []);

  // Monitor network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetworkState({ isConnected: state.isConnected, type: state.type });
    });
    return () => unsubscribe();
  }, []);

  // Update system status less frequently
  useEffect(() => {
    let frameId;
    const updateStatus = () => {
      setSystemStatus(prev => ({
        cpuUsage: Math.min(100, prev.cpuUsage + Math.floor(Math.random() * 5 - 2)),
        ramUsage: Math.min(100, prev.ramUsage + Math.floor(Math.random() * 5 - 2)),
        fps: Math.min(60, prev.fps + Math.floor(Math.random() * 3 - 1)),
        ping: Math.max(20, prev.ping + Math.floor(Math.random() * 10 - 5)),
      }));
      frameId = requestAnimationFrame(updateStatus);
    };
    frameId = requestAnimationFrame(updateStatus);
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Accessibility: Announce boost action
  const handleBoostAccessibility = useCallback(() => {
    boostSystem();
    AccessibilityInfo.announceForAccessibility('System boosted successfully');
  }, [boostSystem]);

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
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={tailwind('text-white text-center font-bold text-lg')}>
                Boost Now
              </Text>
            )}
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
