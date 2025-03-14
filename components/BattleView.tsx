import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { Card, CardProps } from "@/components/Card";
import { getNearbyRestaurants, getNextRestaurant, getPhotoUrl } from "@/api/api";
import { v4 as uuidv4 } from "uuid";
import { useState, useEffect } from "react";
import Restaurant from "@/models/Restaurant";
import User from "@/models/User";
import { useAuth } from "@/context/AuthContext";

export type BattleViewProps = {
  left: CardProps;
  right: CardProps;
};

export function BattleView({
  left: initialLeft,
  right: initialRight,
}: BattleViewProps) {
  const { user } = useAuth();
  const [leftCard, setLeftCard] = useState(initialLeft);
  const [rightCard, setRightCard] = useState(initialRight);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [currentIndex, setCurrentIndex] = useState(2);
  const [sessionId] = useState(() => uuidv4());

  // Helper function to get photo URL consistently
  const getRestaurantPhotoUrl = (restaurant: Restaurant) => {
    const photoRef = restaurant.photos?.[0]?.photo_reference;
    return photoRef ? getPhotoUrl(photoRef) : 'assets/images/react-logo.png';
  };

  const getNext = async (side: "left" | "right") => {
    try {
      if (currentIndex < restaurants.length) {
        const nextRestaurant = restaurants[currentIndex];
        const nextCard: CardProps = {
          name: nextRestaurant.name,
          image: getRestaurantPhotoUrl(nextRestaurant)
        };

        if (side === 'left') {
          setRightCard(nextCard);
        } else {
          setLeftCard(nextCard);
        }
        
        setCurrentIndex(currentIndex + 1);
      } else {
        console.log("Getting next restaurant with session:", sessionId);
        const nextRestaurant = await getNextRestaurant(sessionId);
        const nextRestaurantObject = new Restaurant(nextRestaurant.restaurant);
        
        const nextCard: CardProps = {
          name: nextRestaurantObject.name,
          image: getRestaurantPhotoUrl(nextRestaurantObject)
        };

        if (side === 'left') {
          setRightCard(nextCard);
        } else {
          setLeftCard(nextCard);
        }
      }
    } catch (error) {
      console.error("Error getting next restaurant", error);
      setError("Failed to get next restaurant");
    }
  }

  const handleCardClick = (side: "left" | "right") => {
    console.log(`Card clicked: ${side}`);
    try {
      getNext(side);
    } catch (error) {
      console.error(`Error in handleCardClick for ${side} card:`, error);
      setError("Failed to handle card click");
    }
  };

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        let location;
        
        // If there's a logged in user, try to get their location
        if (user) {
          if (!user.hasInitializedLocation) {
            console.log("Initializing user location...");
            try {
              await user.updateLocation();
              location = user.location;
            } catch (error) {
              console.warn("Failed to get user location, using fallback");
              location = User.fallbackLocation();
            }
          } else {
            location = user.location || User.fallbackLocation();
          }
        } else {
          // No user, just use fallback location
          console.log("No user logged in, using default location (NYC)");
          location = User.fallbackLocation();
        }

        // Always proceed with a location (either real or fallback)
        await fetchWithLocation(location);
        
      } catch (error) {
        console.error("Error in fetchRestaurants:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load nearby restaurants"
        );
      } finally {
        setLoading(false);
      }
    };

    const fetchWithLocation = async (location: { latitude: number; longitude: number }) => {
      try {
        console.log("Fetching restaurants for location:", location);
        const result = await getNearbyRestaurants(
          sessionId,
          location.latitude,
          location.longitude,
        );

        console.log("API response:", result);

        if (!result?.restaurants?.length) {
          throw new Error("No restaurants found in this area");
        }

        if (result.restaurants.length < 2) {
          throw new Error("Not enough restaurants found in this area");
        }

        // Store all restaurants in state
        const restaurantObjects = result.restaurants.map(
          (restaurantData: any) => new Restaurant(restaurantData)
        );
        setRestaurants(restaurantObjects);

        // Set initial cards using the first two restaurants
        const firstRestaurant = restaurantObjects[0];
        const secondRestaurant = restaurantObjects[1];

        setLeftCard({
          name: firstRestaurant.name,
          image: getRestaurantPhotoUrl(firstRestaurant)
        });

        setRightCard({
          name: secondRestaurant.name,
          image: getRestaurantPhotoUrl(secondRestaurant)
        });

        setCurrentIndex(2); // Start at index 2 since we've used the first two
        console.log("Cards updated with restaurant data");
      } catch (error) {
        console.error("Error fetching restaurants:", error);
        setError(error instanceof Error ? error.message : "Failed to load restaurants");
      }
    };

    fetchRestaurants();
  }, [user]);

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
          <TouchableOpacity
            onPress={() => handleCardClick("left")}
            style={styles.cardContainer}
            activeOpacity={0.7}
          >
            <Card name={leftCard.name} image={leftCard.image} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleCardClick("right")}
            style={styles.cardContainer}
            activeOpacity={0.7}
          >
            <Card name={rightCard.name} image={rightCard.image} />
          </TouchableOpacity>
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
