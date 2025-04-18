import React, { useState, useEffect } from "react";
import { View, StyleSheet, Text, TouchableOpacity, Dimensions, useWindowDimensions } from "react-native";
import { Card, CardProps } from "@/components/Card";
import { getNearbyRestaurants, getNextRestaurant, getPhotoUrl } from "@/api/api";
import { v4 as uuidv4 } from "uuid";
import Restaurant from "@/models/Restaurant";
import User from "@/models/User";
import { useAuth } from "@/context/AuthContext";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { ManualLocationInput } from "@/components/ManualLocationInput";

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
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [showManualLocation, setShowManualLocation] = useState(false);

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
          const favorites = await user.getFavorites();
          const favoriteIds = new Set<string>(favorites.map((fav: Restaurant) => fav.id));
          setFavoriteRestaurants(favoriteIds);
          
          // Update the favorite state of current cards if they exist
          if (leftCard.place_id && favoriteIds.has(leftCard.place_id)) {
            setLeftCard(prev => ({...prev, isFavorite: true}));
          }
          
          if (rightCard.place_id && favoriteIds.has(rightCard.place_id)) {
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
    
    // Update left card favorite state
    if (leftCard.place_id) {
      const isFavorite = favoriteRestaurants.has(leftCard.place_id);
      if (leftCard.isFavorite !== isFavorite) {
        setLeftCard(prev => ({...prev, isFavorite}));
      }
    }
    
    // Update right card favorite state
    if (rightCard.place_id) {
      const isFavorite = favoriteRestaurants.has(rightCard.place_id);
      if (rightCard.isFavorite !== isFavorite) {
        setRightCard(prev => ({...prev, isFavorite}));
      }
    }
  }, [favoriteRestaurants]);

  // Handle toggling favorites
  const handleFavoriteToggle = async (place_id: string, isFavorite: boolean) => {
    
    if (!user) {
      console.error("No user logged in");
      return;
    }

    try {
      
      // Update the local state immediately for a responsive UI
      setFavoriteRestaurants(prev => {
        const newSet = new Set(prev);
        if (isFavorite) {
          newSet.add(place_id);
        } else {
          newSet.delete(place_id);
        }
        return newSet;
      });
      
      // Update the card state directly
      if (place_id === leftCard.place_id) {
        setLeftCard(prev => ({...prev, isFavorite}));
      } else if (place_id === rightCard.place_id) {
        setRightCard(prev => ({...prev, isFavorite}));
      }
      
      if (isFavorite) {
        // Get the restaurant data from the current card
        const currentCard = place_id === leftCard.place_id ? leftCard : rightCard;
        
        if (currentCard.restaurant) {
          await user.addFavorite(currentCard.restaurant);
        }
      } else {
        await user.removeFavorite(place_id);
      }
    } catch (error) {
      console.error("❌ Error toggling favorite:", error);
      
      // Revert the local state if the API call fails
      setFavoriteRestaurants(prev => {
        const newSet = new Set(prev);
        if (isFavorite) {
          newSet.delete(place_id);
        } else {
          newSet.add(place_id);
        }
        return newSet;
      });
      
      // Revert the card state
      if (place_id === leftCard.place_id) {
        setLeftCard(prev => ({...prev, isFavorite: !isFavorite}));
      } else if (place_id === rightCard.place_id) {
        setRightCard(prev => ({...prev, isFavorite: !isFavorite}));
      }
    }
  };

  const getNext = async (side: "left" | "right") => {
    try {
      
      // Store the current index in a local variable to avoid race conditions
      const currentIndexValue = currentIndex;
      
      if (currentIndexValue < restaurants.length) {
        const nextRestaurant = restaurants[currentIndexValue];
        const isFavorite = favoriteRestaurants.has(nextRestaurant.id);
        
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

        // When clicking left card, update right card and vice versa
        if (side === 'left') {
          setRightCard(nextCard);
        } else {
          setLeftCard(nextCard);
        }
        
        // Increment the index after updating the card
        setCurrentIndex(currentIndexValue + 1);
      } else {
        try {
          const nextRestaurant = await getNextRestaurant(sessionId);
          
          if (!nextRestaurant || !nextRestaurant.restaurant) {
            console.error("Invalid API response:", nextRestaurant);
            throw new Error("Invalid API response");
          }
          
          // Check if the restaurant is already in our cache
          const restaurantId = nextRestaurant.restaurant.place_id;
          const isAlreadyInCache = restaurants.some(r => r.id === restaurantId);
          
          if (isAlreadyInCache) {
            // Try again with the next restaurant
            return getNext(side);
          }
          
          const nextRestaurantObject = new Restaurant(nextRestaurant.restaurant);
          const isFavorite = favoriteRestaurants.has(nextRestaurantObject.id);
          
          // Add the new restaurant to our cache
          setRestaurants(prevRestaurants => [...prevRestaurants, nextRestaurantObject]);
          
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

          // When clicking left card, update right card and vice versa
          if (side === 'left') {
            setRightCard(nextCard);
          } else {
            setLeftCard(nextCard);
          }
          
          // Update the current index to point to the next restaurant
          setCurrentIndex(restaurants.length + 1);
        } catch (apiError) {
          console.error("Error fetching from API:", apiError);
          throw apiError;
        }
      }
    } catch (error) {
      console.error("Error getting next restaurant", error);
      setError("Failed to get next restaurant");
    }
  }

  const handleCardClick = (side: "left" | "right") => {
    try {
      getNext(side);
    } catch (error) {
      console.error(`Error in handleCardClick for ${side} card:`, error);
      setError("Failed to handle card click");
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

  const fetchRestaurants = async () => {
    try {
      let location;
      
      // If there's a logged in user, try to get their location
      if (user) {
        if (!user.hasInitializedLocation) {
          try {
            const locationResult = await user.updateLocation();
            if (locationResult) {
              location = locationResult;
            } else {
              // Location fetch failed, show manual input
              setShowManualLocation(true);
              setLoading(false);
              return;
            }
          } catch (error) {
            console.error("Failed to get user location:", error);
            setShowManualLocation(true);
            setLoading(false);
            return;
          }
        } else {
          if (!user.location) {
            setShowManualLocation(true);
            setLoading(false);
            return;
          }
          location = user.location;
        }
      } else {
        // No user, show error
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

  useEffect(() => {
    fetchRestaurants();
  }, [user, favoriteRestaurants]);

  const handleManualLocationSubmit = async (latitude: number, longitude: number) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user) {
        setError("You must be logged in to use this app");
        setLoading(false);
        return;
      }
      
      // Set the manual location
      user.setManualLocation(latitude, longitude);
      
      // Close the modal
      setShowManualLocation(false);
      
      // Fetch restaurants with the new location
      await fetchWithLocation(user.location);
    } catch (error) {
      console.error("Error setting manual location:", error);
      setError(error instanceof Error ? error.message : "Failed to set location");
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingOverlay message="Loading nearby restaurants..." />;
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            setLoading(true);
            fetchRestaurants();
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <View style={[styles.cardsContainer, isMobile? styles.mobileCardsContainer : styles.desktopCardsContainer]}>
          <TouchableOpacity
            onPress={() => handleCardClick("left")}
            style={[styles.cardsContainer, isMobile? styles.mobileCardsContainer : styles.desktopCardsContainer]}
            activeOpacity={0.7}
          >
            <Card 
              key={`left-${leftCard.place_id}`}
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
            style={[styles.cardsContainer, isMobile? styles.mobileCardsContainer : styles.desktopCardsContainer]}
            activeOpacity={0.7}
          >
            <Card 
              key={`right-${rightCard.place_id}`}
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
      </View>
      
      <ManualLocationInput
        visible={showManualLocation}
        onClose={() => setShowManualLocation(false)}
        onSubmit={handleManualLocationSubmit}
        error={error}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { //background
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: "5%",
    marginBottom: 60,
    backgroundColor: '#d2aeed',
    paddingHorizontal: 20,
  },
  cardsContainer: { //holds 2 cards
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopCardsContainer: {
    flexDirection: "row",
    gap: 60,
  },
  mobileCardsContainer: {
    width: "100%",
    flexDirection: 'column',
    gap:20,
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  retryButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
