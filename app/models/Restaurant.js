class Restaurant {
  constructor(data) {
    console.log('🏪 Creating Restaurant instance with data:', data);

    // Basic identification
    this.id = data.place_id || "";
    this.place_id = data.place_id || ""; // Add place_id for favorites
    this.name = data.name || "";
    
    // Location - handle all possible location data formats
    this.location = {
      latitude: data.latitude || data.lat || data.location?.latitude || 0,
      longitude: data.longitude || data.lng || data.location?.longitude || 0,
    };

    console.log('🏪 Processed location data:', {
      input: {
        lat: data.lat,
        lng: data.lng,
        latitude: data.latitude,
        longitude: data.longitude,
        location: data.location
      },
      output: this.location
    });

    // Basic info
    this.vicinity = data.vicinity || "";
    this.address = data.address || data.vicinity || ""; // Add address for favorites
    this.rating = data.rating || 0;
    this.userRatingCount = data.user_ratings_total || 0;
    this.priceLevel = data.price_level || data.price || 0; // Handle both price_level and price
    this.isOpenNow = data.open_now || false;

    // Photos - handle both Google Places and favorites format
    this.photos = data.photo_reference ? [{ photo_reference: data.photo_reference }] : [];
    this.picture = data.picture || (this.photos[0]?.photo_reference || null); // Add picture for favorites
  }

  // Get primary photo URL using the helper function
  getPrimaryPhotoUrl(maxWidth = 400) {
    // If picture is a full URL, return it directly
    if (this.picture && this.picture.startsWith('http')) {
      return this.picture;
    }
    
    // If picture is a photo reference, use getPhotoUrl
    if (this.picture) {
      const { getPhotoUrl } = require("../api/api");
      return getPhotoUrl(this.picture, maxWidth);
    }
    
    // If we have photos array with photo_reference, use that
    if (this.photos && this.photos.length > 0) {
      const photoReference = this.photos[0].photo_reference;
      if (photoReference) {
        const { getPhotoUrl } = require("../api/api");
        return getPhotoUrl(photoReference, maxWidth);
      }
    }
    
    return null;
  }

  // Format price level as $ symbols
  getPriceSymbols() {
    return "$".repeat(this.priceLevel || 0);
  }

  // Get restaurant as a plain object
  toJSON() {
    return {
      id: this.id,
      place_id: this.place_id,
      name: this.name,
      location: this.location,
      vicinity: this.vicinity,
      address: this.address,
      rating: this.rating,
      userRatingCount: this.userRatingCount,
      priceLevel: this.priceLevel,
      picture: this.picture,
      photos: this.photos
    };
  }
}

export default Restaurant;

