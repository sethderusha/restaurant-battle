import {View} from 'react-native';
import {Card, CardProps } from '@/components/Card';
import { getNearbyRestaurants } from '@/api/api';
import {v4 as uuidv4} from 'uuid';

//battle view displays 2 card objects
//onclick clicked card is preserved, other is replaced with nextRestaurant
//useEffect to have some sort of "selected" animation

export type BattleViewProps = {
    left: CardProps;
    right: CardProps;
}

export function BattleView({left, right}:BattleViewProps) {
  let newSession = uuidv4(); //sessionId
  let restaurants;
  const myPromise = getNearbyRestaurants(newSession,40.736352105736536, -73.99093648525601);

  let processPromise = myPromise.then(function(result) {
    let name1 = result.restaurants[0].name;
    console.log(name1);
    let name2 = result.restaurants[1].name;
    let photo_reference1 = result.restaurants[0].photo_reference;
    let photo_reference2 = result.restaurants[1].photo_reference;
    return {names: [name1, name2], photo_references: [photo_reference1, photo_reference2]};
  })


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
    //   backgroundColor: 'yellow',
      alignSelf: 'center',
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: "10%",
    }
  }