import React, {useState} from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Linking } from 'react-native';
// import './Card.css';
//Card components:
    //Name
    //Source Image

export type CardProps = {
    name: string;
    image: string | null;
    place_id: string;
}

export function Card({ name, image, place_id }: CardProps) {
    const handleTitlePress = () => {
        const url = `https://www.google.com/maps/place/?q=place_id:${place_id}`;
        Linking.openURL(url).catch((err) => console.error('Error opening Maps:', err));
    };

    const [likeButton, clickLike] = useState(require('@/assets/images/like_unselected.png'));
    const [saveButton, clickSave] = useState(require('@/assets/images/save_unselected.png'));

    const changeLike = () => {
        clickLike(likeButton === require('@/assets/images/like_unselected.png') ? require('@/assets/images/like_selected.png') : require('@/assets/images/like_unselected.png'));
    };

    const changeSave = () => {
        clickSave(saveButton === require('@/assets/images/save_unselected.png') ? require('@/assets/images/save_selected.png') : require('@/assets/images/save_unselected.png'));
    };

    return (
        <View style={styles.card}>
            <TouchableOpacity onPress={handleTitlePress} style={styles.titleContainer}>
                <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.5}>{name}</Text>
            </TouchableOpacity>
            <View style={[styles.imageContainer]}>
                <Image 
                    source={image ? { uri: image } : require('@/assets/images/food-fight-logo.png')}
                    style={styles.image}
                    resizeMode="cover"
                />
                <View style={styles.iconContainer}>
                    <TouchableOpacity onPress={changeLike}>
                        <Image
                            source={likeButton}
                            style={styles.icon}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={changeSave}>
                        <Image
                            source={saveButton}
                            style={styles.icon}
                        />
                    </TouchableOpacity>
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
        height: 100,
        justifyContent: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    title: {
        color: '#FFFFFF',
        fontFamily: 'SmileySans',
        textAlign: 'center',
        fontSize: 36,
        lineHeight: 40,
    },
    imageContainer: {
        borderWidth: 5,
        borderColor: 'white',
        width: 300,
        height: 250,
        marginLeft: 25,
        borderRadius: 25,
        
        marginTop: 20,
    },
    image: {
        borderColor: '#D2AEED',
        borderWidth: 2,
        width: '100%',
        height: '100%',
        borderRadius: 20,
    },
    iconContainer: {
        width: '100%',
        height: 100,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderColor: 'red',
        //backgroundColor: 'blue',
    },
    icon: {
        width: 50,
        height: 50,

    }
});