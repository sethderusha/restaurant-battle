import React from 'react';
// import './Card.css';
//Card components:
    //Name
    //Source Image

export type CardProps  = {
    name: string;
    image: string | null;

}

export function Card({name, image}:CardProps) {
    return (
        <div style={styles.card}> 
            <h1 style={styles.title}>{name}</h1>
            <div style={styles.image}><img src={image}/></div>
        </div>
    );
}

const styles = {
    card: {
       borderRadius: '20px',
       width: '350px',
       height: '500px',
       backgroundColor: '#3C6E71',
    },
    image: {
        width: '300px',
        height: '250px',
        overflow: 'hidden',
        bottom: 0,
        marginLeft: '25px',
        borderRadius: '20px'
    },
    title: {
        color: '#FFFFFF',
        fontFamily: 'sans-serif',
        textAlign: 'center',
        backgroundColor: '#284B63',
        borderRadius: '20px 20px 0px 0px',
        marginTop: 0,
        paddingTop: '25px',
        height: '100px'
    }
    
}