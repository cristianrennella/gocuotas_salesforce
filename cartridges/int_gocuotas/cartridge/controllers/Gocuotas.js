const server = require("server");

const gocuotasFailure = require("*/cartridge/controllers/middlewares/gocuotas/gocuotasFailure");
const gocuotasSuccess = require("*/cartridge/controllers/middlewares/gocuotas/gocuotasSuccess");
const gocuotasWebhook = require("*/cartridge/controllers/middlewares/gocuotas/gocuotasWebhook");

server.get(
    "Success",
    server.middleware.https,
    gocuotasSuccess.success
);

server.get(
    "Failure",
    server.middleware.https,
    gocuotasFailure.failure
);

server.post(
    "Webhook",
    server.middleware.https,
    gocuotasWebhook.webhook
);
  
module.exports = server.exports();
  