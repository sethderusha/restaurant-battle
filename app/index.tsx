import { Text, View } from "react-native";
import {Card} from "@/components/Card";
import * as apiFunctions from "@/api/api";
import { BattleView } from "@/components/BattleView";

export default function Index() {
  // apiFunctions.resetSession();
  let leftCard= {name:"San Marzano", image: "https://lh5.googleusercontent.com/p/AF1QipOJIoxbkEWctMAecij3sWNHAMTnlErwDhq8GZ4e=w408-h306-k-no"};
  let rightCard= {name:"Veselka", image: "https://lh5.googleusercontent.com/p/AF1QipNrZx3OFboCC9wJj0-mEzmxbK4niClm5jsp9T3d=w408-h307-k-no"};
  return (
    <View>
      <BattleView left={leftCard} right={rightCard}></BattleView>
    </View>
  );
}

