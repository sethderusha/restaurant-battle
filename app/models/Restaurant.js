class Restaurant {
  constructor(data) {
    // Basic identification
    this.id = data.place_id || "";
    this.place_id = data.place_id || ""; // Add place_id for favorites
    this.name = data.name || "";
    
    // Location
    this.location = {
      latitude: data.location?.lat || 0,
      longitude: data.location?.lng || 0,
    };

    // Basic info
    this.vicinity = data.vicinity || "";
    this.address = data.address || data.vicinity || ""; // Add address for favorites
    this.rating = data.rating || 0;
    this.userRatingCount = data.user_ratings_total || 0;
    this.priceLevel = data.price_level || 0;
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

