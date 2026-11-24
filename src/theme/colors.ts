export type ColorTokens = {
  background: string; surface: string; surfaceElevated: string; textPrimary: string;
  textSecondary: string; accent: string; accentMuted: string; danger: string;
  success: string; border: string; inputBackground: string; onAccent: string;
};

export const lightColors: ColorTokens = {
  background: '#F5F7F6', surface: '#FFFFFF', surfaceElevated: '#FFFFFF',
  textPrimary: '#12201B', textSecondary: '#66736E', accent: '#2B705A',
  accentMuted: '#DCECE6', danger: '#B42318', success: '#217A50', border: '#DDE4E1',
  inputBackground: '#EEF2F0', onAccent: '#FFFFFF',
};

export const darkColors: ColorTokens = {
  background: '#0C1311', surface: '#141E1B', surfaceElevated: '#1A2723',
  textPrimary: '#F2F6F4', textSecondary: '#9DAAA5', accent: '#74D2B1',
  accentMuted: '#17392F', danger: '#FF8A80', success: '#72D6A2', border: '#283732',
  inputBackground: '#1A2723', onAccent: '#092018',
};
