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
  const [favoriteRestaurants, setFavoriteRestaurants] = useState<Set<string>>(new Set());

  // Helper function to get photo URL consistently
  const getRestaurantPhotoUrl = (restaurant: Restaurant) => {
    const photoRef = restaurant.photos?.[0]?.photo_reference;
    return photoRef ? getPhotoUrl(photoRef) : require('@/assets/images/food-fight-logo.png');
  };

  // Load user favorites on component mount
  useEffect(() => {
    const loadFavorites = async () => {
      if (user) {
        try {
          console.log("Loading favorites for user...");
          const favorites = await user.getFavorites();
          console.log("Favorites loaded:", favorites);
          const favoriteIds = new Set<string>(favorites.map((fav: Restaurant) => fav.id));
          console.log("Favorite IDs:", Array.from(favoriteIds));
          setFavoriteRestaurants(favoriteIds);
          
          // Update the favorite state of current cards if they exist
          if (leftCard.place_id && favoriteIds.has(leftCard.place_id)) {
            console.log(`Setting left card ${leftCard.name} as favorite`);
            setLeftCard(prev => ({...prev, isFavorite: true}));
          }
          
          if (rightCard.place_id && favoriteIds.has(rightCard.place_id)) {
            console.log(`Setting right card ${rightCard.name} as favorite`);
            setRightCard(prev => ({...prev, isFavorite: true}));
          }
        } catch (error) {
          console.error("Error loading favorites:", error);
        }
      }
    };

    loadFavorites();
  }, [user]);

  // Add a new effect to update card favorite states when favoriteRestaurants changes
  useEffect(() => {
    console.log("favoriteRestaurants changed:", Array.from(favoriteRestaurants));
    
    // Update left card favorite state
    if (leftCard.place_id) {
      const isFavorite = favoriteRestaurants.has(leftCard.place_id);
      console.log(`Left card ${leftCard.name} favorite state: ${isFavorite}`);
      if (leftCard.isFavorite !== isFavorite) {
        setLeftCard(prev => ({...prev, isFavorite}));
      }
    }
    
    // Update right card favorite state
    if (rightCard.place_id) {
      const isFavorite = favoriteRestaurants.has(rightCard.place_id);
      console.log(`Right card ${rightCard.name} favorite state: ${isFavorite}`);
      if (rightCard.isFavorite !== isFavorite) {
        setRightCard(prev => ({...prev, isFavorite}));
      }
    }
  }, [favoriteRestaurants]);

  // Handle toggling favorites
  const handleFavoriteToggle = async (place_id: string, isFavorite: boolean) => {
    console.log('🎯 handleFavoriteToggle called with:', { place_id, isFavorite });
    
    if (!user) {
      console.error("No user logged in");
      return;
    }

    try {
      console.log('🔄 Toggling favorite:', { place_id, isFavorite });
      
      if (isFavorite) {
        // Get the restaurant data from the current card
        const currentCard = place_id === leftCard.place_id ? leftCard : rightCard;
        console.log('📍 Current card:', currentCard);
        
        if (currentCard.restaurant) {
          console.log('➕ Adding favorite:', currentCard.restaurant.name);
          const result = await user.addFavorite(currentCard.restaurant);
          console.log('✅ Add favorite API response:', result);
          
          // Refresh the favorites list
          const updatedFavorites = await user.getFavorites();
          console.log('✅ Favorites updated after adding:', updatedFavorites);
          
          // Update the local state
          setFavoriteRestaurants(prev => {
            const newSet = new Set(prev);
            newSet.add(place_id);
            return newSet;
          });
        }
      } else {
        console.log('➖ Removing favorite:', place_id);
        const result = await user.removeFavorite(place_id);
        console.log('✅ Remove favorite API response:', result);
        
        // Refresh the favorites list
        const updatedFavorites = await user.getFavorites();
        console.log('✅ Favorites updated after removing:', updatedFavorites);
        
        // Update the local state
        setFavoriteRestaurants(prev => {
          const newSet = new Set(prev);
          newSet.delete(place_id);
          return newSet;
        });
      }
    } catch (error) {
      console.error("❌ Error toggling favorite:", error);
    }
  };

  const getNext = async (side: "left" | "right") => {
    try {
      if (currentIndex < restaurants.length) {
        const nextRestaurant = restaurants[currentIndex];
        const isFavorite = favoriteRestaurants.has(nextRestaurant.id);
        console.log(`Creating next card for ${nextRestaurant.name}, isFavorite: ${isFavorite}`);
        
        const nextCard: CardProps = {
          name: nextRestaurant.name,
          image: getRestaurantPhotoUrl(nextRestaurant),
          place_id: nextRestaurant.id,
          vicinity: nextRestaurant.vicinity,
          rating: nextRestaurant.rating,
          price_level: nextRestaurant.priceLevel,
          isOpenNow: nextRestaurant.isOpenNow,
          isFavorite: isFavorite,
          onFavoriteToggle: handleFavoriteToggle,
          restaurant: nextRestaurant
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
        const isFavorite = favoriteRestaurants.has(nextRestaurantObject.id);
        console.log(`Creating next card for ${nextRestaurantObject.name}, isFavorite: ${isFavorite}`);
        
        const nextCard: CardProps = {
          name: nextRestaurantObject.name,
          image: getRestaurantPhotoUrl(nextRestaurantObject),
          place_id: nextRestaurantObject.id,
          vicinity: nextRestaurantObject.vicinity,
          rating: nextRestaurantObject.rating,
          price_level: nextRestaurantObject.priceLevel,
          isOpenNow: nextRestaurantObject.isOpenNow,
          isFavorite: isFavorite,
          onFavoriteToggle: handleFavoriteToggle,
          restaurant: nextRestaurantObject
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
        
        const firstIsFavorite = favoriteRestaurants.has(firstRestaurant.id);
        const secondIsFavorite = favoriteRestaurants.has(secondRestaurant.id);
        
        console.log(`Setting initial cards: ${firstRestaurant.name} (isFavorite: ${firstIsFavorite}), ${secondRestaurant.name} (isFavorite: ${secondIsFavorite})`);

        setLeftCard({
          name: firstRestaurant.name,
          image: getRestaurantPhotoUrl(firstRestaurant),
          place_id: firstRestaurant.id,
          vicinity: firstRestaurant.vicinity,
          rating: firstRestaurant.rating,
          price_level: firstRestaurant.priceLevel,
          isOpenNow: firstRestaurant.isOpenNow,
          isFavorite: firstIsFavorite,
          onFavoriteToggle: handleFavoriteToggle,
          restaurant: firstRestaurant
        });

        setRightCard({
          name: secondRestaurant.name,
          image: getRestaurantPhotoUrl(secondRestaurant),
          place_id: secondRestaurant.id,
          vicinity: secondRestaurant.vicinity,
          rating: secondRestaurant.rating,
          price_level: secondRestaurant.priceLevel,
          isOpenNow: secondRestaurant.isOpenNow,
          isFavorite: secondIsFavorite,
          onFavoriteToggle: handleFavoriteToggle,
          restaurant: secondRestaurant
        });

        setCurrentIndex(2); // Start at index 2 since we've used the first two
      } catch (error) {
        console.error("Error fetching restaurants:", error);
        setError(error instanceof Error ? error.message : "Failed to load restaurants");
      }
    };

    fetchRestaurants();
  }, [user, favoriteRestaurants]);

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
              key={`left-${leftCard.place_id}-${leftCard.isFavorite}`}
              name={leftCard.name} 
              image={leftCard.image} 
              place_id={leftCard.place_id}
              vicinity={leftCard.vicinity}
              rating={leftCard.rating}
              price_level={leftCard.price_level}
              isOpenNow={leftCard.isOpenNow}
              isFavorite={leftCard.isFavorite}
              onFavoriteToggle={handleFavoriteToggle}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleCardClick("right")}
            style={styles.cardContainer}
            activeOpacity={0.7}
          >
            <Card 
              key={`right-${rightCard.place_id}-${rightCard.isFavorite}`}
              name={rightCard.name} 
              image={rightCard.image} 
              place_id={rightCard.place_id}
              vicinity={rightCard.vicinity}
              rating={rightCard.rating}
              price_level={rightCard.price_level}
              isOpenNow={rightCard.isOpenNow}
              isFavorite={rightCard.isFavorite}
              onFavoriteToggle={handleFavoriteToggle}
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
