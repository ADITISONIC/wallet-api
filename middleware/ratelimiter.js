import ratelimit from "../config/upstash.js";

const ratelimiter = async (req, res, next) => {
  try {
    const ip = req.ip || "anonymous"; // Use IP or fallback to generic ID
    const { success } = await ratelimit.limit(ip);

    if (!success) {
      return res.status(429).json({
        message: "Too many requests. Try again later.",
      });
    }

    next();
  } catch (error) {
    console.error("Rate limiter error:", error);
    next(error);
  }
};

export default ratelimiter;
