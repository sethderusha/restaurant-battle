import React, {useState, useRef, useEffect} from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Linking, Clipboard, Animated } from 'react-native';
// import './Card.css';
//Card components:
    //Name
    //Source Image

export type CardProps = {
    name: string;
    image: string | null;
    place_id: string;
    vicinity?: string;
    rating?: number;
    price_level?: number;
    isOpenNow?: boolean;
    onFavoriteToggle?: (place_id: string, isFavorite: boolean) => void;
    isFavorite?: boolean;
    restaurant?: any; // Add the restaurant property
}

export function Card({ 
    name, 
    image, 
    place_id, 
    vicinity, 
    rating, 
    price_level, 
    isOpenNow,
    onFavoriteToggle,
    isFavorite: initialIsFavorite = false
}: CardProps) {
    const handleTitlePress = () => {
        const url = `https://www.google.com/maps/place/?q=place_id:${place_id}`;
        Linking.openURL(url).catch((err) => console.error('Error opening Maps:', err));
    };

    // Use a ref to track the previous value of initialIsFavorite
    const prevIsFavoriteRef = useRef(initialIsFavorite);
    
    const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
    const [likeButton, clickLike] = useState(
        initialIsFavorite 
            ? require('@/assets/images/like_selected.png') 
            : require('@/assets/images/like_unselected.png')
    );
    const [shareButton, setShareButton] = useState(require('@/assets/images/save_unselected.png'));
    const [showClipboardMessage, setShowClipboardMessage] = useState(false);
    const [showFavoriteMessage, setShowFavoriteMessage] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    // Update internal state when initialIsFavorite prop changes
    useEffect(() => {
        // Only update if the value has actually changed
        if (prevIsFavoriteRef.current !== initialIsFavorite) {
            console.log(`Updating favorite state for ${name}: ${initialIsFavorite}`);
            setIsFavorite(initialIsFavorite);
            clickLike(
                initialIsFavorite 
                    ? require('@/assets/images/like_selected.png') 
                    : require('@/assets/images/like_unselected.png')
            );
            prevIsFavoriteRef.current = initialIsFavorite;
        }
    }, [initialIsFavorite, name]);

    // Force update the favorite state when the component mounts
    useEffect(() => {
        console.log(`Card mounted for ${name}, initialIsFavorite: ${initialIsFavorite}`);
        setIsFavorite(initialIsFavorite);
        clickLike(
            initialIsFavorite 
                ? require('@/assets/images/like_selected.png') 
                : require('@/assets/images/like_unselected.png')
        );
        prevIsFavoriteRef.current = initialIsFavorite;
    }, []);

    const changeLike = () => {
        const newFavoriteState = !isFavorite;
        setIsFavorite(newFavoriteState);
        clickLike(
            newFavoriteState 
                ? require('@/assets/images/like_selected.png') 
                : require('@/assets/images/like_unselected.png')
        );
        
        // Call the onFavoriteToggle callback if provided
        if (onFavoriteToggle) {
            onFavoriteToggle(place_id, newFavoriteState);
        }
        
        // Show favorite message
        setShowFavoriteMessage(true);
        setTimeout(() => setShowFavoriteMessage(false), 2000);
    };

    const handleShare = () => {
        const url = `https://www.google.com/maps/place/?q=place_id:${place_id}`;
        Clipboard.setString(url);
        
        // Change to selected image
        setShareButton(require('@/assets/images/save_selected.png'));
        
        // Animate the button press
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 0.8,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start(() => {
            // Reset to unselected image after animation completes
            setShareButton(require('@/assets/images/save_unselected.png'));
        });

        // Show and hide the clipboard message
        setShowClipboardMessage(true);
        setTimeout(() => setShowClipboardMessage(false), 2000);
    };

    // Helper function to render stars based on rating
    const renderStars = () => {
        if (!rating) return null;
        const stars = [];
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        
        for (let i = 0; i < fullStars; i++) {
            stars.push('★');
        }
        if (hasHalfStar) {
            stars.push('½');
        }
        const emptyStars = 5 - stars.length;
        for (let i = 0; i < emptyStars; i++) {
            stars.push('☆');
        }
        return stars.join(' ');
    };

    // Helper function to render price level
    const renderPriceLevel = () => {
        if (!price_level) return null;
        return '$'.repeat(price_level);
    };

    return (
        <View style={styles.card}>
            <TouchableOpacity onPress={handleTitlePress} style={styles.titleContainer}>
                <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.5}>{name}</Text>
            </TouchableOpacity>
            <View style={styles.contentContainer}>
                <View style={[styles.imageContainer]}>
                    <Image 
                        source={image ? { uri: image } : require('@/assets/images/food-fight-logo.png')}
                        style={styles.image}
                        resizeMode="cover"
                    />
                </View>
                <View style={styles.detailsContainer}>
                    {vicinity && (
                        <Text style={styles.detailText} numberOfLines={1}>
                            📍 {vicinity}
                        </Text>
                    )}
                    {rating && (
                        <Text style={styles.detailText}>
                            ⭐ {renderStars()} ({rating})
                        </Text>
                    )}
                    {price_level && (
                        <Text style={styles.detailText}>
                            💰 {renderPriceLevel()}
                        </Text>
                    )}
                    {isOpenNow !== undefined && (
                        <Text style={[styles.detailText, isOpenNow ? styles.openText : styles.closedText]}>
                            {isOpenNow ? '🟢 Open' : '🔴 Closed'}
                        </Text>
                    )}
                </View>
                <View style={styles.iconContainer}>
                    <View style={styles.favoriteContainer}>
                        <TouchableOpacity onPress={changeLike}>
                            <Image
                                source={isFavorite 
                                    ? require('@/assets/images/like_selected.png') 
                                    : require('@/assets/images/like_unselected.png')}
                                style={styles.icon}
                            />
                        </TouchableOpacity>
                        {showFavoriteMessage && (
                            <Text style={styles.favoriteMessage}>
                                {isFavorite ? 'Added to favorites!' : 'Removed from favorites'}
                            </Text>
                        )}
                    </View>
                    <View style={styles.shareContainer}>
                        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                            <TouchableOpacity onPress={handleShare}>
                                <Image
                                    source={shareButton}
                                    style={styles.icon}
                                />
                            </TouchableOpacity>
                        </Animated.View>
                        {showClipboardMessage && (
                            <Text style={styles.clipboardMessage}>Link copied!</Text>
                        )}
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderWidth: 5,
        borderColor: 'white',
        borderRadius: 20,
        width: 350,
        height: 500,
        backgroundColor: '#3C6E71',
        boxShadow: '10px 10px rgba(0,0,0,0.25)'
    },
    titleContainer: {
        backgroundColor: '#284B63',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: 80,
        justifyContent: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    title: {
        color: '#FFFFFF',
        fontFamily: 'SmileySans',
        textAlign: 'center',
        fontSize: 32,
        lineHeight: 36,
    },
    contentContainer: {
        flex: 1,
        padding: 15,
    },
    imageContainer: {
        width: '100%',
        height: 160,
        borderRadius: 15,
        overflow: 'hidden',
        marginBottom: 10,
    },
    image: {
        width: '100%',
        height: '100%',
        borderRadius: 15,
    },
    detailsContainer: {
        backgroundColor: 'rgba(40, 75, 99, 0.9)',
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
        minHeight: 100,
    },
    detailText: {
        color: '#FFFFFF',
        fontSize: 15,
        marginBottom: 6,
        fontFamily: 'SmileySans',
    },
    openText: {
        color: '#4CAF50',
    },
    closedText: {
        color: '#F44336',
    },
    iconContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        marginTop: 'auto',
        height: 60,
    },
    icon: {
        width: 45,
        height: 45,
    },
    favoriteContainer: {
        position: 'relative',
    },
    favoriteMessage: {
        position: 'absolute',
        top: -30,
        left: 0,
        backgroundColor: '#284B63',
        color: 'white',
        padding: 5,
        borderRadius: 5,
        fontSize: 12,
        fontFamily: 'SmileySans',
    },
    shareContainer: {
        position: 'relative',
    },
    clipboardMessage: {
        position: 'absolute',
        top: -30,
        right: 0,
        backgroundColor: '#284B63',
        color: 'white',
        padding: 5,
        borderRadius: 5,
        fontSize: 12,
        fontFamily: 'SmileySans',
    }
});