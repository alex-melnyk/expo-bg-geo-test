import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as SecureStore from 'expo-secure-store';

const BG_TASK_NAME = 'WATCH_GEO';
const SS_LOCATION_KEY = 'GEO';

TaskManager.defineTask(BG_TASK_NAME, ({ data, error }) => {
  if (error) {
    return;
  }

  const { locations } = data as {
    locations: Location[];
  };

  SecureStore.getItemAsync(SS_LOCATION_KEY, {
    keychainService: 'private'
  }).then((data) => {
    return data
      ? JSON.parse(data) as Location[]
      : [];
  }).then((previousLocations) => {
    const totalLocations = previousLocations.concat(locations);
    const locationsToSave = totalLocations.length > 10
      ? totalLocations.slice(totalLocations.length - 10)
      : totalLocations;

    const data = JSON.stringify(locationsToSave);

    SecureStore.setItemAsync(SS_LOCATION_KEY, data, {
      keychainService: 'private'
    });
  });
});

const App = () => {
  const [isLocationPermitted, setIsLocationPermitted] = useState(false);
  const [locationData, setLocationData] = useState<Location.LocationData>();

  useEffect(() => {
    Location.requestPermissionsAsync()
      .then(({ status }) => setIsLocationPermitted(status === 'granted'));
  }, []);

  useEffect(() => {
    if (isLocationPermitted) {
      SecureStore.getItemAsync(SS_LOCATION_KEY, {
        keychainService: 'private'
      }).then((data) => {
        return data
          ? JSON.parse(data) as Location.LocationData[]
          : [];
      }).then((locations) => {
        if (locations.length) {
          const lastLocation = locations.pop();
          setLocationData(lastLocation);
        }
      }).finally(() => {
        return Location.watchPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          enableHighAccuracy: true,
          timeInterval: 10,
          timeout: 10,
          distanceInterval: 10,
        }, (data) => setLocationData(data));
      });

      Location.hasStartedLocationUpdatesAsync(BG_TASK_NAME)
        .then((locationUpdatesHasStarted) => {
          if (!locationUpdatesHasStarted) {
            return Location.startLocationUpdatesAsync(BG_TASK_NAME, {
              accuracy: Location.Accuracy.Balanced,
              activityType: Location.ActivityType.Other,
              showsBackgroundLocationIndicator: true
            });
          }
        });
    }
  }, [isLocationPermitted]);

  const locationDataBlock = useMemo(() => {
    if (!locationData) {
      return (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Text>
            No location data is present.
          </Text>
        </View>
      );
    }

    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Text>
          {new Date(locationData.timestamp).toLocaleTimeString()}
        </Text>
        <Text>
          LT: {locationData.coords.latitude}; LG: {locationData.coords.longitude};
        </Text>
      </View>
    );
  }, [locationData]);

  return (
    <View style={styles.container}>
      {locationDataBlock}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default App;
