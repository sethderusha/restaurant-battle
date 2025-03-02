class Restaurant {
  constructor(data) {
    // Basic identification
    this.id = data.id || data.place_id || "";
    this.name = data.name || "";
    this.displayName = data.displayName?.text || data.name || "";

    // Contact and web info
    this.phoneNumber =
      data.nationalPhoneNumber || data.formatted_phone_number || "";
    this.internationalPhoneNumber = data.internationalPhoneNumber || "";
    this.websiteUri = data.websiteUri || data.website || "";
    this.googleMapsUri = data.googleMapsUri || "";

    // Address information
    this.formattedAddress =
      data.formattedAddress || data.formatted_address || data.vicinity || "";
    this.shortFormattedAddress =
      data.shortFormattedAddress || data.vicinity || "";
    this.adrFormatAddress = data.adrFormatAddress || "";
    this.addressComponents = data.addressComponents || [];

    // Geolocation
    this.location = data.location || {
      latitude: data.geometry?.location?.lat || 0,
      longitude: data.geometry?.location?.lng || 0,
    };

    // Categorization
    this.types = data.types || [];
    this.primaryType = data.primaryType || (data.types && data.types[0]) || "";
    this.primaryTypeDisplayName = data.primaryTypeDisplayName?.text || "";

    // Ratings and reviews
    this.rating = data.rating || 0;
    this.userRatingCount = data.userRatingCount || data.user_ratings_total || 0;
    this.reviews = data.reviews || [];

    // Business attributes
    this.priceLevel = data.priceLevel || 0;
    this.businessStatus = data.businessStatus || "";

    // Hours
    this.regularOpeningHours =
      data.regularOpeningHours || data.opening_hours || {};
    this.currentOpeningHours = data.currentOpeningHours || {};
    this.isOpenNow =
      data.currentOpeningHours?.openNow ||
      data.opening_hours?.open_now ||
      false;

    // Media
    this.photos = data.photos || [];
    this.iconMaskBaseUri = data.iconMaskBaseUri || "";
    this.iconBackgroundColor = data.iconBackgroundColor || "";

    // Editorial content
    this.editorialSummary = data.editorialSummary?.text || "";
    this.generativeSummary = data.generativeSummary?.text || "";

    // Amenities and features (boolean values)
    this.takeout = !!data.takeout;
    this.delivery = !!data.delivery;
    this.dineIn = !!data.dineIn;
    this.curbsidePickup = !!data.curbsidePickup;
    this.reservable = !!data.reservable;
    this.outdoorSeating = !!data.outdoorSeating;
    this.servesBreakfast = !!data.servesBreakfast;
    this.servesLunch = !!data.servesLunch;
    this.servesDinner = !!data.servesDinner;
    this.servesBrunch = !!data.servesBrunch;
    this.servesBeer = !!data.servesBeer;
    this.servesWine = !!data.servesWine;
    this.servesCocktails = !!data.servesCocktails;
    this.servesCoffee = !!data.servesCoffee;
    this.servesDessert = !!data.servesDessert;
    this.servesVegetarianFood = !!data.servesVegetarianFood;
    this.goodForChildren = !!data.goodForChildren;
    this.menuForChildren = !!data.menuForChildren;
    this.goodForGroups = !!data.goodForGroups;
    this.goodForWatchingSports = !!data.goodForWatchingSports;
    this.liveMusic = !!data.liveMusic;
    this.allowsDogs = !!data.allowsDogs;
    this.restroom = !!data.restroom;

    // Additional options
    this.paymentOptions = data.paymentOptions || {};
    this.parkingOptions = data.parkingOptions || {};
    this.accessibilityOptions = data.accessibilityOptions || {};

    // Time information
    this.utcOffsetMinutes = data.utcOffsetMinutes || 0;
    this.timeZone = data.timeZone || {};
  }

  // Get primary photo URL using the helper function
  getPrimaryPhotoUrl(maxWidth = 400) {
    if (this.photos && this.photos.length > 0) {
      const photoReference =
        this.photos[0].name || this.photos[0].photo_reference;
      if (photoReference) {
        // Import at the top of your file or pass getPhotoUrl function
        const { getPhotoUrl } = require("../api/api");
        return getPhotoUrl(photoReference, maxWidth);
      }
    }
    return null;
  }

  // Get all photo URLs
  getAllPhotoUrls(maxWidth = 400) {
    if (!this.photos || this.photos.length === 0) return [];

    const { getPhotoUrl } = require("../api/api");
    return this.photos
      .filter((photo) => photo.name || photo.photo_reference)
      .map((photo) =>
        getPhotoUrl(photo.name || photo.photo_reference, maxWidth),
      );
  }

  // Format price level as $ symbols
  getPriceSymbols() {
    return "$".repeat(this.priceLevel || 0);
  }

  // Check if restaurant has a specific type
  hasType(type) {
    return this.types.includes(type);
  }

  // Get formatted hours for display
  getFormattedHours() {
    const hours = this.currentOpeningHours || this.regularOpeningHours;
    if (!hours || !hours.weekdayDescriptions) {
      return null;
    }
    return hours.weekdayDescriptions;
  }

  // Check if restaurant is currently open
  isOpen() {
    return this.isOpenNow;
  }

  // Get distance from coordinates
  getDistanceFrom(userLat, userLng) {
    // Calculate distance using Haversine formula
    const lat1 = userLat;
    const lon1 = userLng;
    const lat2 = this.location.latitude;
    const lon2 = this.location.longitude;

    const R = 6371; // Earth's radius in km
    const dLat = this._deg2rad(lat2 - lat1);
    const dLon = this._deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._deg2rad(lat1)) *
        Math.cos(this._deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km

    if (distance < 1) {
      return `${Math.round(distance * 1000)} m`;
    }
    return `${distance.toFixed(1)} km`;
  }

  // Helper for distance calculation
  _deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  // Get restaurant features as an array of strings
  getFeatures() {
    const features = [];

    if (this.takeout) features.push("Takeout");
    if (this.delivery) features.push("Delivery");
    if (this.dineIn) features.push("Dine-in");
    if (this.outdoorSeating) features.push("Outdoor seating");
    if (this.reservable) features.push("Reservations");
    if (this.servesBreakfast) features.push("Breakfast");
    if (this.servesLunch) features.push("Lunch");
    if (this.servesDinner) features.push("Dinner");
    if (this.servesBrunch) features.push("Brunch");
    if (this.servesBeer) features.push("Beer");
    if (this.servesWine) features.push("Wine");
    if (this.servesCocktails) features.push("Cocktails");
    if (this.servesCoffee) features.push("Coffee");
    if (this.servesDessert) features.push("Dessert");
    if (this.servesVegetarianFood) features.push("Vegetarian options");
    if (this.goodForChildren) features.push("Kid-friendly");
    if (this.goodForGroups) features.push("Good for groups");
    if (this.liveMusic) features.push("Live music");

    return features;
  }

  // Get a summary of the restaurant
  getSummary() {
    return {
      name: this.name,
      rating: this.rating,
      priceLevel: this.getPriceSymbols(),
      primaryType: this.primaryTypeDisplayName || this.primaryType,
      isOpen: this.isOpen() ? "Open" : "Closed",
      features: this.getFeatures().slice(0, 3), // Top 3 features
      address: this.shortFormattedAddress,
    };
  }

  // Get restaurant as a plain object
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      displayName: this.displayName,
      phoneNumber: this.phoneNumber,
      internationalPhoneNumber: this.internationalPhoneNumber,
      websiteUri: this.websiteUri,
      googleMapsUri: this.googleMapsUri,
      formattedAddress: this.formattedAddress,
      shortFormattedAddress: this.shortFormattedAddress,
      location: this.location,
      types: this.types,
      primaryType: this.primaryType,
      primaryTypeDisplayName: this.primaryTypeDisplayName,
      rating: this.rating,
      userRatingCount: this.userRatingCount,
      priceLevel: this.priceLevel,
      priceSymbols: this.getPriceSymbols(),
      businessStatus: this.businessStatus,
      isOpenNow: this.isOpenNow,
      photos: this.photos,
      editorialSummary: this.editorialSummary,
      generativeSummary: this.generativeSummary,
      features: this.getFeatures(),
    };
  }
}

export default Restaurant;
