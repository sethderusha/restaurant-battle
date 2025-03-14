import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
// import './Card.css';
//Card components:
    //Name
    //Source Image

export type CardProps = {
    name: string;
    image: string | null;
}

export function Card({ name, image }: CardProps) {
    return (
        <View style={styles.card}>
            <View style={styles.titleContainer}>
                <Text style={styles.title}>{name}</Text>
            </View>
            <View style={styles.imageContainer}>
                <Image 
                    source={image ? { uri: image } : require('@/assets/images/react-logo.png')}
                    style={styles.image}
                    resizeMode="cover"
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        width: 350,
        height: 500,
        backgroundColor: '#3C6E71',
    },
    titleContainer: {
        backgroundColor: '#284B63',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 25,
        height: 100,
    },
    title: {
        color: '#FFFFFF',
        fontFamily: 'System',
        textAlign: 'center',
        fontSize: 24,
    },
    imageContainer: {
        width: 300,
        height: 250,
        marginLeft: 25,
        borderRadius: 20,
        overflow: 'hidden',
        marginTop: 20,
    },
    image: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
    }
});