const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(value) {
  return EMAIL_PATTERN.test(String(value || '').trim());
}

function hasText(value) {
  return String(value || '').trim().length > 0;
}

function isPositiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

function isNonNegativeInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0;
}

function validateAccountFields(values, errors, includeBusiness) {
  if (!hasText(values.name)) {
    errors.name = 'Enter your full name.';
  }
  if (!isEmail(values.email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (String(values.phone || '').replace(/\D/g, '').length < 7) {
    errors.phone = 'Enter a valid phone number.';
  }
  if (includeBusiness && !hasText(values.businessName)) {
    errors.businessName = 'Enter your business name.';
  }
  if (String(values.password || '').length < 8) {
    errors.password = 'Use at least 8 characters.';
  }
  if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }
}

export function validateLogin(values) {
  const errors = {};
  if (!isEmail(values.email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (!hasText(values.password)) {
    errors.password = 'Enter your password.';
  }
  return errors;
}

export function validatePlayerRegistration(values) {
  const errors = {};
  validateAccountFields(values, errors, false);
  if (!Array.isArray(values.preferredSports) || values.preferredSports.length === 0) {
    errors.preferredSports = 'Choose at least one sport.';
  }
  return errors;
}

function validateVendorAccount(values) {
  const errors = {};
  validateAccountFields(values, errors, true);
  return errors;
}

function validateVendorVenue(values) {
  const errors = {};
  if (!hasText(values.venueName)) {
    errors.venueName = 'Enter the venue name.';
  }
  if (!hasText(values.address)) {
    errors.address = 'Enter the full venue address.';
  }
  if (!hasText(values.city)) {
    errors.city = 'Enter the city.';
  }
  const hasLatitude = hasText(values.latitude);
  const hasLongitude = hasText(values.longitude);
  if (hasLatitude !== hasLongitude) {
    errors.latitude = 'Enter both coordinates or leave both blank to use the address fallback.';
    errors.longitude = errors.latitude;
  } else if (hasLatitude && hasLongitude) {
    const latitude = Number(values.latitude);
    const longitude = Number(values.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      errors.latitude = 'Latitude must be between -90 and 90.';
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      errors.longitude = 'Longitude must be between -180 and 180.';
    }
  }
  return errors;
}

function validateVendorGrounds(values) {
  const errors = {};
  if (!Array.isArray(values.sports) || values.sports.length === 0) {
    errors.sports = 'Choose at least one sport for this venue.';
  }
  if (!Array.isArray(values.grounds) || values.grounds.length === 0) {
    errors.grounds = 'Add at least one ground or court.';
    return errors;
  }

  values.grounds.forEach((ground, index) => {
    if (!hasText(ground.name)) {
      errors[`grounds.${index}.name`] = 'Enter a ground or court name.';
    }
    if (!hasText(ground.sport)) {
      errors[`grounds.${index}.sport`] = 'Choose a sport.';
    }
    if (!isPositiveNumber(ground.widthMeters)) {
      errors[`grounds.${index}.widthMeters`] = 'Enter a width greater than 0 metres.';
    }
    if (!isPositiveNumber(ground.lengthMeters)) {
      errors[`grounds.${index}.lengthMeters`] = 'Enter a length greater than 0 metres.';
    }
    if (!hasText(ground.indoorOutdoor)) {
      errors[`grounds.${index}.indoorOutdoor`] = 'Choose indoor or outdoor.';
    }
    if (!hasText(ground.surface)) {
      errors[`grounds.${index}.surface`] = 'Choose a surface.';
    }
    const condition = Number(ground.conditionRating);
    if (!Number.isInteger(condition) || condition < 1 || condition > 5) {
      errors[`grounds.${index}.conditionRating`] = 'Choose a condition from 1 to 5.';
    }
    if (!isPositiveNumber(ground.hourlyPricePKR)) {
      errors[`grounds.${index}.hourlyPricePKR`] = 'Enter an hourly price greater than 0.';
    }
    const duration = Number(ground.slotDurationMinutes);
    if (!Number.isInteger(duration) || duration < 15 || duration > 240) {
      errors[`grounds.${index}.slotDurationMinutes`] = 'Choose a slot duration from 15 to 240 minutes.';
    }
  });

  return errors;
}

function validateVendorFacilities(values) {
  const errors = {};
  if (
    values.parkingAvailable === true &&
    !isNonNegativeInteger(values.parkingSpaces)
  ) {
    errors.parkingSpaces = 'Enter a whole number of parking spaces.';
  }
  return errors;
}

function validateVendorEquipment(values) {
  const errors = {};
  (values.equipment || []).forEach((item, index) => {
    if (!hasText(item.name)) {
      errors[`equipment.${index}.name`] = 'Enter an item name or remove this row.';
    }
    if (!hasText(item.priceMode)) {
      errors[`equipment.${index}.priceMode`] = 'Choose rental or sale.';
    }
    if (!isPositiveNumber(item.unitPricePKR)) {
      errors[`equipment.${index}.unitPricePKR`] = 'Enter a price greater than 0.';
    }
    const quantity = Number(item.quantityAvailable);
    if (!Number.isInteger(quantity) || quantity < 1) {
      errors[`equipment.${index}.quantityAvailable`] = 'Enter a quantity of at least 1.';
    }
  });
  return errors;
}

function validateVendorMedia(values) {
  // Media is an optional enhancement; vendors can finish with VenueArtwork fallback.
  return {};
}

export function validateVendorStep(values, step) {
  if (step === 0) {
    return validateVendorAccount(values);
  }
  if (step === 1) {
    return validateVendorVenue(values);
  }
  if (step === 2) {
    return validateVendorGrounds(values);
  }
  if (step === 3) {
    return validateVendorFacilities(values);
  }
  if (step === 4) {
    return validateVendorEquipment(values);
  }
  if (step === 5) {
    return validateVendorMedia(values);
  }
  if (step === 6) {
    return {
      ...validateVendorAccount(values),
      ...validateVendorVenue(values),
      ...validateVendorGrounds(values),
      ...validateVendorFacilities(values),
      ...validateVendorEquipment(values),
      ...validateVendorMedia(values),
    };
  }
  return {};
}
