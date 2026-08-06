import jwt from "jsonwebtoken";

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Token tidak ada",
    });
  }

  try {
    const decode = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decode;

    next();
  } catch {
    res.status(401).json({
      message: "Token tidak valid",
    });
  }
};

export default auth;