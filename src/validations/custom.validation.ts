const password = (value, helpers) => {
  if (value.length < 5) {
    return helpers.message('password must be at least 5 characters');
  }
  return value;
};

export { password };
