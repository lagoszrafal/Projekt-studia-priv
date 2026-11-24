import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type TextInputProps } from 'react-native';
import { VaultlyInput } from './VaultlyInput';
import { useTheme } from '@/theme/theme';

export function SecureInput(props: Omit<TextInputProps, 'secureTextEntry'> & { label: string; error?: string }) {
  const [visible, setVisible] = useState(false);
  const { colors, typography } = useTheme();
  return <View>
    <VaultlyInput {...props} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} style={styles.input} />
    <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Ukryj hasło' : 'Pokaż hasło'} onPress={() => setVisible((value) => !value)} style={styles.action}>
      <Text style={[typography.caption, { color: colors.accent }]}>{visible ? 'Ukryj' : 'Pokaż'}</Text>
    </Pressable>
  </View>;
}
const styles = StyleSheet.create({ input: { paddingRight: 76 }, action: { position: 'absolute', right: 16, top: 43, padding: 8 } });
