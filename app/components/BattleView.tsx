import React, { useState, useEffect, useRef } from "react";
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
  const isFirstRun = useRef(true);
  // Track if we've loaded real restaurants
  const hasLoadedRealRestaurants = useRef(false);

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
          const favoriteIds = new Set<string>(favorites.map((fav: Restaurant) => fav.place_id));
          setFavoriteRestaurants(favoriteIds);
          
          // Only update cards if we haven't loaded real restaurants yet
          if (!hasLoadedRealRestaurants.current) {
            // Update the favorite state of current cards if they exist
            if (leftCard.place_id && favoriteIds.has(leftCard.place_id)) {
              setLeftCard(prev => ({...prev, isFavorite: true}));
            }
            
            if (rightCard.place_id && favoriteIds.has(rightCard.place_id)) {
              setRightCard(prev => ({...prev, isFavorite: true}));
            }
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
    console.log(`🔍 useEffect triggered by favoriteRestaurants change`);
    console.log(`🔍 Current favoriteRestaurants: ${Array.from(favoriteRestaurants).join(', ')}`);
    console.log(`🔍 Current leftCard.place_id: ${leftCard.place_id}, isFavorite: ${leftCard.isFavorite}`);
    console.log(`🔍 Current rightCard.place_id: ${rightCard.place_id}, isFavorite: ${rightCard.isFavorite}`);
    
    // Skip updating if we're still using placeholder cards
    if (!hasLoadedRealRestaurants.current) {
      console.log(`🔍 Skipping effect - haven't loaded real restaurants yet`);
      return;
    }
    
    // Reset isFirstRun when favoriteRestaurants is empty and then populated
    // This ensures the effect runs properly when favorites are loaded after initial mount
    if (favoriteRestaurants.size > 0 && isFirstRun.current === false) {
      isFirstRun.current = true;
    }
    
    // This effect should run when favoriteRestaurants changes due to initial load
    // or when a card is replaced, not when a user toggles a favorite
    if (isFirstRun.current) {
      console.log(`🔍 First run of useEffect, updating card states`);
      isFirstRun.current = false;
      
      // Update left card favorite state
      if (leftCard.place_id) {
        const isFavorite = favoriteRestaurants.has(leftCard.place_id);
        console.log(`🔍 Checking if ${leftCard.place_id} is in favorites: ${isFavorite}`);
        if (leftCard.isFavorite !== isFavorite) {
          console.log(`🔍 Updating left card favorite state from ${leftCard.isFavorite} to ${isFavorite}`);
          setLeftCard(prev => ({...prev, isFavorite}));
        }
      }
      
      // Update right card favorite state
      if (rightCard.place_id) {
        const isFavorite = favoriteRestaurants.has(rightCard.place_id);
        console.log(`🔍 Checking if ${rightCard.place_id} is in favorites: ${isFavorite}`);
        if (rightCard.isFavorite !== isFavorite) {
          console.log(`🔍 Updating right card favorite state from ${rightCard.isFavorite} to ${isFavorite}`);
          setRightCard(prev => ({...prev, isFavorite}));
        }
      }
    } else {
      console.log(`🔍 Skipping effect - not first run`);
    }
  }, [favoriteRestaurants, leftCard.place_id, rightCard.place_id]);

  // Handle toggling favorites
  const handleFavoriteToggle = async (place_id: string, isFavorite: boolean) => {
    
    if (!user) {
      console.error("No user logged in");
      return;
    }

    console.log(`🔍 handleFavoriteToggle called for place_id: ${place_id}, isFavorite: ${isFavorite}`);
    console.log(`🔍 Current leftCard.place_id: ${leftCard.place_id}, rightCard.place_id: ${rightCard.place_id}`);

    try {
      // Determine which card is being toggled
      const isLeftCard = place_id === leftCard.place_id;
      const isRightCard = place_id === rightCard.place_id;
      
      if (!isLeftCard && !isRightCard) {
        console.log(`🔍 WARNING: place_id ${place_id} doesn't match either card!`);
        return;
      }
      
      // Get the current card
      const currentCard = isLeftCard ? leftCard : rightCard;
      
      // Update the favoriteRestaurants set
      setFavoriteRestaurants(prev => {
        const newSet = new Set(prev);
        if (isFavorite) {
          newSet.add(place_id);
        } else {
          newSet.delete(place_id);
        }
        console.log(`🔍 Updated favoriteRestaurants: ${Array.from(newSet).join(', ')}`);
        return newSet;
      });
      
      // Update only the specific card that was toggled
      if (isLeftCard) {
        console.log(`🔍 Updating left card favorite state to: ${isFavorite}`);
        setLeftCard(prev => {
          if (prev.place_id !== place_id) {
            console.log(`🔍 WARNING: Left card place_id changed during update! Was ${place_id}, now ${prev.place_id}`);
            return prev;
          }
          return {...prev, isFavorite};
        });
      } else if (isRightCard) {
        console.log(`🔍 Updating right card favorite state to: ${isFavorite}`);
        setRightCard(prev => {
          if (prev.place_id !== place_id) {
            console.log(`🔍 WARNING: Right card place_id changed during update! Was ${place_id}, now ${prev.place_id}`);
            return prev;
          }
          return {...prev, isFavorite};
        });
      }
      
      // Make the API call to update the backend
      if (isFavorite) {
        // Get the restaurant data from the current card
        if (currentCard.restaurant) {
          console.log(`🔍 Adding favorite for restaurant:`, {
            name: currentCard.name,
            place_id: currentCard.place_id,
            location: currentCard.restaurant.location,
          });
          await user.addFavorite(currentCard.restaurant);
        } else {
          console.log(`🔍 WARNING: No restaurant data found for ${currentCard.name} (${place_id})`);
        }
      } else {
        console.log(`🔍 Removing favorite for place_id: ${place_id}`);
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
        setLeftCard(prev => {
          if (prev.place_id !== place_id) {
            return prev;
          }
          return {...prev, isFavorite: !isFavorite};
        });
      } else if (place_id === rightCard.place_id) {
        setRightCard(prev => {
          if (prev.place_id !== place_id) {
            return prev;
          }
          return {...prev, isFavorite: !isFavorite};
        });
      }
    }
  };

  const getNext = async (side: "left" | "right") => {
    try {
      console.log(`🔍 getNext called for side: ${side}`);
      
      // Store the current index in a local variable to avoid race conditions
      const currentIndexValue = currentIndex;
      
      if (currentIndexValue < restaurants.length) {
        const nextRestaurant = restaurants[currentIndexValue];
        
        // Ensure place_id exists and log it for debugging
        console.log(`🔍 Next restaurant place_id: ${nextRestaurant.place_id}`);
        console.log(`🔍 Favorites: ${Array.from(favoriteRestaurants).join(', ')}`);
        
        const isFavorite = favoriteRestaurants.has(nextRestaurant.place_id);
        
        console.log(`🔍 Loading next restaurant from cache: ${nextRestaurant.name}, isFavorite: ${isFavorite}`);
        
        const nextCard: CardProps = {
          name: nextRestaurant.name,
          image: getRestaurantPhotoUrl(nextRestaurant),
          place_id: nextRestaurant.place_id,
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
          console.log(`🔍 Updating right card with next restaurant`);
          setRightCard(nextCard);
        } else {
          console.log(`🔍 Updating left card with next restaurant`);
          setLeftCard(nextCard);
        }
        
        // Increment the index after updating the card
        setCurrentIndex(currentIndexValue + 1);
      } else {
        try {
          console.log(`🔍 Fetching next restaurant from API`);
          const nextRestaurant = await getNextRestaurant(sessionId);
          
          if (!nextRestaurant || !nextRestaurant.restaurant) {
            console.error("Invalid API response:", nextRestaurant);
            throw new Error("Invalid API response");
          }
          
          // Check if the restaurant is already in our cache
          const restaurantId = nextRestaurant.restaurant.place_id;
          const isAlreadyInCache = restaurants.some(r => r.place_id === restaurantId);
          
          if (isAlreadyInCache) {
            console.log(`🔍 Restaurant already in cache, trying again`);
            // Try again with the next restaurant
            return getNext(side);
          }
          
          const nextRestaurantObject = new Restaurant(nextRestaurant.restaurant);
          
          // Ensure place_id exists and log it for debugging
          console.log(`🔍 Next restaurant from API place_id: ${nextRestaurantObject.place_id}`);
          console.log(`🔍 Favorites: ${Array.from(favoriteRestaurants).join(', ')}`);
          
          const isFavorite = favoriteRestaurants.has(nextRestaurantObject.place_id);
          
          console.log(`🔍 Loading next restaurant from API: ${nextRestaurantObject.name}, isFavorite: ${isFavorite}`);
          
          // Add the new restaurant to our cache
          setRestaurants(prevRestaurants => [...prevRestaurants, nextRestaurantObject]);
          
          const nextCard: CardProps = {
            name: nextRestaurantObject.name,
            image: getRestaurantPhotoUrl(nextRestaurantObject),
            place_id: nextRestaurantObject.place_id,
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
            console.log(`🔍 Updating right card with next restaurant from API`);
            setRightCard(nextCard);
          } else {
            console.log(`🔍 Updating left card with next restaurant from API`);
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
      console.log(`🔍 fetchWithLocation called with location: ${location.latitude}, ${location.longitude}`);
      
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
      
      // Log the place_ids for debugging
      console.log(`🔍 First restaurant place_id: ${firstRestaurant.place_id}`);
      console.log(`🔍 Second restaurant place_id: ${secondRestaurant.place_id}`);
      console.log(`🔍 Favorite place_ids: ${Array.from(favoriteRestaurants).join(', ')}`);
      
      const firstIsFavorite = favoriteRestaurants.has(firstRestaurant.place_id);
      const secondIsFavorite = favoriteRestaurants.has(secondRestaurant.place_id);
      
      console.log(`🔍 Setting initial cards: ${firstRestaurant.name} (isFavorite: ${firstIsFavorite}), ${secondRestaurant.name} (isFavorite: ${secondIsFavorite})`);
      
      // Mark that we've loaded real restaurants
      hasLoadedRealRestaurants.current = true;
      
      // Reset isFirstRun to ensure favorites update
      isFirstRun.current = true;
      
      setLeftCard({
        name: firstRestaurant.name,
        image: getRestaurantPhotoUrl(firstRestaurant),
        place_id: firstRestaurant.place_id,
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
        place_id: secondRestaurant.place_id,
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
  }, [user]);

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
            style={[styles.cardContainer, isMobile && styles.mobileCardContainer]}
            activeOpacity={0.7}
          >
            <Card 
              key={`left-card-${leftCard.place_id || "placeholder"}-${leftCard.isFavorite ? "fav" : "notfav"}`}
              name={leftCard.name} 
              image={leftCard.image} 
              place_id={leftCard.place_id}
              vicinity={leftCard.vicinity}
              rating={leftCard.rating}
              price_level={leftCard.price_level}
              isOpenNow={leftCard.isOpenNow}
              isFavorite={leftCard.isFavorite}
              onFavoriteToggle={handleFavoriteToggle}
              restaurant={leftCard.restaurant}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleCardClick("right")}
            style={[styles.cardContainer, isMobile && styles.mobileCardContainer]}
            activeOpacity={0.7}
          >
            <Card 
              key={`right-card-${rightCard.place_id || "placeholder"}-${rightCard.isFavorite ? "fav" : "notfav"}`}
              name={rightCard.name} 
              image={rightCard.image} 
              place_id={rightCard.place_id}
              vicinity={rightCard.vicinity}
              rating={rightCard.rating}
              price_level={rightCard.price_level}
              isOpenNow={rightCard.isOpenNow}
              isFavorite={rightCard.isFavorite}
              onFavoriteToggle={handleFavoriteToggle}
              restaurant={rightCard.restaurant}
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
    width: '100%',
  },
  desktopCardsContainer: {
    flexDirection: "row",
    gap: 60,
  },
  mobileCardsContainer: {
    width: "100%",
    flexDirection: 'column',
    gap: 20,
  },
  cardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Add specific styles for mobile card container
  mobileCardContainer: {
    width: '100%',
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
