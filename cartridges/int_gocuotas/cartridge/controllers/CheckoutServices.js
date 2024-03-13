const server = require("server");

server.extend(module.superModule);

const gocuotasPlaceOrder = require("*/cartridge/controllers/middlewares/checkoutServices/gocuotasPlaceOrder");

server.append(
    "PlaceOrder",
    server.middleware.https,
    gocuotasPlaceOrder.placeOrder
);
  
module.exports = server.exports();
  