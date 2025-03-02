import React from 'react';
// import './Card.css';
//Card components:
    //Name
    //Source Image

export type CardProps  = {
    name: string;
    image: string;

}

export function Card({name, image}:CardProps) {
    
    return (
        <div style={styles.card}> 
            <h1>{name}</h1>
            <img src={image} width="200px"/>
        </div>
    );
}

const styles = {
    card: {
       borderRadius: '20px',
       width: '40%',
       height: 'auto',
       backgroundColor: 'lightBlue',
    }
}