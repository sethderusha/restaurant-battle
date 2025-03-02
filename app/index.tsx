import { Text, View } from "react-native";
import {Card} from "@/components/Card";
import * as apiFunctions from "@/api/api";
import { BattleView } from "@/components/BattleView";

export default function Index() {
  // apiFunctions.resetSession();
  let leftCard= {name:"Din Tai Fung", image: "https://s3-media0.fl.yelpcdn.com/bphoto/9P8b9sHCne0SxCojUjILVA/o.jpg"};
  let rightCard= {name:"Fish Taco", image: "https://s3-media0.fl.yelpcdn.com/bphoto/K1sL1SnnZLsdb3O0Rugw2w/o.jpg"};
  return (
    <View>
      <BattleView left={leftCard} right={rightCard}></BattleView>
    </View>
  );
}

