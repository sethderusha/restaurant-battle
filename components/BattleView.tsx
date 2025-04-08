import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { Card, CardProps } from "@/components/Card";
import { getNearbyRestaurants, getNextRestaurant, getPhotoUrl } from "@/api/api";
import { v4 as uuidv4 } from "uuid";
import { useState, useEffect } from "react";
import Restaurant from "@/models/Restaurant";
import User from "@/models/User";
import { useAuth } from "@/context/AuthContext";
import { LoadingOverlay } from "@/components/LoadingOverlay";

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
    return photoRef ? getPhotoUrl(photoRef) : require('@/assets/images/food-fight-logo.png');
  };

  const getNext = async (side: "left" | "right") => {
    try {
      if (currentIndex < restaurants.length) {
        const nextRestaurant = restaurants[currentIndex];
        const nextCard: CardProps = {
          name: nextRestaurant.name,
          image: getRestaurantPhotoUrl(nextRestaurant),
          place_id: nextRestaurant.id,
          vicinity: nextRestaurant.vicinity,
          rating: nextRestaurant.rating,
          price_level: nextRestaurant.priceLevel,
          isOpenNow: nextRestaurant.isOpenNow
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
          image: getRestaurantPhotoUrl(nextRestaurantObject),
          place_id: nextRestaurantObject.id,
          vicinity: nextRestaurantObject.vicinity,
          rating: nextRestaurantObject.rating,
          price_level: nextRestaurantObject.priceLevel,
          isOpenNow: nextRestaurantObject.isOpenNow
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
              console.error("Failed to get user location:", error);
              setError("Location access is required to use this app. Please enable location services and try again.");
              setLoading(false);
              return;
            }
          } else {
            if (!user.location) {
              setError("Location access is required to use this app. Please enable location services and try again.");
              setLoading(false);
              return;
            }
            location = user.location;
          }
        } else {
          // No user, show error
          console.log("No user logged in");
          setError("Please log in to use the app");
          setLoading(false);
          return;
        }

        // Proceed with location
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
        const result = await getNearbyRestaurants(
          sessionId,
          location.latitude,
          location.longitude,
        );

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
          image: getRestaurantPhotoUrl(firstRestaurant),
          place_id: firstRestaurant.id,
          vicinity: firstRestaurant.vicinity,
          rating: firstRestaurant.rating,
          price_level: firstRestaurant.priceLevel,
          isOpenNow: firstRestaurant.isOpenNow
        });

        setRightCard({
          name: secondRestaurant.name,
          image: getRestaurantPhotoUrl(secondRestaurant),
          place_id: secondRestaurant.id,
          vicinity: secondRestaurant.vicinity,
          rating: secondRestaurant.rating,
          price_level: secondRestaurant.priceLevel,
          isOpenNow: secondRestaurant.isOpenNow
        });

        setCurrentIndex(2); // Start at index 2 since we've used the first two
      } catch (error) {
        console.error("Error fetching restaurants:", error);
        setError(error instanceof Error ? error.message : "Failed to load restaurants");
      }
    };

    fetchRestaurants();
  }, [user]);

  if (loading) {
    return <LoadingOverlay message="Loading nearby restaurants..." />;
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
            <Card 
              name={leftCard.name} 
              image={leftCard.image} 
              place_id={leftCard.place_id}
              vicinity={leftCard.vicinity}
              rating={leftCard.rating}
              price_level={leftCard.price_level}
              isOpenNow={leftCard.isOpenNow}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleCardClick("right")}
            style={styles.cardContainer}
            activeOpacity={0.7}
          >
            <Card 
              name={rightCard.name} 
              image={rightCard.image} 
              place_id={rightCard.place_id}
              vicinity={rightCard.vicinity}
              rating={rightCard.rating}
              price_level={rightCard.price_level}
              isOpenNow={rightCard.isOpenNow}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: "10%",
    marginBottom: 80,
    backgroundColor: '#d2aeed',
    paddingHorizontal: 20,
  },
  cardsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    gap: 150,
  },
  cardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: "red",
    textAlign: "center" as const,
    width: "100%",
  },
});
