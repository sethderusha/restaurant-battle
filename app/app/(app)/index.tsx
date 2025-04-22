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

  // These are just placeholder cards until real data loads
  // Use empty data since these will be replaced
  const leftCard: CardProps = {
    name: "Loading...",
    image: null,
    place_id: "", 
  };

  const rightCard: CardProps = {
    name: "Loading...",
    image: null,
    place_id: "",
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