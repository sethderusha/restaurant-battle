import { View, StyleSheet, Text } from "react-native";
import { Card } from "@/components/Card";
import { getNearbyRestaurants, getPhotoUrl } from "@/api/api";
import { v4 as uuidv4 } from "uuid";
import { useState, useEffect } from "react";
import Restaurant from "@/models/Restaurant";
import User from "@/models/User";

export type BattleViewProps = {
  left: CardProps;
  right: CardProps;
};

export type CardProps = {
  name: string;
  image: string;
};

export function BattleView({
  left: initialLeft,
  right: initialRight,
}: BattleViewProps) {
  const [leftCard, setLeftCard] = useState(initialLeft);
  const [rightCard, setRightCard] = useState(initialRight);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        console.log("Starting to fetch user location...");
        const userLocation = await User.getLocation();

        if (!userLocation) {
          setError("Could not get user location. Please enable location services.");
          setLoading(false);
          return;
        }

        console.log(
          "Got user location:",
          userLocation.latitude,
          userLocation.longitude,
        );

        const newSession = uuidv4();
        const result = await getNearbyRestaurants(
          newSession,
          userLocation.latitude,
          userLocation.longitude,
        );

        console.log("API response:", result);

        if (result?.restaurants?.length >= 2) {
          const restaurantObjects = result.restaurants.map(
            (restaurantData: any) => new Restaurant(restaurantData),
          );

          setRestaurants(restaurantObjects);

          // Update both cards with the first two restaurants
          setLeftCard({
            name: restaurantObjects[0].name,
            image: getPhotoUrl(result.restaurants[0].photo_reference),
          });

          setRightCard({
            name: restaurantObjects[1].name,
            image: getPhotoUrl(result.restaurants[1].photo_reference),
          });

          setCurrentIndex(2);
          console.log("Cards updated with restaurant data");
        } else {
          console.error("Not enough restaurants returned:", result);
          setError("Not enough restaurants found in your area");
        }
      } catch (error) {
        console.error("Error in fetchRestaurants:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load nearby restaurants",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  const handleCardClick = (side: "left" | "right") => {
    if (restaurants.length <= currentIndex) {
      setError("No more restaurants to show");
      return;
    }

    const nextRestaurant = restaurants[currentIndex];
    const nextCard: CardProps = {
      name: nextRestaurant.name,
      image:
        nextRestaurant.getPrimaryPhotoUrl() ||
        "https://via.placeholder.com/400x300?text=No+Image",
    };

    if (side === "left") {
      setRightCard(nextCard);
    } else {
      setLeftCard(nextCard);
    }

    setCurrentIndex(currentIndex + 1);
    console.log(
      `Clicked ${side} card. Showing next restaurant: ${nextRestaurant.name}`,
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading nearby restaurants...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <View style={styles.cardsContainer}>
          <View
            onTouchEnd={() => handleCardClick("left")}
            style={styles.cardContainer}
          >
            <Card name={leftCard.name} image={leftCard.image} />
          </View>
          <View
            onTouchEnd={() => handleCardClick("right")}
            style={styles.cardContainer}
          >
            <Card name={rightCard.name} image={rightCard.image} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "75%",
    height: "auto",
    alignSelf: "center" as const,
    marginTop: "10%",
  },
  cardsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  cardContainer: {
    flex: 1,
    maxWidth: "45%",
  },
  errorText: {
    color: "red",
    textAlign: "center" as const,
    width: "100%",
  },
});
