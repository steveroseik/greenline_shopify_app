export const validateEmail = (email?: string): boolean => {
  // Regular expression pattern for email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  // Test the email against the regex pattern
  return emailRegex.test(email?? '');
};