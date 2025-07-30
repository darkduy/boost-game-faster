export const DeviceMonitor = {
  // Thresholds for performance warnings
  CPU_THRESHOLD: 80, // 80% CPU usage
  RAM_THRESHOLD: 80, // 80% RAM usage
  TEMP_THRESHOLD: 45, // 45°C (simulated, as Android 9 lacks direct API)

  // Check performance and show warnings
  checkPerformance: (systemStatus, Alert) => {
    const { cpuUsage, ramUsage, temperature = 0 } = systemStatus;
    if (cpuUsage > DeviceMonitor.CPU_THRESHOLD) {
      Alert.alert('Warning', 'High CPU usage detected. Consider closing background apps.');
    }
    if (ramUsage > DeviceMonitor.RAM_THRESHOLD) {
      Alert.alert('Warning', 'High RAM usage detected. Consider optimizing memory.');
    }
    if (temperature > DeviceMonitor.TEMP_THRESHOLD) {
      Alert.alert('Warning', 'Device is overheating. Please let it cool down.');
    }
  },

  // Simulate temperature reading (Android 9 lacks direct API)
  getSimulatedTemperature: () => {
    // Simulate temperature between 30°C and 50°C
    return Math.floor(Math.random() * (50 - 30 + 1)) + 30;
  },
};
