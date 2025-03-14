import { View, StyleSheet } from "react-native";
import { CardProps } from "@/components/Card";
import { BattleView } from "@/components/BattleView";
import { useAuth } from "@/context/AuthContext";

export default function Index() {
  const { user } = useAuth();

  // Use your original static cards
  const leftCard: CardProps = {
    name: "San Marzano",
    image:
      "https://lh5.googleusercontent.com/p/AF1QipOJIoxbkEWctMAecij3sWNHAMTnlErwDhq8GZ4e=w408-h306-k-no",
  };

  const rightCard: CardProps = {
    name: "Veselka",
    image:
      "https://lh5.googleusercontent.com/p/AF1QipNrZx3OFboCC9wJj0-mEzmxbK4niClm5jsp9T3d=w408-h307-k-no",
  };

  return (
    <View style={styles.container}>
      <BattleView left={leftCard} right={rightCard} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#d2aeed',
  },
});
