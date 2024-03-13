var Logger = require('dw/system/Logger');
var OrderMgr = require("dw/order/OrderMgr");
var Resource = require("dw/web/Resource");
var Transaction = require("dw/system/Transaction");

var GocuotasUtils = require('*/cartridge/scripts/utils/gocuotasUtils');

function getWebhookData() {
    var strData = request.httpParameterMap.requestBodyAsString;
    var data = JSON.parse(strData);
    Logger.info(Resource.msgf("webhook.request", "gocuotas", null, strData));
    return data;
}

function validateWebhookData(data) {
    if (!data) {
        return false
    }
    if ((!data.order_reference_id) || (typeof data.order_reference_id !== "string")) {
        return false;
    }
    if ((!data.status) || (typeof data.status !== "string")) {
        return false;
    }
    if ((!data.order_id) || (typeof data.order_id !== "string" && typeof data.order_id !== "number")) {
        return false;
    }
    if ((!data.number_of_installments) || (typeof data.number_of_installments !== "number")) {
        return false;
    }
    if ((!data.amount_in_cents) || (typeof data.amount_in_cents !== "number")) {
        return false;
    }
    return true;
}

function getGocuotasOrder(data) {
    var Gocuotas = require('*/cartridge/scripts/helpers/Gocuotas');

    var gocuotasOrderId = data.order_id;

    var gocuotas = new Gocuotas();

    var authenticationResponse = gocuotas.authentication();
    if (!authenticationResponse) {
        Logger.error(Resource.msg("service.error.authentication", "gocuotas", null));
        return null;
    }
    var token = authenticationResponse.token;

    var gocuotasOrder = gocuotas.getOrder(gocuotasOrderId, token);
    if (!gocuotasOrder) {
        Logger.error(Resource.msg("service.error.getorder", "gocuotas", null));
        return null;
    }
    return gocuotasOrder;
}

function handleWebhook(localeID) {
    var data = getWebhookData();
    if (!validateWebhookData(data)) {
        Logger.error(Resource.msg("webhook.error.data", "gocuotas", null));
        return false;
    }
    
    var gocuotasOrder = getGocuotasOrder(data);
    if (!gocuotasOrder) {
        return false;
    }

    var orderId = data.order_reference_id;
    var order = OrderMgr.getOrder(orderId);
    if (!order) {
        webhook.error.order.notfound
        Logger.error(Resource.msgf("webhook.error.order.notfound", "gocuotas", null, orderId));
        return false;
    }

    GocuotasUtils.updateOrder(order, gocuotasOrder, localeID);
    Transaction.wrap(() => {
        order.addNote(Resource.msg("webhook.note.data", "gocuotas", null), JSON.stringify(data));
    });

    return true;
}

function webhook(req, res, next) {
    try {
        var localeID = req.locale.id;
        var success = handleWebhook(localeID);
        if (!success) {
            response.setStatus(400);
        }
        res.json({ success: success });
    } catch (error) {
        Logger.error(Resource.msgf( "webhook.error.message", "gocuotas", null, error.message));
        response.setStatus(500);
        res.json({ success: false });
    }
    return next();
}

module.exports = {
    webhook: webhook
}
