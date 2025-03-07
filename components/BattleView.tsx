import { View } from "react-native";
import { Card } from "@/components/Card"; // Make sure this import matches how Card is exported
import { getNearbyRestaurants, getPhotoUrl } from "@/api/api";
import { v4 as uuidv4 } from "uuid";
import { useState, useEffect } from "react";
import Restaurant from "@/models/Restaurant"; // Update this path to match your file structure

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
        const newSession = uuidv4(); // sessionId
        console.log("Fetching restaurants...");
        const result = await getNearbyRestaurants(
          newSession,
          40.736352105736536,
          -73.99093648525601,
        );

        console.log("API response received");

        if (result && result.restaurants && result.restaurants.length >= 2) {
          // Convert raw data to Restaurant instances
          const restaurantObjects = result.restaurants.map(
            (restaurantData) => new Restaurant(restaurantData),
          );

          setRestaurants(restaurantObjects);

          // Update the cards with the first two restaurants
          if (restaurantObjects.length >= 2) {
            setLeftCard({
              name: restaurantObjects[0].name,
              image: getPhotoUrl(result.restaurants[0].photo_reference),
            });

            setRightCard({
              name: restaurantObjects[1].name,
              image: getPhotoUrl(result.restaurants[1].photo_reference),
            });

            setCurrentIndex(2); // Start with the next restaurant being at index 2
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
  }, []); // Empty dependency array means this runs once on mount

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
