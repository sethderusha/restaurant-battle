import { View } from "react-native";
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
  // Start with the provided initial cards
  const [leftCard, setLeftCard] = useState(initialLeft);
  const [rightCard, setRightCard] = useState(initialRight);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const userLocation = await User.getLocation(); // Fetch location from User model

        if (!userLocation) {
          setError("Could not get user location");
          setLoading(false);
          return;
        }

        console.log(
          "User's location:",
          userLocation.latitude,
          userLocation.longitude,
        );

        const newSession = uuidv4();
        const result = await getNearbyRestaurants(
          newSession,
          userLocation.latitude,
          userLocation.longitude,
        );

        console.log("API response received");

        if (result?.restaurants?.length >= 2) {
          const restaurantObjects = result.restaurants.map(
            (restaurantData) => new Restaurant(restaurantData),
          );

          setRestaurants(restaurantObjects);

          if (restaurantObjects.length >= 2) {
            setLeftCard({
              name: restaurantObjects[0].name,
              image: getPhotoUrl(result.restaurants[0].photo_reference),
            });

            setRightCard({
              name: getPhotoUrl(result.restaurants[1].photo_reference),
              image: getPhotoUrl(result.restaurants[1].photo_reference),
            });

            setCurrentIndex(2);
          }

          console.log("Cards updated with restaurant data");
        } else {
          console.error("Invalid data structure:", result);
          setError("Failed to load restaurant data");
        }
      } catch (error) {
        console.error("Error fetching restaurants:", error);
        setError("Error loading restaurants");
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  // Handle card click - keep the selected card and replace the other with a new restaurant
  const handleCardClick = (side: "left" | "right") => {
    if (restaurants.length <= currentIndex) {
      console.log("No more restaurants to show");
      return;
    }

    const nextRestaurant = restaurants[currentIndex];
    const nextCard: CardProps = {
      name: nextRestaurant.name,
      image:
        nextRestaurant.getPrimaryPhotoUrl() ||
        "https://via.placeholder.com/400x300?text=No+Image",
    };

    // Keep the clicked card, replace the other
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

  return (
    <div style={styles.centerDiv}>
      {error ? (
        <p>Error: {error}</p>
      ) : (
        <>
          <div
            onClick={() => handleCardClick("left")}
            style={styles.cardContainer}
          >
            {/* Render Card component properly */}
            <Card name={leftCard.name} image={leftCard.image} />
          </div>
          <div
            onClick={() => handleCardClick("right")}
            style={styles.cardContainer}
          >
            <Card name={rightCard.name} image={rightCard.image} />
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  centerDiv: {
    width: "75%",
    height: "auto",
    alignSelf: "center",
    display: "flex",
    justifyContent: "space-between",
    marginTop: "10%",
  },
  cardContainer: {
    cursor: "pointer",
  },
};
