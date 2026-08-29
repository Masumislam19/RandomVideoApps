import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = '@vibeconnect_user';

export type User = {
  name: string;
  email: string;
};

export async function saveUser(user: User) {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function getUser(): Promise<User | null> {
  const data = await AsyncStorage.getItem(USER_KEY);

  if (!data) {
    return null;
  }

  return JSON.parse(data) as User;
}

export async function logout() {
  await AsyncStorage.removeItem(USER_KEY);
}
