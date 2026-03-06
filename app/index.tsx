import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

export default function Index() {
  const inset = useSafeAreaInsets();
  return (
    <WebView
      style={[styles.container, { marginTop: inset.top }]}
      source={{ uri: 'http://localhost:3000/' }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
