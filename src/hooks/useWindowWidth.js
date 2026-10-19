import { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';

export default function useWindowWidth() {
  const [width, setWidth] = useState(() => Dimensions.get('window').width);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWidth(window.width);
    });

    return () => subscription.remove();
  }, []);

  return width;
}
