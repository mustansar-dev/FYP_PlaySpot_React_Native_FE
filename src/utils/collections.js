export function uniqueValues(values = []) {
  const result = [];

  values.forEach(value => {
    if (!result.includes(value)) result.push(value);
  });

  return result;
}

export function createLookup(items = [], getKey, getValue = item => item) {
  const lookup = {};

  items.forEach(item => {
    lookup[getKey(item)] = getValue(item);
  });

  return lookup;
}
