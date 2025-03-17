class Restaurant {
  constructor(data) {
    // Basic identification
    this.id = data.place_id || "";
    this.name = data.name || "";
    
    // Location
    this.location = {
      latitude: data.location?.lat || 0,
      longitude: data.location?.lng || 0,
    };

    // Basic info
    this.vicinity = data.vicinity || "";
    this.rating = data.rating || 0;
    this.userRatingCount = data.user_ratings_total || 0;
    this.priceLevel = data.price_level || 0;
    this.isOpenNow = data.open_now || false;

    // Photos - simplified to match API response
    this.photos = data.photo_reference ? [{ photo_reference: data.photo_reference }] : [];
  }

  // Get primary photo URL using the helper function
  getPrimaryPhotoUrl(maxWidth = 400) {
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
      name: this.name,
      location: this.location,
      vicinity: this.vicinity,
      rating: this.rating,
      userRatingCount: this.userRatingCount,
      priceLevel: this.priceLevel,
      priceSymbols: this.getPriceSymbols(),
      isOpenNow: this.isOpenNow,
      photos: this.photos,
    };
  }
}

export default Restaurant;
