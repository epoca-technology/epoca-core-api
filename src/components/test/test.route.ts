import express = require("express");

// Rate Limits
import {highRiskLimit} from '../shared/rate-limit/rate.limit';

// Init Route
const TestRoutes = express.Router();




/**
 * 
 */
TestRoutes.route(`/test`).post(highRiskLimit, async (req, res) => {
    const token: string|undefined = req.get("authorization");
    try {
        res.send({success:true, data: token, error: null});
    } catch(err) {
        res.send(err)
    }
});






// Export Routes
export {TestRoutes}

