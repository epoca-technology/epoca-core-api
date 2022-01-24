import * as rateLimit from "express-rate-limit";


// Default Options
const options: rateLimit.Options = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: "Too many requests. Please wait for a few minutes before trying again."
}





/**
 * Low risk endpoints.
 * 150 requests every 15 minutes
 */
 export const lowRiskLimit: rateLimit.RateLimit = rateLimit({max: 150, ...options});






/**
 * Medium risk endpoints.
 * 40 requests every 15 minutes
 */
 export const mediumRiskLimit: rateLimit.RateLimit = rateLimit({max: 40, ...options});







/**
 * High risk endpoints. 
 * 15 requests every 15 minutes
 * Used for actions that consume significant amount of resources or for any public interaction.
 */
 export const highRiskLimit: rateLimit.RateLimit = rateLimit({max: 15, ...options});