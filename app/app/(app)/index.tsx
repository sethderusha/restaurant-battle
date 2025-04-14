import { View, StyleSheet } from "react-native";
import { CardProps } from "@/components/Card";
import { BattleView } from "@/components/BattleView";
import { useAuth } from "@/context/AuthContext";
import { LoadingOverlay } from "@/components/LoadingOverlay";

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingOverlay message="Loading..." />;
  }

  // Example cards - replace with real data from your API
  const leftCard: CardProps = {
    name: "San Marzano",
    image: "https://lh5.googleusercontent.com/p/AF1QipOJIoxbkEWctMAecij3sWNHAMTnlErwDhq8GZ4e=w408-h306-k-no",
    place_id: "san-marzano-id" // Add a placeholder ID
  };

  const rightCard: CardProps = {
    name: "Veselka",
    image: "https://lh5.googleusercontent.com/p/AF1QipNrZx3OFboCC9wJj0-mEzmxbK4niClm5jsp9T3d=w408-h307-k-no",
    place_id: "veselka-id" // Add a placeholder ID
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