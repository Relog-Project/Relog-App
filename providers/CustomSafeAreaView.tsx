import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ISafeAreaViewProps {
  children: React.ReactNode;
}

export default function CustomSafeAreaView({ children }: ISafeAreaViewProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <View style={{ height: insets.top }} />
      <View style={styles.screen}>{children}</View>
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
