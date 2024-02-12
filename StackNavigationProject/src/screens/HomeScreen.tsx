import { Button, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

/**
 * 타입스크립트 환경에서 StackNavigation을 사용할 땐 
 * 어떤 스크린에 어떤 Props가 들어가는지 제네릭으로 알려주어야 합니다.
 */
export type RootStackParam = {
  Home: undefined;
  Main: undefined;
}

export const HomeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParam>>();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <Text style={{ color: 'black', fontSize: 30 }}>HomeScreen</Text>
      <Button
        title="Go to MainScreen" 
        onPress={() => navigation.navigate('Main')} 
      />
    </View>

  );
}
