import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { getVoice } from './store';

export async function playVoice(): Promise<boolean> {
  const uri = await getVoice();
  if (!uri) return false;
  await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
  createAudioPlayer(uri).play();
  return true;
}
