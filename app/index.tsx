import { View, Text, StyleSheet } from 'react-native'
import { Colors, Fonts } from '../src/theme'
import tenant from '../src/config/app.config'

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.wordmark}>{tenant.appName}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  wordmark: { fontFamily: Fonts.display, fontSize: 34, color: Colors.accent, letterSpacing: 2 },
})
