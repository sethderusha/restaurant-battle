import {View} from 'react-native';
import {Card, CardProps } from '@/components/Card';

//battle view displays 2 card objects
//onclick clicked card is preserved, other is replaced with nextRestaurant
//useEffect to have some sort of "selected" animation

export type BattleViewProps = {
    left: CardProps;
    right: CardProps;
}

export function getRestaurants() {

}

export function BattleView({left, right}:BattleViewProps) {
    return(
        <div style={styles.centerDiv}>
            {Card(left)}
            {Card(right)}
        </div>
    );
}

const styles = {
    centerDiv: {
      width: '75%',
      height: 'auto',
      backgroundColor: 'yellow',
      alignSelf: 'center',
      display: 'flex',
      justifyContent: 'space-between',
    }
  }