import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

const generateToken = (userId: string) => {
    console.log(JWT_SECRET)
  return jwt.sign(
    { id: userId }, 
    JWT_SECRET, 
    { expiresIn: '1h' }
  );
};

const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET);
};

export default {
  generateToken,
  verifyToken
}
